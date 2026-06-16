begin;

-- Add 'review' and 'final' to the group status constraint
alter table public.groups
  drop constraint if exists groups_status_check;

alter table public.groups
  add constraint groups_status_check
  check (status in ('draft', 'active', 'inactive', 'review', 'final', 'archived'));

-- Change the default status when creating a group to 'draft'
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
    'draft'
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
