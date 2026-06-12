begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create table if not exists public.roles (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null unique,
  display_name text not null,
  role_code text not null references public.roles(code),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coordinators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.users_profile(id) on delete set null,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.careers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  normalized_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coordinator_careers (
  coordinator_id uuid not null references public.coordinators(id) on delete cascade,
  career_id uuid not null references public.careers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coordinator_id, career_id)
);

create table if not exists public.teacher_profiles (
  code text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  email extensions.citext,
  expediente_url text,
  max_hours numeric(5,2) not null default 20 check (max_hours >= 0),
  assigned_hours numeric(5,2) not null default 0 check (assigned_hours >= 0),
  responsible_coordinator_id uuid references public.coordinators(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coordinator_teachers (
  coordinator_id uuid not null references public.coordinators(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coordinator_id, teacher_id)
);

create table if not exists public.teacher_available_profiles (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  profile_code text not null references public.teacher_profiles(code) on update cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, profile_code)
);

create table if not exists public.academic_cycles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  starts_at date,
  ends_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity integer check (capacity is null or capacity >= 0),
  kind text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.careers(id) on delete cascade,
  quarter integer not null check (quarter between 1 and 12),
  name text not null,
  normalized_name text not null,
  default_hours numeric(5,2) not null default 5 check (default_hours > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (career_id, quarter, normalized_name)
);

create table if not exists public.class_requirements (
  subject_id uuid not null references public.subjects(id) on delete cascade,
  profile_code text not null references public.teacher_profiles(code) on update cascade,
  created_at timestamptz not null default now(),
  primary key (subject_id, profile_code)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  academic_cycle_id uuid not null references public.academic_cycles(id),
  career_id uuid not null references public.careers(id),
  quarter integer not null check (quarter between 1 and 12),
  modality text not null check (modality in ('escolarizado', 'modular', 'virtual_modular', 'maestrias')),
  shift text not null check (shift in ('matutino', 'vespertino')),
  name text not null,
  classroom_id uuid references public.classrooms(id),
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'archived')),
  created_by uuid references public.users_profile(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_cycle_id, career_id, modality, shift, name)
);

create table if not exists public.group_subjects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  hours_per_week numeric(5,2) not null check (hours_per_week > 0),
  required_profile_code text references public.teacher_profiles(code) on update cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, subject_id)
);

create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  modality text not null check (modality in ('escolarizado', 'modular', 'virtual_modular', 'maestrias')),
  shift text not null check (shift in ('matutino', 'vespertino')),
  starts_at time not null,
  ends_at time not null,
  asset_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (modality, shift)
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.schedule_templates(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  label text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (template_id, day_of_week, starts_at, ends_at)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  group_subject_id uuid not null references public.group_subjects(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  schedule_block_id uuid not null references public.schedule_blocks(id),
  classroom_id uuid references public.classrooms(id),
  duration_hours numeric(5,2) not null default 0 check (duration_hours >= 0),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid references public.users_profile(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_subject_id, schedule_block_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.users_profile(id) on delete set null,
  action_type text not null,
  table_name text not null,
  record_id text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_profile_role on public.users_profile(role_code);
create index if not exists idx_coordinators_profile on public.coordinators(profile_id);
create index if not exists idx_careers_code on public.careers(code);
create index if not exists idx_teachers_responsible on public.teachers(responsible_coordinator_id);
create index if not exists idx_subjects_career_quarter on public.subjects(career_id, quarter);
create index if not exists idx_groups_cycle_modality_shift_quarter on public.groups(academic_cycle_id, modality, shift, quarter);
create index if not exists idx_group_subjects_group on public.group_subjects(group_id);
create index if not exists idx_assignments_teacher on public.assignments(teacher_id);
create index if not exists idx_assignments_block on public.assignments(schedule_block_id);
create index if not exists idx_audit_logs_table_record on public.audit_logs(table_name, record_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.unaccent_fallback(value text)
returns text
language sql
immutable
as $$
  select translate(
    value,
    'ÁÉÍÓÚÜÑáéíóúüñ',
    'AEIOUUNaeiouun'
  );
$$;

create or replace function public.normalize_key(value text)
returns text
language sql
immutable
as $$
  select upper(trim(regexp_replace(public.unaccent_fallback(coalesce(value, '')), '[[:space:]]+', ' ', 'g')));
$$;

create or replace function public.current_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_code from public.users_profile where id = auth.uid() and active = true;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_code() = 'admin', false);
$$;

create or replace function public.current_coordinator_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.coordinators where profile_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.can_access_career(target_career_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.coordinator_careers cc
      where cc.coordinator_id = public.current_coordinator_id()
        and cc.career_id = target_career_id
    );
$$;

create or replace function public.can_access_teacher(target_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.coordinator_teachers ct
      where ct.coordinator_id = public.current_coordinator_id()
        and ct.teacher_id = target_teacher_id
    )
    or exists (
      select 1
      from public.teachers t
      where t.id = target_teacher_id
        and t.responsible_coordinator_id = public.current_coordinator_id()
    );
$$;

create or replace function public.can_access_group_subject(target_group_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_subjects gs
    join public.groups g on g.id = gs.group_id
    where gs.id = target_group_subject_id
      and public.can_access_career(g.career_id)
  );
$$;

create or replace function public.can_manage_assignment(target_group_subject_id uuid, target_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or (
      public.can_access_group_subject(target_group_subject_id)
      and public.can_access_teacher(target_teacher_id)
    );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profile (id, email, display_name, role_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role_code', 'coordinator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

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
begin
  target_id := coalesce(new_doc->>'id', old_doc->>'id', md5(coalesce(new_doc::text, old_doc::text)));

  insert into public.audit_logs (user_id, action_type, table_name, record_id, old_value, new_value)
  values (auth.uid(), lower(tg_op), tg_table_name, target_id, old_doc, new_doc);

  return coalesce(new, old);
end;
$$;

create or replace function public.enforce_teacher_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
    return new;
  end if;

  if not public.can_access_teacher(old.id) then
    raise exception 'No tienes permiso para modificar este docente.';
  end if;

  if new.name is distinct from old.name
    or new.normalized_name is distinct from old.normalized_name
    or new.email is distinct from old.email
    or new.expediente_url is distinct from old.expediente_url
    or new.responsible_coordinator_id is distinct from old.responsible_coordinator_id
    or new.active is distinct from old.active
    or new.assigned_hours is distinct from old.assigned_hours then
    raise exception 'Solo el administrador puede modificar datos generales del docente.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_subject_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
    return new;
  end if;

  if not public.can_access_career(old.career_id) then
    raise exception 'No tienes permiso para modificar esta carrera.';
  end if;

  if new.career_id is distinct from old.career_id
    or new.quarter is distinct from old.quarter
    or new.name is distinct from old.name
    or new.normalized_name is distinct from old.normalized_name
    or new.active is distinct from old.active then
    raise exception 'Solo el administrador puede modificar datos generales de la materia.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_class_requirement_admin()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin() then
    return coalesce(new, old);
  end if;
  raise exception 'Solo el administrador puede modificar el perfil requerido por una clase.';
end;
$$;

create or replace function public.enforce_group_subject_profile_admin()
returns trigger
language plpgsql
as $$
begin
  if new.required_profile_code is distinct from old.required_profile_code
    and not (current_user in ('postgres', 'supabase_admin', 'service_role') or public.is_admin()) then
    raise exception 'Solo el administrador puede modificar el perfil requerido por una clase.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_group_modality_shift()
returns trigger
language plpgsql
as $$
begin
  if new.modality = 'virtual_modular' and new.shift <> 'matutino' then
    raise exception 'Virtual modular solo maneja turno matutino por ahora.';
  end if;

  if new.modality = 'maestrias' and new.shift <> 'vespertino' then
    raise exception 'Maestrías debe usar el turno vespertino configurado.';
  end if;

  return new;
end;
$$;

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
    raise exception 'La asignación está incompleta.';
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

  select * into teacher_row from public.teachers where id = new.teacher_id and active = true;
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

  new_hours := extract(epoch from (block_row.ends_at - block_row.starts_at)) / 3600.0;
  new.duration_hours := new_hours;

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

create or replace function public.refresh_teacher_hours(target_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.teachers
  set assigned_hours = (
    select coalesce(sum(duration_hours), 0)
    from public.assignments
    where teacher_id = target_teacher_id and status = 'active'
  )
  where id = target_teacher_id;
end;
$$;

create or replace function public.refresh_teacher_hours_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_teacher_hours(old.teacher_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_teacher_hours(new.teacher_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists set_users_profile_updated_at on public.users_profile;
create trigger set_users_profile_updated_at before update on public.users_profile for each row execute function public.set_updated_at();
drop trigger if exists set_coordinators_updated_at on public.coordinators;
create trigger set_coordinators_updated_at before update on public.coordinators for each row execute function public.set_updated_at();
drop trigger if exists set_careers_updated_at on public.careers;
create trigger set_careers_updated_at before update on public.careers for each row execute function public.set_updated_at();
drop trigger if exists set_teachers_updated_at on public.teachers;
create trigger set_teachers_updated_at before update on public.teachers for each row execute function public.set_updated_at();
drop trigger if exists set_cycles_updated_at on public.academic_cycles;
create trigger set_cycles_updated_at before update on public.academic_cycles for each row execute function public.set_updated_at();
drop trigger if exists set_classrooms_updated_at on public.classrooms;
create trigger set_classrooms_updated_at before update on public.classrooms for each row execute function public.set_updated_at();
drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();
drop trigger if exists set_groups_updated_at on public.groups;
create trigger set_groups_updated_at before update on public.groups for each row execute function public.set_updated_at();
drop trigger if exists set_group_subjects_updated_at on public.group_subjects;
create trigger set_group_subjects_updated_at before update on public.group_subjects for each row execute function public.set_updated_at();
drop trigger if exists set_schedule_templates_updated_at on public.schedule_templates;
create trigger set_schedule_templates_updated_at before update on public.schedule_templates for each row execute function public.set_updated_at();
drop trigger if exists set_schedule_blocks_updated_at on public.schedule_blocks;
create trigger set_schedule_blocks_updated_at before update on public.schedule_blocks for each row execute function public.set_updated_at();
drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();

drop trigger if exists enforce_teacher_update_permissions on public.teachers;
create trigger enforce_teacher_update_permissions before update on public.teachers for each row execute function public.enforce_teacher_update_permissions();
drop trigger if exists enforce_subject_update_permissions on public.subjects;
create trigger enforce_subject_update_permissions before update on public.subjects for each row execute function public.enforce_subject_update_permissions();
drop trigger if exists enforce_class_requirement_admin on public.class_requirements;
create trigger enforce_class_requirement_admin before insert or update or delete on public.class_requirements for each row execute function public.enforce_class_requirement_admin();
drop trigger if exists enforce_group_subject_profile_admin on public.group_subjects;
create trigger enforce_group_subject_profile_admin before update on public.group_subjects for each row execute function public.enforce_group_subject_profile_admin();
drop trigger if exists validate_group_modality_shift on public.groups;
create trigger validate_group_modality_shift before insert or update on public.groups for each row execute function public.validate_group_modality_shift();
drop trigger if exists validate_assignment on public.assignments;
create trigger validate_assignment before insert or update on public.assignments for each row execute function public.validate_assignment();
drop trigger if exists refresh_teacher_hours_after_assignment on public.assignments;
create trigger refresh_teacher_hours_after_assignment after insert or update or delete on public.assignments for each row execute function public.refresh_teacher_hours_trigger();

drop trigger if exists audit_groups on public.groups;
create trigger audit_groups after insert or update or delete on public.groups for each row execute function public.audit_row_changes();
drop trigger if exists audit_group_subjects on public.group_subjects;
create trigger audit_group_subjects after insert or update or delete on public.group_subjects for each row execute function public.audit_row_changes();
drop trigger if exists audit_assignments on public.assignments;
create trigger audit_assignments after insert or update or delete on public.assignments for each row execute function public.audit_row_changes();
drop trigger if exists audit_class_requirements on public.class_requirements;
create trigger audit_class_requirements after insert or update or delete on public.class_requirements for each row execute function public.audit_row_changes();
drop trigger if exists audit_teachers on public.teachers;
create trigger audit_teachers after update on public.teachers for each row execute function public.audit_row_changes();
drop trigger if exists audit_teacher_available_profiles on public.teacher_available_profiles;
create trigger audit_teacher_available_profiles after insert or delete on public.teacher_available_profiles for each row execute function public.audit_row_changes();
drop trigger if exists audit_coordinator_careers on public.coordinator_careers;
create trigger audit_coordinator_careers after insert or delete on public.coordinator_careers for each row execute function public.audit_row_changes();
drop trigger if exists audit_coordinator_teachers on public.coordinator_teachers;
create trigger audit_coordinator_teachers after insert or delete on public.coordinator_teachers for each row execute function public.audit_row_changes();

alter table public.roles enable row level security;
alter table public.users_profile enable row level security;
alter table public.coordinators enable row level security;
alter table public.careers enable row level security;
alter table public.coordinator_careers enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.coordinator_teachers enable row level security;
alter table public.teacher_available_profiles enable row level security;
alter table public.academic_cycles enable row level security;
alter table public.classrooms enable row level security;
alter table public.subjects enable row level security;
alter table public.class_requirements enable row level security;
alter table public.groups enable row level security;
alter table public.group_subjects enable row level security;
alter table public.schedule_templates enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.assignments enable row level security;
alter table public.audit_logs enable row level security;

create policy "roles_select" on public.roles for select to authenticated using (true);
create policy "roles_admin_all" on public.roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "profiles_select" on public.users_profile for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_all" on public.users_profile for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "coordinators_select" on public.coordinators for select to authenticated using (public.is_admin() or profile_id = auth.uid());
create policy "coordinators_admin_all" on public.coordinators for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "careers_select" on public.careers for select to authenticated using (public.can_access_career(id));
create policy "careers_admin_all" on public.careers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "coordinator_careers_select" on public.coordinator_careers for select to authenticated using (public.is_admin() or coordinator_id = public.current_coordinator_id());
create policy "coordinator_careers_admin_all" on public.coordinator_careers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "teacher_profiles_select" on public.teacher_profiles for select to authenticated using (true);
create policy "teacher_profiles_admin_all" on public.teacher_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "teachers_select" on public.teachers for select to authenticated using (public.can_access_teacher(id));
create policy "teachers_insert_admin" on public.teachers for insert to authenticated with check (public.is_admin());
create policy "teachers_update_admin_or_owner" on public.teachers for update to authenticated using (public.is_admin() or public.can_access_teacher(id)) with check (public.is_admin() or public.can_access_teacher(id));

create policy "coordinator_teachers_select" on public.coordinator_teachers for select to authenticated using (public.is_admin() or coordinator_id = public.current_coordinator_id());
create policy "coordinator_teachers_admin_all" on public.coordinator_teachers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "teacher_available_profiles_select" on public.teacher_available_profiles for select to authenticated using (public.can_access_teacher(teacher_id));
create policy "teacher_available_profiles_insert" on public.teacher_available_profiles for insert to authenticated with check (public.is_admin() or public.can_access_teacher(teacher_id));
create policy "teacher_available_profiles_delete" on public.teacher_available_profiles for delete to authenticated using (public.is_admin() or public.can_access_teacher(teacher_id));

create policy "academic_cycles_select" on public.academic_cycles for select to authenticated using (true);
create policy "academic_cycles_admin_all" on public.academic_cycles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "classrooms_select" on public.classrooms for select to authenticated using (true);
create policy "classrooms_admin_all" on public.classrooms for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "subjects_select" on public.subjects for select to authenticated using (public.can_access_career(career_id));
create policy "subjects_insert_admin" on public.subjects for insert to authenticated with check (public.is_admin());
create policy "subjects_update_admin_or_coordinator" on public.subjects for update to authenticated using (public.is_admin() or public.can_access_career(career_id)) with check (public.is_admin() or public.can_access_career(career_id));

create policy "class_requirements_select" on public.class_requirements for select to authenticated using (
  exists (select 1 from public.subjects s where s.id = subject_id and public.can_access_career(s.career_id))
);
create policy "class_requirements_admin_all" on public.class_requirements for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "groups_select" on public.groups for select to authenticated using (public.can_access_career(career_id));
create policy "groups_insert" on public.groups for insert to authenticated with check (public.can_access_career(career_id));
create policy "groups_update" on public.groups for update to authenticated using (public.can_access_career(career_id)) with check (public.can_access_career(career_id));
create policy "groups_delete_admin" on public.groups for delete to authenticated using (public.is_admin());

create policy "group_subjects_select" on public.group_subjects for select to authenticated using (public.can_access_group_subject(id));
create policy "group_subjects_insert" on public.group_subjects for insert to authenticated with check (
  exists (select 1 from public.groups g where g.id = group_id and public.can_access_career(g.career_id))
);
create policy "group_subjects_update" on public.group_subjects for update to authenticated using (public.can_access_group_subject(id)) with check (public.can_access_group_subject(id));
create policy "group_subjects_delete" on public.group_subjects for delete to authenticated using (public.can_access_group_subject(id));

create policy "schedule_templates_select" on public.schedule_templates for select to authenticated using (true);
create policy "schedule_templates_admin_all" on public.schedule_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "schedule_blocks_select" on public.schedule_blocks for select to authenticated using (true);
create policy "schedule_blocks_admin_all" on public.schedule_blocks for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "assignments_select" on public.assignments for select to authenticated using (
  public.can_manage_assignment(group_subject_id, teacher_id)
);
create policy "assignments_insert" on public.assignments for insert to authenticated with check (
  public.can_manage_assignment(group_subject_id, teacher_id)
);
create policy "assignments_update" on public.assignments for update to authenticated using (
  public.can_manage_assignment(group_subject_id, teacher_id)
) with check (
  public.can_manage_assignment(group_subject_id, teacher_id)
);
create policy "assignments_delete" on public.assignments for delete to authenticated using (
  public.can_manage_assignment(group_subject_id, teacher_id)
);

create policy "audit_logs_admin_select" on public.audit_logs for select to authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;

commit;
