begin;

update public.schedule_templates
set label = 'Virtual modular matutino',
    updated_at = now()
where code = 'virtual-modular-matutino'
  and label is distinct from 'Virtual modular matutino';

update public.schedule_templates
set code = 'sabatino-matutino',
    label = 'Sabatino matutino',
    modality = 'sabatino',
    shift = 'matutino',
    updated_at = now()
where id = 'ee6de5d9-384d-4f13-8469-e49c546dfc3d'
   or (code = 'modular-matutino' and modality = 'sabatino');

update public.schedule_templates
set code = 'sabatino-vespertino',
    label = 'Sabatino vespertino',
    modality = 'sabatino',
    shift = 'vespertino',
    updated_at = now()
where id = '20b0f36e-2641-45d5-96d4-9e1d57876fdf'
   or (code = 'modular-vespertino' and modality = 'sabatino');

with existing_data as (
  select exists (select 1 from public.schedule_templates) as has_data
),
templates(id, code, label, modality, shift, starts_at, ends_at, asset_path) as (
  values
    ('ee6de5d9-384d-4f13-8469-e49c546dfc3d'::uuid, 'sabatino-matutino', 'Sabatino matutino', 'sabatino', 'matutino', '08:00'::time, '13:00'::time, '/schedule-assets/CUADRO MODULAR.png'),
    ('20b0f36e-2641-45d5-96d4-9e1d57876fdf'::uuid, 'sabatino-vespertino', 'Sabatino vespertino', 'sabatino', 'vespertino', '14:00'::time, '19:00'::time, '/schedule-assets/CUADRO MODULAR VESPERTINO.png'),
    ('f815bbf0-fcf7-4cc0-a292-2f9bff3df528'::uuid, 'modular-matutino', 'Modular matutino', 'modular', 'matutino', '08:00'::time, '13:00'::time, '/schedule-assets/CUADRO MODULAR.png'),
    ('bd5fc9fa-3f9d-4e10-a982-bddf0497d750'::uuid, 'modular-vespertino', 'Modular vespertino', 'modular', 'vespertino', '14:00'::time, '19:00'::time, '/schedule-assets/CUADRO MODULAR VESPERTINO.png')
)
insert into public.schedule_templates (id, code, label, modality, shift, starts_at, ends_at, asset_path, active)
select templates.id, templates.code, templates.label, templates.modality, templates.shift, templates.starts_at, templates.ends_at, templates.asset_path, true
from templates
cross join existing_data
where existing_data.has_data
on conflict (code) do update
set label = excluded.label,
    modality = excluded.modality,
    shift = excluded.shift,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    asset_path = excluded.asset_path,
    active = true,
    updated_at = now();

with existing_data as (
  select exists (select 1 from public.schedule_templates) as has_data
),
blocks(template_code, day_of_week, starts_at, ends_at, label, position, module) as (
  values
    ('modular-matutino', 1, '08:00'::time, '09:30'::time, 'LUN 08:00-09:30', 1, 0),
    ('modular-matutino', 1, '10:00'::time, '11:30'::time, 'LUN 10:00-11:30', 2, 0),
    ('modular-matutino', 1, '11:30'::time, '13:00'::time, 'LUN 11:30-13:00', 3, 0),
    ('modular-matutino', 2, '08:00'::time, '09:30'::time, 'MAR 08:00-09:30', 1, 0),
    ('modular-matutino', 2, '10:00'::time, '11:30'::time, 'MAR 10:00-11:30', 2, 0),
    ('modular-matutino', 2, '11:30'::time, '13:00'::time, 'MAR 11:30-13:00', 3, 0),
    ('modular-matutino', 3, '08:00'::time, '09:30'::time, 'MIE 08:00-09:30', 1, 0),
    ('modular-matutino', 3, '10:00'::time, '11:30'::time, 'MIE 10:00-11:30', 2, 0),
    ('modular-matutino', 3, '11:30'::time, '13:00'::time, 'MIE 11:30-13:00', 3, 0),
    ('modular-matutino', 4, '08:00'::time, '09:30'::time, 'JUE 08:00-09:30', 1, 0),
    ('modular-matutino', 4, '10:00'::time, '11:30'::time, 'JUE 10:00-11:30', 2, 0),
    ('modular-matutino', 4, '11:30'::time, '13:00'::time, 'JUE 11:30-13:00', 3, 0),
    ('modular-matutino', 5, '08:00'::time, '09:30'::time, 'VIE 08:00-09:30', 1, 0),
    ('modular-matutino', 5, '10:00'::time, '11:30'::time, 'VIE 10:00-11:30', 2, 0),
    ('modular-matutino', 5, '11:30'::time, '13:00'::time, 'VIE 11:30-13:00', 3, 0),
    ('modular-vespertino', 1, '14:00'::time, '15:30'::time, 'LUN 14:00-15:30', 1, 0),
    ('modular-vespertino', 1, '16:00'::time, '17:30'::time, 'LUN 16:00-17:30', 2, 0),
    ('modular-vespertino', 1, '17:30'::time, '19:00'::time, 'LUN 17:30-19:00', 3, 0),
    ('modular-vespertino', 2, '14:00'::time, '15:30'::time, 'MAR 14:00-15:30', 1, 0),
    ('modular-vespertino', 2, '16:00'::time, '17:30'::time, 'MAR 16:00-17:30', 2, 0),
    ('modular-vespertino', 2, '17:30'::time, '19:00'::time, 'MAR 17:30-19:00', 3, 0),
    ('modular-vespertino', 3, '14:00'::time, '15:30'::time, 'MIE 14:00-15:30', 1, 0),
    ('modular-vespertino', 3, '16:00'::time, '17:30'::time, 'MIE 16:00-17:30', 2, 0),
    ('modular-vespertino', 3, '17:30'::time, '19:00'::time, 'MIE 17:30-19:00', 3, 0),
    ('modular-vespertino', 4, '14:00'::time, '15:30'::time, 'JUE 14:00-15:30', 1, 0),
    ('modular-vespertino', 4, '16:00'::time, '17:30'::time, 'JUE 16:00-17:30', 2, 0),
    ('modular-vespertino', 4, '17:30'::time, '19:00'::time, 'JUE 17:30-19:00', 3, 0),
    ('modular-vespertino', 5, '14:00'::time, '15:30'::time, 'VIE 14:00-15:30', 1, 0),
    ('modular-vespertino', 5, '16:00'::time, '17:30'::time, 'VIE 16:00-17:30', 2, 0),
    ('modular-vespertino', 5, '17:30'::time, '19:00'::time, 'VIE 17:30-19:00', 3, 0),
    ('sabatino-matutino', 6, '08:00'::time, '09:30'::time, 'SAB M1 08:00-09:30', 0, 1),
    ('sabatino-matutino', 6, '10:00'::time, '11:30'::time, 'SAB M1 10:00-11:30', 0, 1),
    ('sabatino-matutino', 6, '11:30'::time, '13:00'::time, 'SAB M1 11:30-13:00', 0, 1),
    ('sabatino-matutino', 6, '08:00'::time, '09:30'::time, 'SAB M2 08:00-09:30', 0, 2),
    ('sabatino-matutino', 6, '10:00'::time, '11:30'::time, 'SAB M2 10:00-11:30', 0, 2),
    ('sabatino-matutino', 6, '11:30'::time, '13:00'::time, 'SAB M2 11:30-13:00', 0, 2),
    ('sabatino-vespertino', 6, '14:00'::time, '15:30'::time, 'SAB M1 14:00-15:30', 0, 1),
    ('sabatino-vespertino', 6, '16:00'::time, '17:30'::time, 'SAB M1 16:00-17:30', 0, 1),
    ('sabatino-vespertino', 6, '17:30'::time, '19:00'::time, 'SAB M1 17:30-19:00', 0, 1),
    ('sabatino-vespertino', 6, '14:00'::time, '15:30'::time, 'SAB M2 14:00-15:30', 0, 2),
    ('sabatino-vespertino', 6, '16:00'::time, '17:30'::time, 'SAB M2 16:00-17:30', 0, 2),
    ('sabatino-vespertino', 6, '17:30'::time, '19:00'::time, 'SAB M2 17:30-19:00', 0, 2)
)
insert into public.schedule_blocks (template_id, day_of_week, starts_at, ends_at, label, position, active, is_custom, module)
select st.id, blocks.day_of_week, blocks.starts_at, blocks.ends_at, blocks.label, blocks.position, true, false, blocks.module
from blocks
join public.schedule_templates st on st.code = blocks.template_code
cross join existing_data
where existing_data.has_data
on conflict on constraint schedule_blocks_unique_times_per_module do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

commit;
