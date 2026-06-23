alter table "public"."groups" drop constraint "groups_modality_check";

alter table "public"."schedule_templates" drop constraint "schedule_templates_modality_check";

CREATE UNIQUE INDEX schedule_blocks_unique_times_per_module ON public.schedule_blocks USING btree (template_id, day_of_week, module, starts_at, ends_at);

alter table "public"."schedule_blocks" add constraint "schedule_blocks_unique_times_per_module" UNIQUE using index "schedule_blocks_unique_times_per_module";

alter table "public"."groups" add constraint "groups_modality_check" CHECK ((modality = ANY (ARRAY['escolarizado'::text, 'modular'::text, 'virtual_modular'::text, 'maestrias'::text, 'sabatino'::text]))) not valid;

alter table "public"."groups" validate constraint "groups_modality_check";

alter table "public"."schedule_templates" add constraint "schedule_templates_modality_check" CHECK ((modality = ANY (ARRAY['escolarizado'::text, 'modular'::text, 'virtual_modular'::text, 'maestrias'::text, 'sabatino'::text]))) not valid;

alter table "public"."schedule_templates" validate constraint "schedule_templates_modality_check";


