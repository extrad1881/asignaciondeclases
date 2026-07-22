begin;

-- Los usuarios nuevos nunca deben elegir su rol mediante user_metadata.
-- El aprovisionamiento administrativo activa y asigna el rol en un paso posterior.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profile (
    id,
    email,
    display_name,
    role_code,
    active
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    'coordinator',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Un coordinador solo conserva alcance mientras tanto su perfil como su registro
-- de coordinador permanezcan activos.
create or replace function public.current_coordinator_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.coordinators c
  join public.users_profile up on up.id = c.profile_id
  where c.profile_id = auth.uid()
    and c.active = true
    and up.active = true
    and up.role_code = 'coordinator'
  limit 1;
$$;

-- Restringe los catálogos que antes estaban disponibles para cualquier JWT
-- authenticated, incluso si el perfil había sido desactivado.
drop policy if exists "roles_select" on public.roles;
create policy "roles_select" on public.roles for select to authenticated
using (public.current_role_code() is not null);

drop policy if exists "profiles_select" on public.users_profile;
create policy "profiles_select" on public.users_profile for select to authenticated
using (public.current_role_code() is not null and (id = auth.uid() or public.is_admin()));

drop policy if exists "coordinators_select" on public.coordinators;
create policy "coordinators_select" on public.coordinators for select to authenticated
using (public.current_role_code() is not null and (public.is_admin() or profile_id = auth.uid()));

drop policy if exists "teacher_profiles_select" on public.teacher_profiles;
create policy "teacher_profiles_select" on public.teacher_profiles for select to authenticated
using (public.current_role_code() is not null);

drop policy if exists "academic_cycles_select" on public.academic_cycles;
create policy "academic_cycles_select" on public.academic_cycles for select to authenticated
using (public.current_role_code() is not null);

drop policy if exists "classrooms_select" on public.classrooms;
create policy "classrooms_select" on public.classrooms for select to authenticated
using (public.current_role_code() is not null);

drop policy if exists "schedule_templates_select" on public.schedule_templates;
create policy "schedule_templates_select" on public.schedule_templates for select to authenticated
using (public.current_role_code() is not null);

drop policy if exists "schedule_blocks_select" on public.schedule_blocks;
create policy "schedule_blocks_select" on public.schedule_blocks for select to authenticated
using (
  public.current_role_code() is not null
  and (
    coalesce(is_custom, false) = false
    or public.is_admin()
    or created_by = auth.uid()
  )
);

-- La UI permite a coordinadores crear cohortes dentro de sus carreras. RLS debe
-- reflejar ese alcance, mientras completar y archivar continúan siendo admin-only.
drop policy if exists cohort_groups_select on public.cohort_groups;
create policy cohort_groups_select on public.cohort_groups for select to authenticated
using (public.can_access_career(career_id));

drop policy if exists cohort_groups_admin_all on public.cohort_groups;
create policy cohort_groups_admin_all on public.cohort_groups for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists cohort_groups_coordinator_insert on public.cohort_groups;
create policy cohort_groups_coordinator_insert on public.cohort_groups for insert to authenticated
with check (
  public.current_role_code() = 'coordinator'
  and public.can_access_career(career_id)
);

drop policy if exists cohort_subject_history_select on public.cohort_subject_history;
create policy cohort_subject_history_select on public.cohort_subject_history for select to authenticated
using (
  exists (
    select 1
    from public.cohort_groups cg
    where cg.id = cohort_subject_history.cohort_group_id
      and public.can_access_career(cg.career_id)
  )
);

-- Las escrituras de historial pasan por las RPC transaccionales.
drop policy if exists cohort_subject_history_coordinator_insert on public.cohort_subject_history;

-- Esta RPC era SECURITY DEFINER y devolvía datos de cualquier grupo conocido.
create or replace function public.check_group_subject_hours(target_group_id uuid)
returns table(
  group_subject_id uuid,
  subject_name text,
  hours_per_week numeric,
  assigned_hours numeric,
  status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and public.can_access_career(g.career_id)
  ) then
    raise exception using
      errcode = '42501',
      message = 'No tienes permiso para consultar las horas de este grupo.';
  end if;

  return query
  select
    gs.id,
    coalesce(s.name, 'Materia externa'),
    gs.hours_per_week,
    coalesce(sum(a.duration_hours), 0),
    case
      when coalesce(sum(a.duration_hours), 0) = 0 then 'sin_asignar'
      when coalesce(sum(a.duration_hours), 0) < gs.hours_per_week then 'incompleta'
      when coalesce(sum(a.duration_hours), 0) > gs.hours_per_week then 'excedida'
      else 'completa'
    end
  from public.group_subjects gs
  left join public.subjects s on s.id = gs.subject_id
  left join public.assignments a on a.group_subject_id = gs.id and a.status = 'active'
  where gs.group_id = target_group_id
    and gs.status = 'active'
  group by gs.id, s.name, gs.hours_per_week
  order by s.name;
end;
$$;

revoke all on function public.check_group_subject_hours(uuid) from public;
grant execute on function public.check_group_subject_hours(uuid) to authenticated, service_role;

-- Reemplaza la última versión de la RPC y elimina la referencia ambigua a
-- subject_id detectada por plpgsql_check.
create or replace function public.create_group_with_subjects(
  p_academic_cycle_id uuid,
  p_career_id uuid,
  p_quarter integer,
  p_modality text,
  p_shift text,
  p_name text,
  p_classroom_id uuid,
  p_subjects jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  subject_item jsonb;
  new_group_id uuid;
  resolved_subject_id uuid;
  subject_id_text text;
  subject_name text;
  subject_quarter integer;
  subject_hours numeric(5,2);
  required_profile text;
  normalized_subject_name text;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión activa.';
  end if;

  if not public.can_access_career(p_career_id) then
    raise exception 'No tienes permiso para crear grupos en esta carrera.';
  end if;

  if p_subjects is null or jsonb_typeof(p_subjects) <> 'array' or jsonb_array_length(p_subjects) = 0 then
    raise exception 'Selecciona al menos una materia para el grupo.';
  end if;

  insert into public.groups (
    academic_cycle_id,
    career_id,
    quarter,
    modality,
    shift,
    name,
    classroom_id,
    status
  )
  values (
    p_academic_cycle_id,
    p_career_id,
    p_quarter,
    p_modality,
    p_shift,
    p_name,
    p_classroom_id,
    'draft'
  )
  returning id into new_group_id;

  for subject_item in select value from jsonb_array_elements(p_subjects)
  loop
    resolved_subject_id := null;
    subject_id_text := nullif(subject_item->>'subject_id', '');
    subject_hours := coalesce(nullif(subject_item->>'hours_per_week', '')::numeric, 5);
    required_profile := nullif(public.normalize_key(subject_item->>'required_profile_code'), '');

    if subject_hours <= 0 then
      raise exception 'Las horas de la materia deben ser mayores a cero.';
    end if;

    if required_profile is not null
      and not exists (select 1 from public.teacher_profiles tp where tp.code = required_profile) then
      raise exception 'El perfil requerido no existe.';
    end if;

    if subject_id_text is not null then
      resolved_subject_id := subject_id_text::uuid;

      if not exists (
        select 1
        from public.subjects s
        where s.id = resolved_subject_id
          and s.career_id = p_career_id
          and s.active = true
      ) then
        raise exception 'Una materia seleccionada no pertenece a la carrera del grupo.';
      end if;
    else
      subject_name := btrim(coalesce(subject_item->>'name', ''));
      subject_quarter := coalesce(nullif(subject_item->>'quarter', '')::integer, p_quarter);
      normalized_subject_name := public.normalize_key(subject_name);

      if length(subject_name) < 2 then
        raise exception 'Escribe el nombre de la materia externa.';
      end if;

      if subject_quarter < 1 or subject_quarter > 12 then
        raise exception 'El cuatrimestre de la materia externa no es válido.';
      end if;

      insert into public.subjects (
        career_id,
        quarter,
        name,
        normalized_name,
        default_hours,
        active
      )
      values (
        p_career_id,
        subject_quarter,
        subject_name,
        normalized_subject_name,
        subject_hours,
        true
      )
      on conflict (career_id, quarter, normalized_name)
      do update
      set name = excluded.name,
          default_hours = excluded.default_hours,
          active = true
      returning id into resolved_subject_id;

      if required_profile is not null and public.is_admin() then
        insert into public.class_requirements (subject_id, profile_code)
        values (resolved_subject_id, required_profile)
        on conflict on constraint class_requirements_pkey do nothing;
      end if;
    end if;

    insert into public.group_subjects (
      group_id,
      subject_id,
      hours_per_week,
      required_profile_code,
      status
    )
    values (
      new_group_id,
      resolved_subject_id,
      subject_hours,
      required_profile,
      'active'
    );
  end loop;

  return new_group_id;
end;
$$;

revoke all on function public.create_group_with_subjects(uuid, uuid, integer, text, text, text, uuid, jsonb) from public;
grant execute on function public.create_group_with_subjects(uuid, uuid, integer, text, text, text, uuid, jsonb)
  to authenticated, service_role;

-- Reemplazos de relaciones en una sola transacción.
create or replace function public.replace_teacher_profiles(
  p_teacher_id uuid,
  p_profile_codes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not (
    public.is_admin() or public.can_access_teacher(p_teacher_id)
  ) then
    raise exception using errcode = '42501', message = 'No tienes permiso para modificar este docente.';
  end if;

  if not exists (select 1 from public.teachers t where t.id = p_teacher_id) then
    raise exception 'Docente no encontrado.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_profile_codes, array[]::text[])) requested(code)
    left join public.teacher_profiles tp on tp.code = requested.code
    where tp.code is null
  ) then
    raise exception 'Uno o más perfiles seleccionados no existen.';
  end if;

  delete from public.teacher_available_profiles
  where teacher_id = p_teacher_id;

  insert into public.teacher_available_profiles (teacher_id, profile_code)
  select p_teacher_id, requested.code
  from (
    select distinct code
    from unnest(coalesce(p_profile_codes, array[]::text[])) values_list(code)
  ) requested
  where requested.code is not null;
end;
$$;

revoke all on function public.replace_teacher_profiles(uuid, text[]) from public;
grant execute on function public.replace_teacher_profiles(uuid, text[]) to authenticated, service_role;

create or replace function public.replace_subject_requirements(
  p_subject_id uuid,
  p_profile_codes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Solo el administrador puede modificar perfiles requeridos.';
  end if;

  if not exists (select 1 from public.subjects s where s.id = p_subject_id) then
    raise exception 'Materia no encontrada.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_profile_codes, array[]::text[])) requested(code)
    left join public.teacher_profiles tp on tp.code = requested.code
    where tp.code is null
  ) then
    raise exception 'Uno o más perfiles seleccionados no existen.';
  end if;

  delete from public.class_requirements
  where subject_id = p_subject_id;

  insert into public.class_requirements (subject_id, profile_code)
  select p_subject_id, requested.code
  from (
    select distinct code
    from unnest(coalesce(p_profile_codes, array[]::text[])) values_list(code)
  ) requested
  where requested.code is not null;
end;
$$;

revoke all on function public.replace_subject_requirements(uuid, text[]) from public;
grant execute on function public.replace_subject_requirements(uuid, text[]) to authenticated, service_role;

create or replace function public.replace_coordinator_careers(
  p_coordinator_id uuid,
  p_career_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Solo el administrador puede modificar carreras de coordinadores.';
  end if;

  if not exists (select 1 from public.coordinators c where c.id = p_coordinator_id) then
    raise exception 'Coordinador no encontrado.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_career_ids, array[]::uuid[])) requested(id)
    left join public.careers c on c.id = requested.id
    where c.id is null
  ) then
    raise exception 'Una o más carreras seleccionadas no existen.';
  end if;

  delete from public.coordinator_careers
  where coordinator_id = p_coordinator_id;

  insert into public.coordinator_careers (coordinator_id, career_id)
  select p_coordinator_id, requested.id
  from (
    select distinct id
    from unnest(coalesce(p_career_ids, array[]::uuid[])) values_list(id)
  ) requested
  where requested.id is not null;
end;
$$;

revoke all on function public.replace_coordinator_careers(uuid, uuid[]) from public;
grant execute on function public.replace_coordinator_careers(uuid, uuid[]) to authenticated, service_role;

-- Configura perfil y registro de coordinador de forma atómica. La operación de
-- Supabase Auth permanece fuera de Postgres y la aplicación aplica compensación.
create or replace function public.configure_managed_user(
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_role_code text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Esta operación requiere el servicio administrativo.';
  end if;

  if p_role_code not in ('admin', 'coordinator') then
    raise exception 'El rol seleccionado no es válido.';
  end if;

  if not exists (select 1 from auth.users au where au.id = p_user_id) then
    raise exception 'El usuario de autenticación no existe.';
  end if;

  insert into public.users_profile (
    id,
    email,
    display_name,
    role_code,
    active
  )
  values (
    p_user_id,
    p_email,
    p_display_name,
    p_role_code,
    p_active
  )
  on conflict (id)
  do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role_code = excluded.role_code,
    active = excluded.active;

  if p_role_code = 'coordinator' then
    insert into public.coordinators (profile_id, name, active)
    values (p_user_id, public.normalize_key(p_display_name), p_active)
    on conflict (profile_id)
    do update set
      name = excluded.name,
      active = excluded.active;
  else
    update public.coordinators
    set active = false
    where profile_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.configure_managed_user(uuid, text, text, text, boolean) from public, authenticated;
grant execute on function public.configure_managed_user(uuid, text, text, text, boolean) to service_role;

-- Conserva al administrador real en cambios ejecutados mediante service role.
create or replace function public.audit_row_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_doc jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_doc jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  target_id text;
  actor_id uuid := auth.uid();
  requested_actor_id uuid;
  request_headers jsonb;
begin
  if actor_id is null and auth.role() = 'service_role' then
    begin
      request_headers := coalesce(
        nullif(current_setting('request.headers', true), '')::jsonb,
        '{}'::jsonb
      );
      requested_actor_id := nullif(request_headers->>'x-audit-user-id', '')::uuid;
    exception when others then
      requested_actor_id := null;
    end;

    if requested_actor_id is not null and (
      exists (
        select 1
        from public.users_profile up
        where up.id = requested_actor_id
          and up.role_code = 'admin'
          and up.active = true
      )
      or (
        tg_table_name = 'users_profile'
        and requested_actor_id::text = old_doc->>'id'
        and old_doc->>'role_code' = 'admin'
        and coalesce((old_doc->>'active')::boolean, false)
      )
    ) then
      actor_id := requested_actor_id;
    end if;
  end if;

  target_id := coalesce(new_doc->>'id', old_doc->>'id', md5(coalesce(new_doc::text, old_doc::text)));

  insert into public.audit_logs (
    user_id,
    action_type,
    table_name,
    record_id,
    old_value,
    new_value
  )
  values (
    actor_id,
    lower(tg_op),
    tg_table_name,
    target_id,
    old_doc,
    new_doc
  );

  return coalesce(new, old);
end;
$$;

-- Reduce la superficie ejecutable de las funciones SECURITY DEFINER auxiliares.
revoke all on function public.current_role_code() from public;
grant execute on function public.current_role_code() to authenticated, service_role;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;
revoke all on function public.current_coordinator_id() from public;
grant execute on function public.current_coordinator_id() to authenticated, service_role;
revoke all on function public.can_access_career(uuid) from public;
grant execute on function public.can_access_career(uuid) to authenticated, service_role;
revoke all on function public.can_access_teacher(uuid) from public;
grant execute on function public.can_access_teacher(uuid) to authenticated, service_role;
revoke all on function public.can_access_group_subject(uuid) from public;
grant execute on function public.can_access_group_subject(uuid) to authenticated, service_role;
revoke all on function public.can_manage_assignment(uuid, uuid) from public;
grant execute on function public.can_manage_assignment(uuid, uuid) to authenticated, service_role;
revoke all on function public.refresh_teacher_hours(uuid) from public, authenticated;
grant execute on function public.refresh_teacher_hours(uuid) to service_role;
revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.audit_row_changes() from public;
revoke all on function public.refresh_teacher_hours_trigger() from public;

commit;
