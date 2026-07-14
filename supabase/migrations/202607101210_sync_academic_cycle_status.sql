begin;

update public.academic_cycles
set active = (status = 'active')
where active is distinct from (status = 'active');

create or replace function public.sync_academic_cycle_active()
returns trigger
language plpgsql
as $$
begin
  new.active := new.status = 'active';
  return new;
end;
$$;

drop trigger if exists sync_academic_cycle_active on public.academic_cycles;
create trigger sync_academic_cycle_active
before insert or update of status, active on public.academic_cycles
for each row execute function public.sync_academic_cycle_active();

create or replace function public.validate_group_active_cycle()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.academic_cycles ac
    where ac.id = new.academic_cycle_id
      and ac.status = 'active'
  ) then
    raise exception 'Solo se pueden crear grupos en el ciclo escolar activo.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_group_active_cycle on public.groups;
create trigger validate_group_active_cycle
before insert or update of academic_cycle_id on public.groups
for each row execute function public.validate_group_active_cycle();

commit;
