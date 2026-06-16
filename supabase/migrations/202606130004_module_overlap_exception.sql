begin;

-- ===================================================================
-- Update validate_assignment() with module overlap exception
-- ===================================================================

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
      and not (block_row.module > 0 and existing_block.module > 0 and block_row.module != existing_block.module)
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
      and not (block_row.module > 0 and existing_block.module > 0 and block_row.module != existing_block.module)
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
        and not (block_row.module > 0 and existing_block.module > 0 and block_row.module != existing_block.module)
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

commit;
