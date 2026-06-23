begin;

create table if not exists public.cohort_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  career_id uuid not null references public.careers(id),
  modality text not null check (modality in ('escolarizado','modular','virtual_modular','maestrias','sabatino')),
  shift text not null check (shift in ('matutino','vespertino')),
  current_quarter integer not null default 1 check (current_quarter between 1 and 12),
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (career_id, modality, shift, name)
);

create table if not exists public.cohort_subject_history (
  id uuid primary key default gen_random_uuid(),
  cohort_group_id uuid not null references public.cohort_groups(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  quarter integer not null check (quarter between 1 and 12),
  group_id uuid references public.groups(id) on delete set null,
  completed_at timestamptz not null default now(),
  unique (cohort_group_id, subject_id)
);

alter table public.groups
  add column if not exists cohort_group_id uuid references public.cohort_groups(id) on delete set null,
  add column if not exists section text check (char_length(section) <= 4);

-- RLS: cohort_groups
alter table public.cohort_groups enable row level security;

create policy cohort_groups_select on public.cohort_groups for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.coordinator_careers cc
      join public.coordinators c on c.id = cc.coordinator_id
      where c.profile_id = auth.uid() and cc.career_id = cohort_groups.career_id
    )
  );

create policy cohort_groups_admin_all on public.cohort_groups
  for all using (public.is_admin());

-- RLS: cohort_subject_history
alter table public.cohort_subject_history enable row level security;

create policy cohort_subject_history_select on public.cohort_subject_history for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.cohort_groups cg
      join public.coordinator_careers cc on cc.career_id = cg.career_id
      join public.coordinators c on c.id = cc.coordinator_id
      where cg.id = cohort_subject_history.cohort_group_id and c.profile_id = auth.uid()
    )
  );

create policy cohort_subject_history_admin_all on public.cohort_subject_history
  for all using (public.is_admin());

create policy cohort_subject_history_coordinator_insert on public.cohort_subject_history for insert
  with check (
    exists (
      select 1 from public.cohort_groups cg
      join public.coordinator_careers cc on cc.career_id = cg.career_id
      join public.coordinators c on c.id = cc.coordinator_id
      where cg.id = cohort_subject_history.cohort_group_id and c.profile_id = auth.uid()
    )
  );

-- Audit triggers
create trigger audit_cohort_groups
  after insert or update or delete on public.cohort_groups
  for each row execute function public.audit_row_changes();

create trigger audit_cohort_subject_history
  after insert on public.cohort_subject_history
  for each row execute function public.audit_row_changes();

commit;
