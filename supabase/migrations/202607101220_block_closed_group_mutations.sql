begin;

create or replace function public.enforce_group_editable_for_assignments()
returns trigger
language plpgsql
as $$
declare
  target_group_id uuid;
  target_status text;
begin
  if current_user in ('postgres', 'supabase_admin') then
    return coalesce(new, old);
  end if;

  select gs.group_id, g.status
  into target_group_id, target_status
  from public.group_subjects gs
  join public.groups g on g.id = gs.group_id
  where gs.id = coalesce(new.group_subject_id, old.group_subject_id);

  if target_group_id is null then
    raise exception 'La asignación está incompleta.';
  end if;

  if target_status in ('final', 'archived') then
    raise exception 'El grupo está finalizado o archivado y es de solo lectura.';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.enforce_group_editable_for_group_subjects()
returns trigger
language plpgsql
as $$
declare
  target_status text;
begin
  if current_user in ('postgres', 'supabase_admin') then
    return coalesce(new, old);
  end if;

  select g.status
  into target_status
  from public.groups g
  where g.id = coalesce(new.group_id, old.group_id);

  if target_status in ('final', 'archived') then
    raise exception 'El grupo está finalizado o archivado y es de solo lectura.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists enforce_group_editable_for_assignments on public.assignments;
create trigger enforce_group_editable_for_assignments
before insert or update or delete on public.assignments
for each row execute function public.enforce_group_editable_for_assignments();

drop trigger if exists enforce_group_editable_for_group_subjects on public.group_subjects;
create trigger enforce_group_editable_for_group_subjects
before insert or update or delete on public.group_subjects
for each row execute function public.enforce_group_editable_for_group_subjects();

commit;
