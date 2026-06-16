insert into public.roles (code, name, description)
values
  ('admin', 'Administrador', 'Acceso total al sistema.'),
  ('coordinator', 'Coordinador', 'Acceso limitado a carreras y docentes asignados.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.teacher_profiles (code, name)
values
  ('ADEM', 'Administración de Empresas'),
  ('ADETUR', 'Administración de Empresas Turísticas'),
  ('ARQ', 'Arquitectura'),
  ('CINTER', 'Comercio Internacional'),
  ('CONPUB', 'Contaduría Pública'),
  ('CRIMYCRI', 'Criminología y Criminalística'),
  ('DE', 'Derecho'),
  ('DIGRAF', 'Diseño Gráfico'),
  ('ENF', 'Enfermería'),
  ('MERC', 'Mercadotecnia'),
  ('NUT', 'Nutrición'),
  ('PED', 'Pedagogía'),
  ('PSIC', 'Psicología'),
  ('SISCOM', 'Ingeniería en Sistemas'),
  ('TRA', 'Transversal')
on conflict (code) do update set name = excluded.name;

insert into public.academic_cycles (code, name, active)
values
  ('26-1', 'Ciclo escolar 26-1', true),
  ('26-2', 'Ciclo escolar 26-2', false),
  ('26-3', 'Ciclo escolar 26-3', false)
on conflict (code) do update set name = excluded.name, active = excluded.active;

insert into public.classrooms (name, capacity, kind)
select aula::text, null, 'Aula'
from (
  select generate_series(1, 30) as aula
  union all
  select generate_series(101, 116) as aula
) rooms
on conflict (name) do nothing;

insert into public.schedule_templates (code, label, modality, shift, starts_at, ends_at, asset_path)
values
  ('escolarizado-matutino', 'Escolarizado matutino', 'escolarizado', 'matutino', '08:00', '13:00', '/schedule-assets/CUADRO ESCOLARIZADO.png'),
  ('escolarizado-vespertino', 'Escolarizado vespertino', 'escolarizado', 'vespertino', '15:00', '20:00', '/schedule-assets/CUADRO ESCOLARIZADO VESPERTINO.png'),
  ('modular-matutino', 'Modular matutino', 'modular', 'matutino', '08:00', '13:00', '/schedule-assets/CUADRO MODULAR.png'),
  ('modular-vespertino', 'Modular vespertino', 'modular', 'vespertino', '14:00', '19:00', '/schedule-assets/CUADRO MODULAR VESPERTINO.png'),
  ('virtual-modular-matutino', 'Virtual modular matutino', 'virtual_modular', 'matutino', '08:00', '13:00', '/schedule-assets/CUADRO MODULAR VIRTUAL.png'),
  ('maestrias-vespertino', 'Maestrías', 'maestrias', 'vespertino', '14:30', '19:00', '/schedule-assets/CUADRO MAESTRIAS.png')
on conflict (code) do update
set label = excluded.label,
    modality = excluded.modality,
    shift = excluded.shift,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    asset_path = excluded.asset_path,
    active = true;

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
    ('escolarizado-vespertino', '15:00'::time, '16:30'::time, 1),
    ('escolarizado-vespertino', '17:00'::time, '18:30'::time, 2),
    ('escolarizado-vespertino', '18:30'::time, '20:00'::time, 3)
)
insert into public.schedule_blocks (template_id, day_of_week, starts_at, ends_at, label, position, module)
select
  st.id,
  d.day_of_week,
  b.starts_at,
  b.ends_at,
  d.day_label || ' ' || to_char(b.starts_at, 'HH24:MI') || '-' || to_char(b.ends_at, 'HH24:MI'),
  b.position,
  0
from blocks b
join public.schedule_templates st on st.code = b.template_code
cross join days d
on conflict (template_id, day_of_week, starts_at, ends_at, module) do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

-- Modular blocks: Saturday only, Module 1 (matutino + virtual)
with mod_m1(template_code, starts_at, ends_at, position) as (
  values
    ('modular-matutino', '08:00'::time, '09:30'::time, 1),
    ('modular-matutino', '10:00'::time, '11:30'::time, 2),
    ('modular-matutino', '11:30'::time, '13:00'::time, 3),
    ('virtual-modular-matutino', '08:00'::time, '09:30'::time, 1),
    ('virtual-modular-matutino', '10:00'::time, '11:30'::time, 2),
    ('virtual-modular-matutino', '11:30'::time, '13:00'::time, 3),
    ('modular-vespertino', '14:00'::time, '15:30'::time, 1),
    ('modular-vespertino', '16:00'::time, '17:30'::time, 2),
    ('modular-vespertino', '17:30'::time, '19:00'::time, 3)
)
insert into public.schedule_blocks (template_id, day_of_week, starts_at, ends_at, label, position, module)
select
  st.id,
  6,
  m.starts_at,
  m.ends_at,
  'SAB M1 ' || to_char(m.starts_at, 'HH24:MI') || '-' || to_char(m.ends_at, 'HH24:MI'),
  m.position,
  1
from mod_m1 m
join public.schedule_templates st on st.code = m.template_code
on conflict (template_id, day_of_week, starts_at, ends_at, module) do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

-- Modular blocks: Saturday only, Module 2 (matutino + virtual)
with mod_m2(template_code, starts_at, ends_at, position) as (
  values
    ('modular-matutino', '08:00'::time, '09:30'::time, 1),
    ('modular-matutino', '10:00'::time, '11:30'::time, 2),
    ('modular-matutino', '11:30'::time, '13:00'::time, 3),
    ('virtual-modular-matutino', '08:00'::time, '09:30'::time, 1),
    ('virtual-modular-matutino', '10:00'::time, '11:30'::time, 2),
    ('virtual-modular-matutino', '11:30'::time, '13:00'::time, 3),
    ('modular-vespertino', '14:00'::time, '15:30'::time, 1),
    ('modular-vespertino', '16:00'::time, '17:30'::time, 2),
    ('modular-vespertino', '17:30'::time, '19:00'::time, 3)
)
insert into public.schedule_blocks (template_id, day_of_week, starts_at, ends_at, label, position, module)
select
  st.id,
  6,
  m.starts_at,
  m.ends_at,
  'SAB M2 ' || to_char(m.starts_at, 'HH24:MI') || '-' || to_char(m.ends_at, 'HH24:MI'),
  m.position,
  2
from mod_m2 m
join public.schedule_templates st on st.code = m.template_code
on conflict (template_id, day_of_week, starts_at, ends_at, module) do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

with master_blocks(starts_at, ends_at, position) as (
  values
    ('14:30'::time, '16:30'::time, 1),
    ('17:00'::time, '19:00'::time, 2)
)
insert into public.schedule_blocks (template_id, day_of_week, starts_at, ends_at, label, position, module)
select
  st.id,
  6,
  mb.starts_at,
  mb.ends_at,
  'SAB ' || to_char(mb.starts_at, 'HH24:MI') || '-' || to_char(mb.ends_at, 'HH24:MI'),
  mb.position,
  0
from master_blocks mb
join public.schedule_templates st on st.code = 'maestrias-vespertino'
on conflict (template_id, day_of_week, starts_at, ends_at, module) do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  email_change,
  reauthentication_token,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@local.test',
    extensions.crypt('Admin123!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Administrador Local","role_code":"admin"}',
    false
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'coordinador@local.test',
    extensions.crypt('Coord123!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Coordinador Local","role_code":"coordinator"}',
    false
  )
on conflict (id) do update
set encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_token = excluded.confirmation_token,
    recovery_token = excluded.recovery_token,
    email_change_token_new = excluded.email_change_token_new,
    email_change_token_current = excluded.email_change_token_current,
    email_change = excluded.email_change,
    reauthentication_token = excluded.reauthentication_token,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    'admin@local.test',
    '00000000-0000-4000-8000-000000000001',
    '{"sub":"00000000-0000-4000-8000-000000000001","email":"admin@local.test"}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    'coordinador@local.test',
    '00000000-0000-4000-8000-000000000002',
    '{"sub":"00000000-0000-4000-8000-000000000002","email":"coordinador@local.test"}',
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider, provider_id) do update
set identity_data = excluded.identity_data,
    updated_at = now();

insert into public.users_profile (id, email, display_name, role_code)
values
  ('00000000-0000-4000-8000-000000000001', 'admin@local.test', 'Administrador Local', 'admin'),
  ('00000000-0000-4000-8000-000000000002', 'coordinador@local.test', 'Coordinador Local', 'coordinator')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    role_code = excluded.role_code,
    active = true;

insert into public.coordinators (profile_id, name, active)
values
  ('00000000-0000-4000-8000-000000000002', 'SAYAS', true),
  (null, 'ESLIVET', true),
  (null, 'MERIT', true),
  (null, 'ORIANA', true),
  (null, 'ZULMA', true)
on conflict (name) do update
set profile_id = coalesce(public.coordinators.profile_id, excluded.profile_id),
    active = excluded.active;
