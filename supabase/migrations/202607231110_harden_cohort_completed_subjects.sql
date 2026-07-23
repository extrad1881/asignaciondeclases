begin;

create or replace function public.create_initial_cohort_group_with_subjects(
  p_academic_cycle_id uuid,
  p_career_id uuid,
  p_quarter integer,
  p_modality text,
  p_shift text,
  p_name text,
  p_classroom_id uuid,
  p_subjects jsonb,
  p_cohort_group_id uuid,
  p_completed_subject_ids jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cohort_record public.cohort_groups%rowtype;
  new_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión activa.';
  end if;

  select *
  into cohort_record
  from public.cohort_groups
  where id = p_cohort_group_id
  for update;

  if not found then
    raise exception 'La cohorte seleccionada no existe.';
  end if;

  if not public.can_access_career(cohort_record.career_id) then
    raise exception 'No tienes permiso para crear grupos en esta cohorte.';
  end if;

  if cohort_record.status <> 'active' then
    raise exception 'Solo se puede inicializar una cohorte activa.';
  end if;

  if exists (
    select 1
    from public.groups group_record
    where group_record.cohort_group_id = p_cohort_group_id
  ) then
    raise exception 'La cohorte ya tiene su grupo inicial. Los grupos siguientes se generan al activar cada ciclo.';
  end if;

  if p_career_id <> cohort_record.career_id
    or p_modality <> cohort_record.modality
    or p_shift <> cohort_record.shift then
    raise exception 'El grupo debe coincidir con la carrera, modalidad y turno de la cohorte.';
  end if;

  if p_completed_subject_ids is null
    or jsonb_typeof(p_completed_subject_ids) <> 'array' then
    raise exception 'El historial de materias debe ser una lista.';
  end if;

  if p_subjects is null or jsonb_typeof(p_subjects) <> 'array' then
    raise exception 'Las materias del grupo deben enviarse como una lista.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_completed_subject_ids) completed
    left join public.subjects subject on subject.id = completed.value::uuid
    where subject.id is null
      or subject.career_id <> p_career_id
      or subject.quarter >= p_quarter
  ) then
    raise exception 'El historial contiene materias que no corresponden a cuatrimestres anteriores de la cohorte.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_subjects) selected
    join jsonb_array_elements_text(p_completed_subject_ids) completed
      on selected->>'subject_id' = completed.value
  ) then
    raise exception 'Una materia ya cursada no puede incluirse nuevamente en el grupo.';
  end if;

  new_group_id := public.create_group_with_subjects(
    p_academic_cycle_id => p_academic_cycle_id,
    p_career_id => p_career_id,
    p_quarter => p_quarter,
    p_modality => p_modality,
    p_shift => p_shift,
    p_name => p_name,
    p_classroom_id => p_classroom_id,
    p_subjects => p_subjects
  );

  update public.groups
  set cohort_group_id = p_cohort_group_id
  where id = new_group_id;

  update public.cohort_groups
  set current_quarter = p_quarter
  where id = p_cohort_group_id;

  insert into public.cohort_subject_history (
    cohort_group_id,
    subject_id,
    quarter,
    group_id
  )
  select
    p_cohort_group_id,
    subject.id,
    subject.quarter,
    null
  from public.subjects subject
  join jsonb_array_elements_text(p_completed_subject_ids) completed
    on subject.id = completed.value::uuid
  on conflict (cohort_group_id, subject_id) do nothing;

  return new_group_id;
end;
$$;

revoke all on function public.create_initial_cohort_group_with_subjects(
  uuid, uuid, integer, text, text, text, uuid, jsonb, uuid, jsonb
) from public;
grant execute on function public.create_initial_cohort_group_with_subjects(
  uuid, uuid, integer, text, text, text, uuid, jsonb, uuid, jsonb
) to authenticated, service_role;

commit;
