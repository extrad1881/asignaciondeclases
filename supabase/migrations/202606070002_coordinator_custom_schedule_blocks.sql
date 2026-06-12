begin;

alter table public.schedule_blocks
  add column if not exists is_custom boolean not null default false,
  add column if not exists created_by uuid references public.users_profile(id) on delete set null default auth.uid();

create index if not exists idx_schedule_blocks_created_by on public.schedule_blocks(created_by);
create index if not exists idx_schedule_blocks_custom_template on public.schedule_blocks(template_id, is_custom);

create policy "schedule_blocks_coordinator_insert_custom"
on public.schedule_blocks
for insert
to authenticated
with check (
  public.current_role_code() = 'coordinator'
  and is_custom = true
  and created_by = auth.uid()
  and exists (
    select 1
    from public.schedule_templates st
    where st.id = template_id
      and st.active = true
  )
);

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
begin
  select gs.id, gs.subject_id, gs.required_profile_code, g.modality, g.shift, g.classroom_id
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

  new_hours := extract(epoch from (block_row.ends_at - block_row.starts_at)) / 3600.0;
  new.duration_hours := new_hours;

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
    where a.group_subject_id = new.group_subject_id
      and a.schedule_block_id = new.schedule_block_id
      and a.status = 'active'
      and a.id is distinct from new.id
  ) then
    raise exception 'La materia ya tiene otro docente asignado en este bloque.';
  end if;

  if new.classroom_id is null then
    new.classroom_id := group_row.classroom_id;
  end if;

  return new;
end;
$$;

commit;
