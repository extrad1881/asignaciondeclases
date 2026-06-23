begin;

alter table public.academic_cycles
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'active', 'finalized', 'archived'));

update public.academic_cycles set status = 'active' where active = true;
update public.academic_cycles set status = 'archived' where active = false;

create unique index if not exists unique_active_cycle
  on public.academic_cycles (status)
  where status = 'active';

commit;
