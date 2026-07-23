begin;

-- Sabatino y virtual se imparten en dos periodos consecutivos del ciclo.
-- Las mismas franjas horarias existen en Módulo 1 y Módulo 2 porque no
-- representan clases simultáneas.
with
slot_patterns(template_code, starts_at, ends_at, position) as (
  values
    ('virtual-modular-matutino', '08:00'::time, '09:30'::time, 1),
    ('virtual-modular-matutino', '10:00'::time, '11:30'::time, 2),
    ('virtual-modular-matutino', '11:30'::time, '13:00'::time, 3),
    ('sabatino-matutino', '08:00'::time, '09:30'::time, 1),
    ('sabatino-matutino', '10:00'::time, '11:30'::time, 2),
    ('sabatino-matutino', '11:30'::time, '13:00'::time, 3),
    ('sabatino-vespertino', '14:00'::time, '15:30'::time, 1),
    ('sabatino-vespertino', '16:00'::time, '17:30'::time, 2),
    ('sabatino-vespertino', '17:30'::time, '19:00'::time, 3)
),
modules(module) as (
  values (1), (2)
),
desired as (
  select
    sp.template_code,
    sp.starts_at,
    sp.ends_at,
    sp.position,
    modules.module
  from slot_patterns sp
  cross join modules
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
  6,
  desired.starts_at,
  desired.ends_at,
  'SAB M' || desired.module || ' ' ||
    to_char(desired.starts_at, 'HH24:MI') || ' - ' ||
    to_char(desired.ends_at, 'HH24:MI'),
  (desired.module * 100) + desired.position,
  true,
  false,
  desired.module
from desired
join public.schedule_templates st on st.code = desired.template_code
on conflict on constraint schedule_blocks_unique_times_per_module do update
set label = excluded.label,
    position = excluded.position,
    active = true,
    is_custom = false,
    updated_at = now();

-- Cualquier asignación creada mientras solo estuvo disponible el bloque neutro
-- se conserva y se vincula a Módulo 1. Desde la UI podrá moverse a Módulo 2 si
-- corresponde, sin dejar referencias hacia un bloque inactivo.
update public.assignments assignment
set schedule_block_id = module_one.id
from public.schedule_blocks neutral
join public.schedule_templates template on template.id = neutral.template_id
join public.schedule_blocks module_one
  on module_one.template_id = neutral.template_id
 and module_one.day_of_week = neutral.day_of_week
 and module_one.starts_at = neutral.starts_at
 and module_one.ends_at = neutral.ends_at
 and module_one.module = 1
 and module_one.active = true
where assignment.schedule_block_id = neutral.id
  and neutral.module = 0
  and coalesce(neutral.is_custom, false) = false
  and template.code in (
    'virtual-modular-matutino',
    'sabatino-matutino',
    'sabatino-vespertino'
  );

-- Solo quedan activos los seis bloques base (tres por cada módulo). Los bloques
-- personalizados se conservan y no se modifican.
with
slot_patterns(template_code, starts_at, ends_at) as (
  values
    ('virtual-modular-matutino', '08:00'::time, '09:30'::time),
    ('virtual-modular-matutino', '10:00'::time, '11:30'::time),
    ('virtual-modular-matutino', '11:30'::time, '13:00'::time),
    ('sabatino-matutino', '08:00'::time, '09:30'::time),
    ('sabatino-matutino', '10:00'::time, '11:30'::time),
    ('sabatino-matutino', '11:30'::time, '13:00'::time),
    ('sabatino-vespertino', '14:00'::time, '15:30'::time),
    ('sabatino-vespertino', '16:00'::time, '17:30'::time),
    ('sabatino-vespertino', '17:30'::time, '19:00'::time)
),
modules(module) as (
  values (1), (2)
),
desired as (
  select sp.template_code, sp.starts_at, sp.ends_at, modules.module
  from slot_patterns sp
  cross join modules
)
update public.schedule_blocks block
set active = false,
    updated_at = now()
from public.schedule_templates template
where block.template_id = template.id
  and coalesce(block.is_custom, false) = false
  and template.code in (
    'virtual-modular-matutino',
    'sabatino-matutino',
    'sabatino-vespertino'
  )
  and not exists (
    select 1
    from desired
    where desired.template_code = template.code
      and block.day_of_week = 6
      and desired.starts_at = block.starts_at
      and desired.ends_at = block.ends_at
      and desired.module = block.module
  );

create or replace function public.validate_custom_schedule_block_module()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  template_modality text;
begin
  if not coalesce(new.is_custom, false) then
    return new;
  end if;

  select modality
  into template_modality
  from public.schedule_templates
  where id = new.template_id;

  if template_modality is null then
    raise exception 'El cuadro de horario seleccionado no existe.';
  end if;

  if template_modality in ('sabatino', 'virtual_modular') then
    if new.module not in (1, 2) then
      raise exception 'Los bloques personalizados sabatinos y virtuales deben pertenecer a Módulo 1 o Módulo 2.';
    end if;
  elsif new.module <> 0 then
    raise exception 'Esta modalidad no utiliza módulos.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_custom_schedule_block_module
  on public.schedule_blocks;
create trigger validate_custom_schedule_block_module
before insert or update of template_id, is_custom, module
on public.schedule_blocks
for each row
execute function public.validate_custom_schedule_block_module();

commit;
