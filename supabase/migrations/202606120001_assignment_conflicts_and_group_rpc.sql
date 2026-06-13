begin;

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
  select gs.id, gs.group_id, gs.subject_id, gs.required_profile_code, gs.hours_per_week, g.modality, g.shift, g.classroom_id
  into group_row
  from public.group_subjects gs
  join public.groups g on g.id = gs.group_id
  where gs.id = new.group_subject_id and gs.status = 'active';

  if group_row.id is null then
    raise exception 'La asignacion esta incompleta.';
  end if;

  select sb.*, st.modality, st.shift
  into block_row
  from public.schedule_blocks sb
  join public.schedule_templates st on st.id = sb.template_id
  where sb.id = new.schedule_block_id and sb.active = true and st.active = true;

  if block_row.id is null then
    raise exception 'El horario elegido no existe dentro del cuadro correspondiente.';
  end if;

  if block_row.modality <> group_row.modality or block_row.shift <> group_row.shift then
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

  select * into teacher_row from public.teachers where id = new.teacher_id and active = true;
  if teacher_row.id is null then
    raise exception 'La asignacion esta incompleta.';
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

  new_hours := coalesce(nullif(new.duration_hours, 0), group_row.hours_per_week);
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
    raise exception 'El docente excede su limite de horas.';
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
  subject_id uuid;
  subject_id_text text;
  subject_name text;
  subject_quarter integer;
  subject_hours numeric(5,2);
  required_profile text;
  normalized_subject_name text;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesion activa.';
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
    'active'
  )
  returning id into new_group_id;

  for subject_item in select value from jsonb_array_elements(p_subjects)
  loop
    subject_id := null;
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
      subject_id := subject_id_text::uuid;

      if not exists (
        select 1
        from public.subjects s
        where s.id = subject_id
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
        raise exception 'El cuatrimestre de la materia externa no es valido.';
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
      returning id into subject_id;

      if required_profile is not null and public.is_admin() then
        insert into public.class_requirements (subject_id, profile_code)
        values (subject_id, required_profile)
        on conflict (subject_id, profile_code) do nothing;
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
      subject_id,
      subject_hours,
      required_profile,
      'active'
    );
  end loop;

  return new_group_id;
end;
$$;

revoke all on function public.create_group_with_subjects(uuid, uuid, integer, text, text, text, uuid, jsonb) from public;
grant execute on function public.create_group_with_subjects(uuid, uuid, integer, text, text, text, uuid, jsonb) to authenticated, service_role;

commit;
