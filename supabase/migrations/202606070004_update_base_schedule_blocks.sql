begin;

update public.schedule_blocks sb
set active = false
from public.schedule_templates st
where sb.template_id = st.id
  and coalesce(sb.is_custom, false) = false
  and st.code in (
    'escolarizado-matutino',
    'escolarizado-vespertino',
    'modular-matutino',
    'modular-vespertino',
    'virtual-modular-matutino',
    'maestrias-vespertino'
  );

with days(day_of_week, day_label) as (
  values (1, 'LUN'), (2, 'MAR'), (3, 'MIE'), (4, 'JUE'), (5, 'VIE')
),
blocks(template_code, starts_at, ends_at, position) as (
  values
    ('escolarizado-matutino', '08:00'::time, '09:30'::time, 1),
    ('escolarizado-matutino', '10:00'::time, '11:30'::time, 2),
    ('escolarizado-matutino', '11:30'::time, '13:00'::time, 3),
    ('modular-matutino', '08:00'::time, '09:30'::time, 1),
    ('modular-matutino', '10:00'::time, '11:30'::time, 2),
    ('modular-matutino', '11:30'::time, '13:00'::time, 3),
    ('virtual-modular-matutino', '08:00'::time, '09:30'::time, 1),
    ('virtual-modular-matutino', '10:00'::time, '11:30'::time, 2),
    ('virtual-modular-matutino', '11:30'::time, '13:00'::time, 3),
    ('escolarizado-vespertino', '15:00'::time, '16:30'::time, 1),
    ('escolarizado-vespertino', '17:00'::time, '18:30'::time, 2),
    ('escolarizado-vespertino', '18:30'::time, '20:00'::time, 3),
    ('modular-vespertino', '14:00'::time, '15:30'::time, 1),
    ('modular-vespertino', '16:00'::time, '17:30'::time, 2),
    ('modular-vespertino', '17:30'::time, '19:00'::time, 3)
)
insert into public.schedule_blocks (template_id, day_of_week, starts_at, ends_at, label, position, active, is_custom)
select
  st.id,
  d.day_of_week,
  b.starts_at,
  b.ends_at,
  d.day_label || ' ' || to_char(b.starts_at, 'HH24:MI') || '-' || to_char(b.ends_at, 'HH24:MI'),
  b.position,
  true,
  false
from blocks b
join public.schedule_templates st on st.code = b.template_code
cross join days d
on conflict (template_id, day_of_week, starts_at, ends_at) do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

with master_blocks(starts_at, ends_at, position) as (
  values
    ('14:30'::time, '16:30'::time, 1),
    ('17:00'::time, '19:00'::time, 2)
)
insert into public.schedule_blocks (template_id, day_of_week, starts_at, ends_at, label, position, active, is_custom)
select
  st.id,
  6,
  mb.starts_at,
  mb.ends_at,
  'SAB ' || to_char(mb.starts_at, 'HH24:MI') || '-' || to_char(mb.ends_at, 'HH24:MI'),
  mb.position,
  true,
  false
from master_blocks mb
join public.schedule_templates st on st.code = 'maestrias-vespertino'
on conflict (template_id, day_of_week, starts_at, ends_at) do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

commit;
