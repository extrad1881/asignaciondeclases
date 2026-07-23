begin;

drop trigger if exists audit_classrooms on public.classrooms;
create trigger audit_classrooms
after insert or update or delete on public.classrooms
for each row execute function public.audit_row_changes();

commit;
