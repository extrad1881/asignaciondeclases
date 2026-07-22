begin;

-- Una cohorte representa un solo grupo que avanza en cada ciclo escolar.
create unique index if not exists groups_one_per_cohort_cycle
  on public.groups (cohort_group_id, academic_cycle_id)
  where cohort_group_id is not null;

create or replace function public.validate_group_cohort_link()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cohort_record public.cohort_groups%rowtype;
  has_previous_group boolean;
begin
  if new.cohort_group_id is null then
    return new;
  end if;

  select *
  into cohort_record
  from public.cohort_groups
  where id = new.cohort_group_id;

  if not found then
    raise exception 'La cohorte seleccionada no existe.';
  end if;

  if cohort_record.status <> 'active' then
    raise exception 'Solo se pueden vincular grupos a cohortes activas.';
  end if;

  if new.career_id <> cohort_record.career_id
    or new.modality <> cohort_record.modality
    or new.shift <> cohort_record.shift then
    raise exception 'El grupo debe coincidir con la carrera, modalidad y turno de la cohorte.';
  end if;

  if tg_op = 'UPDATE' and old.cohort_group_id is not null then
    if new.cohort_group_id is distinct from old.cohort_group_id
      or new.academic_cycle_id is distinct from old.academic_cycle_id
      or new.career_id is distinct from old.career_id
      or new.quarter is distinct from old.quarter
      or new.modality is distinct from old.modality
      or new.shift is distinct from old.shift then
      raise exception 'No se puede mover un grupo ya vinculado a una cohorte.';
    end if;

    return new;
  end if;

  select exists (
    select 1
    from public.groups g
    where g.cohort_group_id = new.cohort_group_id
      and g.id <> new.id
  )
  into has_previous_group;

  if has_previous_group and new.quarter <> cohort_record.current_quarter + 1 then
    raise exception 'El siguiente grupo de la cohorte debe corresponder al cuatrimestre %.',
      cohort_record.current_quarter + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_group_cohort_link on public.groups;
create trigger validate_group_cohort_link
before insert or update of cohort_group_id, academic_cycle_id, career_id, quarter, modality, shift
on public.groups
for each row execute function public.validate_group_cohort_link();

-- El primer grupo se captura manualmente, pero su creación y vínculo deben ser atómicos.
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
    select 1 from public.groups g where g.cohort_group_id = p_cohort_group_id
  ) then
    raise exception 'La cohorte ya tiene su grupo inicial. Los grupos siguientes se generan al activar cada ciclo.';
  end if;

  if p_career_id <> cohort_record.career_id
    or p_modality <> cohort_record.modality
    or p_shift <> cohort_record.shift then
    raise exception 'El grupo debe coincidir con la carrera, modalidad y turno de la cohorte.';
  end if;

  if p_completed_subject_ids is null or jsonb_typeof(p_completed_subject_ids) <> 'array' then
    raise exception 'El historial de materias debe ser una lista.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_completed_subject_ids) item
    left join public.subjects s on s.id = item.value::uuid
    where s.id is null
      or s.career_id <> p_career_id
      or s.quarter >= p_quarter
  ) then
    raise exception 'El historial contiene materias que no corresponden a cuatrimestres anteriores de la cohorte.';
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
    s.id,
    s.quarter,
    null
  from public.subjects s
  join jsonb_array_elements_text(p_completed_subject_ids) item
    on s.id = item.value::uuid
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

-- Genera el siguiente grupo únicamente si la cohorte no tiene ya uno en el ciclo activo.
create or replace function public.generate_cohort_group_for_active_cycle(
  p_cohort_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cohort_record public.cohort_groups%rowtype;
  active_cycle_id uuid;
  existing_group_id uuid;
  current_group record;
  next_quarter integer;
  last_curriculum_quarter integer;
  subject_payload jsonb;
  subject_count integer;
  new_group_id uuid;
  group_name text;
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
    raise exception 'Cohorte no encontrada.';
  end if;

  if not public.can_access_career(cohort_record.career_id) then
    raise exception 'No tienes permiso para modificar esta cohorte.';
  end if;

  if cohort_record.status <> 'active' then
    raise exception 'La cohorte no está activa.';
  end if;

  select ac.id
  into active_cycle_id
  from public.academic_cycles ac
  where ac.status = 'active';

  if active_cycle_id is null then
    raise exception 'No hay un ciclo escolar activo.';
  end if;

  select g.id
  into existing_group_id
  from public.groups g
  where g.cohort_group_id = p_cohort_group_id
    and g.academic_cycle_id = active_cycle_id
  limit 1;

  if existing_group_id is not null then
    return jsonb_build_object(
      'status', 'already_exists',
      'cohort_id', p_cohort_group_id,
      'group_id', existing_group_id,
      'quarter', cohort_record.current_quarter
    );
  end if;

  select g.id, g.academic_cycle_id, g.quarter, g.classroom_id
  into current_group
  from public.groups g
  where g.cohort_group_id = p_cohort_group_id
  order by g.quarter desc, g.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'status', 'needs_initial_group',
      'cohort_id', p_cohort_group_id,
      'quarter', cohort_record.current_quarter
    );
  end if;

  if current_group.quarter <> cohort_record.current_quarter then
    raise exception 'El avance de la cohorte no coincide con su último grupo. Revisa sus datos antes de continuar.';
  end if;

  select max(s.quarter)
  into last_curriculum_quarter
  from public.subjects s
  where s.career_id = cohort_record.career_id
    and s.active = true;

  if last_curriculum_quarter is null then
    raise exception 'La carrera de la cohorte % no tiene materias activas.', cohort_record.name;
  end if;

  if cohort_record.current_quarter >= last_curriculum_quarter then
    update public.cohort_groups
    set status = 'completed'
    where id = p_cohort_group_id;

    return jsonb_build_object(
      'status', 'completed',
      'cohort_id', p_cohort_group_id,
      'quarter', cohort_record.current_quarter
    );
  end if;

  next_quarter := cohort_record.current_quarter + 1;

  select
    jsonb_agg(
      jsonb_build_object(
        'subject_id', s.id,
        'hours_per_week', s.default_hours
      ) order by s.name
    ),
    count(*)::integer
  into subject_payload, subject_count
  from public.subjects s
  where s.career_id = cohort_record.career_id
    and s.quarter = next_quarter
    and s.active = true;

  if subject_count = 0 then
    raise exception 'La cohorte % no tiene materias activas para el cuatrimestre %.',
      cohort_record.name,
      next_quarter;
  end if;

  insert into public.cohort_subject_history (
    cohort_group_id,
    subject_id,
    quarter,
    group_id
  )
  select
    p_cohort_group_id,
    gs.subject_id,
    cohort_record.current_quarter,
    current_group.id
  from public.group_subjects gs
  where gs.group_id = current_group.id
  on conflict (cohort_group_id, subject_id)
  do update set
    quarter = excluded.quarter,
    group_id = excluded.group_id;

  group_name := cohort_record.name || ' Q' || next_quarter;

  new_group_id := public.create_group_with_subjects(
    p_academic_cycle_id => active_cycle_id,
    p_career_id => cohort_record.career_id,
    p_quarter => next_quarter,
    p_modality => cohort_record.modality,
    p_shift => cohort_record.shift,
    p_name => group_name,
    p_classroom_id => current_group.classroom_id,
    p_subjects => subject_payload
  );

  update public.groups
  set cohort_group_id = p_cohort_group_id
  where id = new_group_id;

  update public.cohort_groups
  set current_quarter = next_quarter
  where id = p_cohort_group_id;

  return jsonb_build_object(
    'status', 'created',
    'cohort_id', p_cohort_group_id,
    'group_id', new_group_id,
    'quarter', next_quarter,
    'subject_count', subject_count,
    'group_name', group_name
  );
end;
$$;

revoke all on function public.generate_cohort_group_for_active_cycle(uuid) from public;
grant execute on function public.generate_cohort_group_for_active_cycle(uuid)
  to authenticated, service_role;

-- Activar un ciclo y avanzar todas las cohortes inicializadas es una sola transacción.
create or replace function public.activate_academic_cycle_and_advance_cohorts(
  p_cycle_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_status text;
  cohort_item record;
  generation_result jsonb;
  generated_count integer := 0;
  completed_count integer := 0;
  skipped_count integer := 0;
  pending_initial_count integer := 0;
  generated_groups jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede activar ciclos escolares.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('academic_cycle_activation', 0));

  select ac.status
  into target_status
  from public.academic_cycles ac
  where ac.id = p_cycle_id
  for update;

  if not found then
    raise exception 'Ciclo escolar no encontrado.';
  end if;

  if target_status not in ('draft', 'active') then
    raise exception 'Solo se puede activar un ciclo en borrador.';
  end if;

  if target_status = 'draft' then
    update public.academic_cycles
    set status = 'finalized'
    where status = 'active'
      and id <> p_cycle_id;

    update public.academic_cycles
    set status = 'active'
    where id = p_cycle_id;
  end if;

  select count(*)::integer
  into pending_initial_count
  from public.cohort_groups cg
  where cg.status = 'active'
    and not exists (
      select 1 from public.groups g where g.cohort_group_id = cg.id
    );

  for cohort_item in
    select cg.id
    from public.cohort_groups cg
    where cg.status = 'active'
      and exists (
        select 1 from public.groups g where g.cohort_group_id = cg.id
      )
    order by cg.created_at, cg.id
  loop
    generation_result := public.generate_cohort_group_for_active_cycle(cohort_item.id);

    case generation_result->>'status'
      when 'created' then
        generated_count := generated_count + 1;
        generated_groups := generated_groups || jsonb_build_array(generation_result);
      when 'completed' then
        completed_count := completed_count + 1;
      when 'already_exists' then
        skipped_count := skipped_count + 1;
      when 'needs_initial_group' then
        pending_initial_count := pending_initial_count + 1;
      else
        raise exception 'Resultado inesperado al avanzar una cohorte.';
    end case;
  end loop;

  return jsonb_build_object(
    'status', 'activated',
    'cycle_id', p_cycle_id,
    'generated_count', generated_count,
    'completed_count', completed_count,
    'skipped_count', skipped_count,
    'pending_initial_count', pending_initial_count,
    'generated_groups', generated_groups
  );
end;
$$;

revoke all on function public.activate_academic_cycle_and_advance_cohorts(uuid) from public;
grant execute on function public.activate_academic_cycle_and_advance_cohorts(uuid)
  to authenticated, service_role;

commit;
