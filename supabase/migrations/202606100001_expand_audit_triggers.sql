begin;

drop trigger if exists audit_users_profile on public.users_profile;
create trigger audit_users_profile
after insert or update or delete on public.users_profile
for each row execute function public.audit_row_changes();

drop trigger if exists audit_coordinators on public.coordinators;
create trigger audit_coordinators
after insert or update or delete on public.coordinators
for each row execute function public.audit_row_changes();

drop trigger if exists audit_subjects on public.subjects;
create trigger audit_subjects
after insert or update or delete on public.subjects
for each row execute function public.audit_row_changes();

drop trigger if exists audit_teachers on public.teachers;
create trigger audit_teachers
after insert or update or delete on public.teachers
for each row execute function public.audit_row_changes();

commit;
