begin;

-- Permite corregir únicamente el historial capturado manualmente. Los registros
-- ligados a grupos reales se preservan para no alterar la trazabilidad académica.
create or replace function public.set_cohort_manual_completed_subjects(
  p_cohort_group_id uuid,
  p_subject_ids jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cohort_record public.cohort_groups%rowtype;
  manual_subject_count integer;
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
    raise exception 'No tienes permiso para modificar el historial de esta cohorte.';
  end if;

  if cohort_record.status <> 'active' and not public.is_admin() then
    raise exception 'Solo el administrador puede corregir el historial de una cohorte no activa.';
  end if;

  if p_subject_ids is null or jsonb_typeof(p_subject_ids) <> 'array' then
    raise exception 'Las materias cursadas deben enviarse como una lista.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_subject_ids) selected
    where selected.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception 'El historial contiene una materia inválida.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_subject_ids) selected
    left join public.subjects subject on subject.id = selected.value::uuid
    where subject.id is null
      or subject.career_id <> cohort_record.career_id
      or subject.quarter >= cohort_record.current_quarter
  ) then
    raise exception 'Solo se pueden registrar materias de cuatrimestres anteriores de la misma carrera.';
  end if;

  delete from public.cohort_subject_history history
  where history.cohort_group_id = p_cohort_group_id
    and history.group_id is null
    and not exists (
      select 1
      from jsonb_array_elements_text(p_subject_ids) selected
      where selected.value::uuid = history.subject_id
    );

  insert into public.cohort_subject_history (
    cohort_group_id,
    subject_id,
    quarter,
    group_id
  )
  select distinct
    p_cohort_group_id,
    subject.id,
    subject.quarter,
    null::uuid
  from public.subjects subject
  join jsonb_array_elements_text(p_subject_ids) selected
    on subject.id = selected.value::uuid
  on conflict (cohort_group_id, subject_id) do nothing;

  select count(*)::integer
  into manual_subject_count
  from public.cohort_subject_history history
  where history.cohort_group_id = p_cohort_group_id
    and history.group_id is null;

  return manual_subject_count;
end;
$$;

revoke all on function public.set_cohort_manual_completed_subjects(uuid, jsonb) from public;
grant execute on function public.set_cohort_manual_completed_subjects(uuid, jsonb)
  to authenticated, service_role;

-- Las correcciones manuales deben auditar tanto altas como eliminaciones.
drop trigger if exists audit_cohort_subject_history on public.cohort_subject_history;
create trigger audit_cohort_subject_history
  after insert or delete on public.cohort_subject_history
  for each row execute function public.audit_row_changes();

commit;
