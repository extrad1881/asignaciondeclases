begin;

create or replace function public.check_group_subject_hours(target_group_id uuid)
returns table(
  group_subject_id uuid,
  subject_name text,
  hours_per_week numeric,
  assigned_hours numeric,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gs.id,
    coalesce(s.name, 'Materia externa'),
    gs.hours_per_week,
    coalesce(sum(a.duration_hours), 0),
    case
      when coalesce(sum(a.duration_hours), 0) = 0 then 'sin_asignar'
      when coalesce(sum(a.duration_hours), 0) < gs.hours_per_week then 'incompleta'
      when coalesce(sum(a.duration_hours), 0) > gs.hours_per_week then 'excedida'
      else 'completa'
    end
  from public.group_subjects gs
  left join public.subjects s on s.id = gs.subject_id
  left join public.assignments a on a.group_subject_id = gs.id and a.status = 'active'
  where gs.group_id = target_group_id
    and gs.status = 'active'
  group by gs.id, s.name, gs.hours_per_week
  order by s.name;
$$;

revoke all on function public.check_group_subject_hours(uuid) from public;
grant execute on function public.check_group_subject_hours(uuid) to authenticated, service_role;

commit;
