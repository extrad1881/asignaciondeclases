begin;

-- Schema-only: add module column and update unique constraint

alter table public.schedule_blocks
  add column if not exists module integer not null default 0;

-- Drop old unique constraint (template_id, day_of_week, starts_at, ends_at)
do $$
declare
  cn text;
begin
  select con.conname into cn
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute a1 on a1.attrelid = rel.oid and a1.attnum = con.conkey[1]
  join pg_attribute a2 on a2.attrelid = rel.oid and a2.attnum = con.conkey[2]
  join pg_attribute a3 on a3.attrelid = rel.oid and a3.attnum = con.conkey[3]
  join pg_attribute a4 on a4.attrelid = rel.oid and a4.attnum = con.conkey[4]
  where rel.relname = 'schedule_blocks'
    and con.contype = 'u'
    and array_length(con.conkey, 1) = 4
    and a1.attname = 'template_id'
    and a2.attname = 'day_of_week'
    and a3.attname = 'starts_at'
    and a4.attname = 'ends_at';

  if cn is not null then
    execute 'alter table public.schedule_blocks drop constraint ' || cn;
  end if;
end;
$$;

alter table public.schedule_blocks
  add constraint schedule_blocks_unique_slot
  unique (template_id, day_of_week, starts_at, ends_at, module);

commit;
