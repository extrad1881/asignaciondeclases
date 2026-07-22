begin;

-- Una asignación cancelada conserva su historial, pero deja libre el bloque para
-- que la materia pueda volver a asignarse en el mismo horario.
alter table public.assignments
  drop constraint if exists assignments_group_subject_id_schedule_block_id_key;

create unique index if not exists assignments_active_group_subject_block_unique
  on public.assignments (group_subject_id, schedule_block_id)
  where status = 'active';

-- Evita que dos peticiones concurrentes validen contra el mismo estado anterior.
-- La carga de asignaciones es administrativa y de baja frecuencia, por lo que un
-- candado transaccional único privilegia la consistencia sobre el paralelismo.
create or replace function public.validate_assignment()
returns trigger
language plpgsql
as $$
declare
  group_row record;
  block_row record;
  teacher_row record;
  required_profiles text[];
  current_hours numeric(5,2);
  new_hours numeric(5,2);
  effective_classroom_id uuid;
begin
  perform pg_advisory_xact_lock(771211400);

  select gs.id, gs.group_id, gs.subject_id, gs.required_profile_code, gs.hours_per_week,
         g.modality, g.shift, g.classroom_id
  into group_row
  from public.group_subjects gs
  join public.groups g on g.id = gs.group_id
  where gs.id = new.group_subject_id and gs.status = 'active';

  if group_row.id is null then
    raise exception 'La asignación está incompleta.';
  end if;

  select sb.*, st.modality, st.shift
  into block_row
  from public.schedule_blocks sb
  join public.schedule_templates st on st.id = sb.template_id
  where sb.id = new.schedule_block_id and sb.active = true and st.active = true;

  if block_row.id is null
    or block_row.modality <> group_row.modality
    or block_row.shift <> group_row.shift then
    raise exception 'El horario elegido no existe dentro del cuadro correspondiente.';
  end if;

  if block_row.is_custom = true
    and not (
      current_user in ('postgres', 'supabase_admin', 'service_role')
      or public.is_admin()
      or block_row.created_by = auth.uid()
    ) then
    raise exception 'Solo puedes usar bloques personalizados creados por tu usuario.';
  end if;

  select * into teacher_row
  from public.teachers
  where id = new.teacher_id and active = true;

  if teacher_row.id is null then
    raise exception 'La asignación está incompleta.';
  end if;

  if group_row.required_profile_code is not null then
    required_profiles := array[group_row.required_profile_code];
  else
    select array_agg(profile_code)
    into required_profiles
    from public.class_requirements
    where subject_id = group_row.subject_id;
  end if;

  if coalesce(array_length(required_profiles, 1), 0) > 0
    and not exists (
      select 1
      from public.teacher_available_profiles tap
      where tap.teacher_id = new.teacher_id
        and tap.profile_code = any(required_profiles)
    ) then
    raise exception 'El docente no cumple con el perfil requerido para esta materia.';
  end if;

  new_hours := coalesce(
    nullif(new.duration_hours, 0),
    extract(epoch from (block_row.ends_at - block_row.starts_at)) / 3600.0
  );

  if new_hours is null or new_hours <= 0 then
    raise exception 'Las horas asignadas deben ser mayores a cero.';
  end if;

  new.duration_hours := new_hours;
  effective_classroom_id := coalesce(new.classroom_id, group_row.classroom_id);

  select coalesce(sum(duration_hours), 0)
  into current_hours
  from public.assignments
  where teacher_id = new.teacher_id
    and status = 'active'
    and id is distinct from new.id;

  if current_hours + new_hours > teacher_row.max_hours then
    raise exception 'El docente excede su límite de horas.';
  end if;

  if exists (
    select 1
    from public.assignments a
    join public.schedule_blocks existing_block on existing_block.id = a.schedule_block_id
    where a.teacher_id = new.teacher_id
      and a.status = 'active'
      and a.id is distinct from new.id
      and existing_block.day_of_week = block_row.day_of_week
      and existing_block.starts_at < block_row.ends_at
      and block_row.starts_at < existing_block.ends_at
      and not (block_row.module > 0 and existing_block.module > 0 and block_row.module <> existing_block.module)
  ) then
    raise exception 'El docente ya tiene una clase asignada en este horario.';
  end if;

  if exists (
    select 1
    from public.assignments a
    join public.group_subjects existing_gs on existing_gs.id = a.group_subject_id
    join public.schedule_blocks existing_block on existing_block.id = a.schedule_block_id
    where existing_gs.group_id = group_row.group_id
      and a.status = 'active'
      and a.id is distinct from new.id
      and existing_block.day_of_week = block_row.day_of_week
      and existing_block.starts_at < block_row.ends_at
      and block_row.starts_at < existing_block.ends_at
      and not (block_row.module > 0 and existing_block.module > 0 and block_row.module <> existing_block.module)
  ) then
    raise exception 'El grupo ya tiene una clase asignada en este horario.';
  end if;

  if effective_classroom_id is not null
    and exists (
      select 1
      from public.assignments a
      join public.group_subjects existing_gs on existing_gs.id = a.group_subject_id
      join public.groups existing_group on existing_group.id = existing_gs.group_id
      join public.schedule_blocks existing_block on existing_block.id = a.schedule_block_id
      where coalesce(a.classroom_id, existing_group.classroom_id) = effective_classroom_id
        and a.status = 'active'
        and a.id is distinct from new.id
        and existing_block.day_of_week = block_row.day_of_week
        and existing_block.starts_at < block_row.ends_at
        and block_row.starts_at < existing_block.ends_at
        and not (block_row.module > 0 and existing_block.module > 0 and block_row.module <> existing_block.module)
    ) then
    raise exception 'El aula ya tiene una clase asignada en este horario.';
  end if;

  if exists (
    select 1
    from public.assignments a
    where a.group_subject_id = new.group_subject_id
      and a.schedule_block_id = new.schedule_block_id
      and a.status = 'active'
      and a.id is distinct from new.id
  ) then
    raise exception 'La materia ya tiene otro docente asignado en este bloque.';
  end if;

  if new.classroom_id is null then
    new.classroom_id := effective_classroom_id;
  end if;

  return new;
end;
$$;

-- Las reglas críticas no deben depender de que la actualización pase por una
-- Server Action. Los coordinadores solo pueden mover borrador/revisión y cambiar
-- las horas planeadas de una materia del grupo.
create or replace function public.enforce_group_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
    return new;
  end if;

  if not public.can_access_career(old.career_id) then
    raise exception using errcode = '42501', message = 'No tienes permiso para modificar este grupo.';
  end if;

  if new.academic_cycle_id is distinct from old.academic_cycle_id
    or new.career_id is distinct from old.career_id
    or new.quarter is distinct from old.quarter
    or new.modality is distinct from old.modality
    or new.shift is distinct from old.shift
    or new.name is distinct from old.name
    or new.classroom_id is distinct from old.classroom_id
    or new.cohort_group_id is distinct from old.cohort_group_id then
    raise exception using errcode = '42501', message = 'Solo el administrador puede modificar los datos generales del grupo.';
  end if;

  if new.status is distinct from old.status
    and not (
      (old.status = 'draft' and new.status = 'review')
      or (old.status = 'review' and new.status = 'draft')
    ) then
    raise exception using errcode = '42501', message = 'Solo el administrador puede finalizar o archivar grupos.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_group_update_permissions on public.groups;
create trigger enforce_group_update_permissions
before update on public.groups
for each row execute function public.enforce_group_update_permissions();

create or replace function public.enforce_group_subject_mutation_permissions()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'Solo el administrador puede eliminar materias de un grupo.';
  end if;

  if new.group_id is distinct from old.group_id
    or new.subject_id is distinct from old.subject_id
    or new.required_profile_code is distinct from old.required_profile_code
    or new.status is distinct from old.status then
    raise exception using errcode = '42501', message = 'Solo puedes modificar las horas planeadas de la materia.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_group_subject_mutation_permissions on public.group_subjects;
create trigger enforce_group_subject_mutation_permissions
before update or delete on public.group_subjects
for each row execute function public.enforce_group_subject_mutation_permissions();

-- La carga máxima nunca puede quedar debajo de la carga ya asignada, incluso si
-- la petición usa directamente la API de datos.
create or replace function public.enforce_teacher_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if new.max_hours < new.assigned_hours then
    raise exception 'Las horas máximas no pueden quedar debajo de las horas ya asignadas.';
  end if;

  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
    return new;
  end if;

  if not public.can_access_teacher(old.id) then
    raise exception using errcode = '42501', message = 'No tienes permiso para modificar este docente.';
  end if;

  if new.name is distinct from old.name
    or new.normalized_name is distinct from old.normalized_name
    or new.email is distinct from old.email
    or new.expediente_url is distinct from old.expediente_url
    or new.responsible_coordinator_id is distinct from old.responsible_coordinator_id
    or new.active is distinct from old.active
    or new.assigned_hours is distinct from old.assigned_hours then
    raise exception using errcode = '42501', message = 'Solo el administrador puede modificar datos generales del docente.';
  end if;

  return new;
end;
$$;

alter table public.academic_cycles
  drop constraint if exists academic_cycles_valid_date_range;

alter table public.academic_cycles
  add constraint academic_cycles_valid_date_range
  check (starts_at is null or ends_at is null or ends_at >= starts_at);

-- Alta/edición y relaciones se confirman o revierten juntas.
create or replace function public.upsert_teacher_with_profiles(
  p_teacher_id uuid,
  p_name text,
  p_normalized_name text,
  p_email text,
  p_max_hours numeric,
  p_profile_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_teacher_id uuid;
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or not public.is_admin()) then
    raise exception using errcode = '42501', message = 'Solo el administrador puede guardar docentes.';
  end if;

  if p_teacher_id is null or not exists (
    select 1 from public.teachers t where t.id = p_teacher_id
  ) then
    insert into public.teachers (id, name, normalized_name, email, max_hours, active)
    values (coalesce(p_teacher_id, gen_random_uuid()), p_name, p_normalized_name, nullif(p_email, ''), p_max_hours, true)
    on conflict (normalized_name)
    do update set
      name = excluded.name,
      email = excluded.email,
      max_hours = excluded.max_hours,
      active = true
    returning id into saved_teacher_id;
  else
    update public.teachers
    set name = p_name,
        normalized_name = p_normalized_name,
        email = nullif(p_email, ''),
        max_hours = p_max_hours
    where id = p_teacher_id
    returning id into saved_teacher_id;

    if saved_teacher_id is null then
      raise exception 'Docente no encontrado.';
    end if;
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
  where teacher_id = saved_teacher_id;

  insert into public.teacher_available_profiles (teacher_id, profile_code)
  select saved_teacher_id, requested.code
  from (
    select distinct code
    from unnest(coalesce(p_profile_codes, array[]::text[])) values_list(code)
  ) requested
  where requested.code is not null;

  return saved_teacher_id;
end;
$$;

revoke all on function public.upsert_teacher_with_profiles(uuid, text, text, text, numeric, text[]) from public;
grant execute on function public.upsert_teacher_with_profiles(uuid, text, text, text, numeric, text[])
  to authenticated, service_role;

create or replace function public.upsert_subject_with_requirements(
  p_subject_id uuid,
  p_career_id uuid,
  p_name text,
  p_normalized_name text,
  p_quarter integer,
  p_default_hours numeric,
  p_profile_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_subject_id uuid;
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or not public.is_admin()) then
    raise exception using errcode = '42501', message = 'Solo el administrador puede guardar materias.';
  end if;

  if p_subject_id is null or not exists (
    select 1 from public.subjects s where s.id = p_subject_id
  ) then
    insert into public.subjects (
      id,
      career_id,
      name,
      normalized_name,
      quarter,
      default_hours,
      active
    )
    values (
      coalesce(p_subject_id, gen_random_uuid()),
      p_career_id,
      p_name,
      p_normalized_name,
      p_quarter,
      p_default_hours,
      true
    )
    on conflict (career_id, quarter, normalized_name)
    do update set
      name = excluded.name,
      default_hours = excluded.default_hours,
      active = true
    returning id into saved_subject_id;
  else
    update public.subjects
    set name = p_name,
        normalized_name = p_normalized_name,
        quarter = p_quarter,
        default_hours = p_default_hours
    where id = p_subject_id
      and career_id = p_career_id
    returning id into saved_subject_id;

    if saved_subject_id is null then
      raise exception 'Materia no encontrada.';
    end if;
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
  where subject_id = saved_subject_id;

  insert into public.class_requirements (subject_id, profile_code)
  select saved_subject_id, requested.code
  from (
    select distinct code
    from unnest(coalesce(p_profile_codes, array[]::text[])) values_list(code)
  ) requested
  where requested.code is not null;

  return saved_subject_id;
end;
$$;

revoke all on function public.upsert_subject_with_requirements(uuid, uuid, text, text, integer, numeric, text[]) from public;
grant execute on function public.upsert_subject_with_requirements(uuid, uuid, text, text, integer, numeric, text[])
  to authenticated, service_role;

revoke all on function public.enforce_group_update_permissions() from public;
revoke all on function public.enforce_group_subject_mutation_permissions() from public;

commit;
