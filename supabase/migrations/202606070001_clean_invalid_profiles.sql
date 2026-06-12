begin;

delete from public.class_requirements
where profile_code is null
   or upper(replace(profile_code, ' ', '')) in ('NAN', 'NULL', 'UNDEFINED')
   or upper(profile_code) like '%#REF%'
   or upper(profile_code) like '%#ERROR%';

delete from public.teacher_available_profiles
where profile_code is null
   or upper(replace(profile_code, ' ', '')) in ('NAN', 'NULL', 'UNDEFINED')
   or upper(profile_code) like '%#REF%'
   or upper(profile_code) like '%#ERROR%';

update public.group_subjects
set required_profile_code = null
where required_profile_code is not null
  and (
    upper(replace(required_profile_code, ' ', '')) in ('NAN', 'NULL', 'UNDEFINED')
    or upper(required_profile_code) like '%#REF%'
    or upper(required_profile_code) like '%#ERROR%'
  );

delete from public.teacher_profiles
where code is null
   or upper(replace(code, ' ', '')) in ('NAN', 'NULL', 'UNDEFINED')
   or upper(code) like '%#REF%'
   or upper(code) like '%#ERROR%';

commit;
