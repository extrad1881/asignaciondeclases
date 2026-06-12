begin;

drop policy if exists "schedule_blocks_select" on public.schedule_blocks;

create policy "schedule_blocks_select"
on public.schedule_blocks
for select
to authenticated
using (
  coalesce(is_custom, false) = false
  or public.is_admin()
  or created_by = auth.uid()
);

commit;
