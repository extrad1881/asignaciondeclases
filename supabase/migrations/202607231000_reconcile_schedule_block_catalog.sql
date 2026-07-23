begin;

-- Los bloques operativos se reducen a tres franjas por jornada. Maestrías y
-- los bloques personalizados no se modifican.
with
slot_patterns(template_code, starts_at, ends_at, position, saturday_only) as (
  values
    ('escolarizado-matutino', '08:00'::time, '09:30'::time, 1, false),
    ('escolarizado-matutino', '10:00'::time, '11:30'::time, 2, false),
    ('escolarizado-matutino', '11:30'::time, '13:00'::time, 3, false),
    ('escolarizado-vespertino', '15:00'::time, '16:30'::time, 1, false),
    ('escolarizado-vespertino', '17:00'::time, '18:30'::time, 2, false),
    ('escolarizado-vespertino', '18:30'::time, '20:00'::time, 3, false),
    ('modular-matutino', '08:00'::time, '09:30'::time, 1, false),
    ('modular-matutino', '10:00'::time, '11:30'::time, 2, false),
    ('modular-matutino', '11:30'::time, '13:00'::time, 3, false),
    ('modular-vespertino', '14:00'::time, '15:30'::time, 1, false),
    ('modular-vespertino', '16:00'::time, '17:30'::time, 2, false),
    ('modular-vespertino', '17:30'::time, '19:00'::time, 3, false),
    ('virtual-modular-matutino', '08:00'::time, '09:30'::time, 1, true),
    ('virtual-modular-matutino', '10:00'::time, '11:30'::time, 2, true),
    ('virtual-modular-matutino', '11:30'::time, '13:00'::time, 3, true),
    ('sabatino-matutino', '08:00'::time, '09:30'::time, 1, true),
    ('sabatino-matutino', '10:00'::time, '11:30'::time, 2, true),
    ('sabatino-matutino', '11:30'::time, '13:00'::time, 3, true),
    ('sabatino-vespertino', '14:00'::time, '15:30'::time, 1, true),
    ('sabatino-vespertino', '16:00'::time, '17:30'::time, 2, true),
    ('sabatino-vespertino', '17:30'::time, '19:00'::time, 3, true)
),
days(day_of_week, day_label) as (
  values
    (1, 'LUN'),
    (2, 'MAR'),
    (3, 'MIE'),
    (4, 'JUE'),
    (5, 'VIE'),
    (6, 'SAB')
),
desired as (
  select
    sp.template_code,
    d.day_of_week,
    sp.starts_at,
    sp.ends_at,
    d.day_label || ' ' || to_char(sp.starts_at, 'HH24:MI') || ' - ' ||
      to_char(sp.ends_at, 'HH24:MI') as label,
    sp.position
  from slot_patterns sp
  join days d
    on (sp.saturday_only and d.day_of_week = 6)
    or (not sp.saturday_only and d.day_of_week between 1 and 5)
)
insert into public.schedule_blocks (
  template_id,
  day_of_week,
  starts_at,
  ends_at,
  label,
  position,
  active,
  is_custom,
  module
)
select
  st.id,
  desired.day_of_week,
  desired.starts_at,
  desired.ends_at,
  desired.label,
  desired.position,
  true,
  false,
  0
from desired
join public.schedule_templates st on st.code = desired.template_code
on conflict on constraint schedule_blocks_unique_times_per_module do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

-- Los bloques escolares y modulares anteriores representaban las mismas
-- franjas con module 1/2/3. Se conservan las asignaciones apuntándolas al
-- bloque canónico sin módulo.
update public.assignments a
set schedule_block_id = canonical.id
from public.schedule_blocks previous
join public.schedule_templates st on st.id = previous.template_id
join public.schedule_blocks canonical
  on canonical.template_id = previous.template_id
 and canonical.day_of_week = previous.day_of_week
 and canonical.starts_at = previous.starts_at
 and canonical.ends_at = previous.ends_at
 and canonical.module = 0
where a.schedule_block_id = previous.id
  and previous.id <> canonical.id
  and coalesce(previous.is_custom, false) = false
  and st.code in (
    'escolarizado-matutino',
    'escolarizado-vespertino',
    'modular-matutino',
    'modular-vespertino'
  );

with
slot_patterns(template_code, starts_at, ends_at, saturday_only) as (
  values
    ('escolarizado-matutino', '08:00'::time, '09:30'::time, false),
    ('escolarizado-matutino', '10:00'::time, '11:30'::time, false),
    ('escolarizado-matutino', '11:30'::time, '13:00'::time, false),
    ('escolarizado-vespertino', '15:00'::time, '16:30'::time, false),
    ('escolarizado-vespertino', '17:00'::time, '18:30'::time, false),
    ('escolarizado-vespertino', '18:30'::time, '20:00'::time, false),
    ('modular-matutino', '08:00'::time, '09:30'::time, false),
    ('modular-matutino', '10:00'::time, '11:30'::time, false),
    ('modular-matutino', '11:30'::time, '13:00'::time, false),
    ('modular-vespertino', '14:00'::time, '15:30'::time, false),
    ('modular-vespertino', '16:00'::time, '17:30'::time, false),
    ('modular-vespertino', '17:30'::time, '19:00'::time, false),
    ('virtual-modular-matutino', '08:00'::time, '09:30'::time, true),
    ('virtual-modular-matutino', '10:00'::time, '11:30'::time, true),
    ('virtual-modular-matutino', '11:30'::time, '13:00'::time, true),
    ('sabatino-matutino', '08:00'::time, '09:30'::time, true),
    ('sabatino-matutino', '10:00'::time, '11:30'::time, true),
    ('sabatino-matutino', '11:30'::time, '13:00'::time, true),
    ('sabatino-vespertino', '14:00'::time, '15:30'::time, true),
    ('sabatino-vespertino', '16:00'::time, '17:30'::time, true),
    ('sabatino-vespertino', '17:30'::time, '19:00'::time, true)
),
desired as (
  select
    sp.template_code,
    d.day_of_week,
    sp.starts_at,
    sp.ends_at
  from slot_patterns sp
  cross join generate_series(1, 6) as d(day_of_week)
  where (sp.saturday_only and d.day_of_week = 6)
     or (not sp.saturday_only and d.day_of_week between 1 and 5)
)
update public.schedule_blocks sb
set active = false,
    updated_at = now()
from public.schedule_templates st
where sb.template_id = st.id
  and coalesce(sb.is_custom, false) = false
  and st.code in (
    'escolarizado-matutino',
    'escolarizado-vespertino',
    'modular-matutino',
    'modular-vespertino',
    'virtual-modular-matutino',
    'sabatino-matutino',
    'sabatino-vespertino'
  )
  and not exists (
    select 1
    from desired
    where desired.template_code = st.code
      and desired.day_of_week = sb.day_of_week
      and desired.starts_at = sb.starts_at
      and desired.ends_at = sb.ends_at
      and sb.module = 0
  );

commit;
