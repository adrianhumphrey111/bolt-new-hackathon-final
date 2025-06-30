drop trigger if exists "update_renders_updated_at" on "public"."renders";

drop policy "Users can create their own exports" on "public"."exports";

drop policy "Users can view their own exports" on "public"."exports";

drop policy "Users can create their own renders" on "public"."renders";

drop policy "Users can update their own renders" on "public"."renders";

drop policy "Users can view their own renders" on "public"."renders";

revoke delete on table "public"."exports" from "anon";

revoke insert on table "public"."exports" from "anon";

revoke references on table "public"."exports" from "anon";

revoke select on table "public"."exports" from "anon";

revoke trigger on table "public"."exports" from "anon";

revoke truncate on table "public"."exports" from "anon";

revoke update on table "public"."exports" from "anon";

revoke delete on table "public"."exports" from "authenticated";

revoke insert on table "public"."exports" from "authenticated";

revoke references on table "public"."exports" from "authenticated";

revoke select on table "public"."exports" from "authenticated";

revoke trigger on table "public"."exports" from "authenticated";

revoke truncate on table "public"."exports" from "authenticated";

revoke update on table "public"."exports" from "authenticated";

revoke delete on table "public"."exports" from "service_role";

revoke insert on table "public"."exports" from "service_role";

revoke references on table "public"."exports" from "service_role";

revoke select on table "public"."exports" from "service_role";

revoke trigger on table "public"."exports" from "service_role";

revoke truncate on table "public"."exports" from "service_role";

revoke update on table "public"."exports" from "service_role";

revoke delete on table "public"."renders" from "anon";

revoke insert on table "public"."renders" from "anon";

revoke references on table "public"."renders" from "anon";

revoke select on table "public"."renders" from "anon";

revoke trigger on table "public"."renders" from "anon";

revoke truncate on table "public"."renders" from "anon";

revoke update on table "public"."renders" from "anon";

revoke delete on table "public"."renders" from "authenticated";

revoke insert on table "public"."renders" from "authenticated";

revoke references on table "public"."renders" from "authenticated";

revoke select on table "public"."renders" from "authenticated";

revoke trigger on table "public"."renders" from "authenticated";

revoke truncate on table "public"."renders" from "authenticated";

revoke update on table "public"."renders" from "authenticated";

revoke delete on table "public"."renders" from "service_role";

revoke insert on table "public"."renders" from "service_role";

revoke references on table "public"."renders" from "service_role";

revoke select on table "public"."renders" from "service_role";

revoke trigger on table "public"."renders" from "service_role";

revoke truncate on table "public"."renders" from "service_role";

revoke update on table "public"."renders" from "service_role";

alter table "public"."exports" drop constraint "exports_export_type_check";

alter table "public"."exports" drop constraint "exports_project_id_fkey";

alter table "public"."exports" drop constraint "exports_render_id_fkey";

alter table "public"."exports" drop constraint "exports_user_id_fkey";

alter table "public"."renders" drop constraint "renders_project_id_fkey";

alter table "public"."renders" drop constraint "renders_status_check";

alter table "public"."renders" drop constraint "renders_user_id_fkey";

alter table "public"."video_analysis" drop constraint "video_analysis_blueprint_id_fkey";

alter table "public"."video_analysis" drop constraint "video_analysis_video_id_blueprint_id_key";

drop view if exists "public"."user_usage_stats";

drop view if exists "public"."shot_list_with_video_details";

alter table "public"."exports" drop constraint "exports_pkey";

alter table "public"."renders" drop constraint "renders_pkey";

drop index if exists "public"."exports_pkey";

drop index if exists "public"."idx_exports_created_at";

drop index if exists "public"."idx_exports_project_id";

drop index if exists "public"."idx_exports_render_id";

drop index if exists "public"."idx_exports_user_id";

drop index if exists "public"."idx_renders_created_at";

drop index if exists "public"."idx_renders_project_id";

drop index if exists "public"."idx_renders_status";

drop index if exists "public"."idx_renders_user_id";

drop index if exists "public"."idx_videos_file_sizes";

drop index if exists "public"."renders_pkey";

drop index if exists "public"."video_analysis_video_id_blueprint_id_key";

drop table "public"."exports";

drop table "public"."renders";

alter table "public"."video_analysis" drop column "analysis_result_path";

alter table "public"."video_analysis" drop column "blueprint_id";

alter table "public"."video_analysis" drop column "processed_video_path";

alter table "public"."video_analysis" drop column "raw_video_path";

alter table "public"."videos" drop column "file_size_bytes";

alter table "public"."videos" drop column "processed_file_size_bytes";

CREATE UNIQUE INDEX idx_timeline_configurations_active_per_project ON public.timeline_configurations USING btree (project_id) WHERE (is_active = true);

set check_function_bodies = off;

create or replace view "public"."shot_list_with_video_details" as  SELECT sli.id,
    sli.edl_generation_job_id,
    sli.project_id,
    sli.video_id,
    sli.shot_number,
    sli.chunk_id,
    sli.script_segment_id,
    sli.file_name,
    sli.file_path,
    sli.s3_location,
    sli.start_time,
    sli.end_time,
    sli.duration,
    sli.timeline_start,
    sli.timeline_order,
    sli.content_preview,
    sli.narrative_purpose,
    sli.cut_reasoning,
    sli.quality_notes,
    sli.match_type,
    sli.match_confidence,
    sli.match_reasoning,
    sli.transition_in,
    sli.transition_out,
    sli.created_at,
    sli.updated_at,
    v.original_name AS video_original_name,
    v.duration AS video_total_duration,
    v.created_at AS video_upload_date,
    egj.user_intent,
    egj.status AS job_status,
    egj.completed_at AS job_completed_at
   FROM ((shot_list_items sli
     JOIN videos v ON ((sli.video_id = v.id)))
     JOIN edl_generation_jobs egj ON ((sli.edl_generation_job_id = egj.id)))
  ORDER BY sli.timeline_order;


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

create policy "Users can access their own EDL generation steps"
on "public"."edl_generation_steps"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM edl_generation_jobs
  WHERE ((edl_generation_jobs.id = edl_generation_steps.job_id) AND (edl_generation_jobs.user_id = auth.uid())))));



