"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedProfile } from "@/lib/supabase/auth-helpers";
import { timeToMinutes } from "@/app/(dashboard)/actions/utils";
import { WEEKDAYS } from "@/lib/constants";

const customScheduleBlockSchema = z.object({
  group_id: z.string().uuid(),
  day_of_week: z.coerce.number().int().min(1).max(6),
  starts_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa formato HH:MM."),
  ends_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa formato HH:MM.")
});

export async function createCustomScheduleBlockAction(formData: FormData) {
  const { supabase, profile } = await requireAuthenticatedProfile();
  const parsed = customScheduleBlockSchema.safeParse({
    group_id: formData.get("group_id"),
    day_of_week: formData.get("day_of_week"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  if (profile.role_code !== "admin" && profile.role_code !== "coordinator") {
    throw new Error("No tienes permiso para crear bloques personalizados.");
  }

  const startsAt = parsed.data.starts_at;
  const endsAt = parsed.data.ends_at;
  const startsAtMinutes = timeToMinutes(startsAt);
  const endsAtMinutes = timeToMinutes(endsAt);

  if (endsAtMinutes <= startsAtMinutes) {
    throw new Error("La hora final debe ser posterior a la hora inicial.");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, modality, shift")
    .eq("id", parsed.data.group_id)
    .maybeSingle();

  if (!group) {
    throw new Error("No tienes permiso para modificar este grupo.");
  }

  const { data: template } = await supabase
    .from("schedule_templates")
    .select("id, starts_at, ends_at")
    .eq("modality", group.modality)
    .eq("shift", group.shift)
    .eq("active", true)
    .maybeSingle();

  if (!template) {
    throw new Error("No existe un cuadro de horario para este grupo.");
  }

  const templateStart = timeToMinutes(template.starts_at.slice(0, 5));
  const templateEnd = timeToMinutes(template.ends_at.slice(0, 5));

  if (startsAtMinutes < templateStart || endsAtMinutes > templateEnd) {
    throw new Error(`El bloque personalizado debe estar dentro del horario del cuadro (${template.starts_at.slice(0, 5)}-${template.ends_at.slice(0, 5)}).`);
  }

  const { data: overlapping } = await supabase
    .from("schedule_blocks")
    .select("id")
    .eq("template_id", template.id)
    .eq("day_of_week", parsed.data.day_of_week)
    .eq("active", true)
    .lt("starts_at", `${parsed.data.ends_at}:00`)
    .gt("ends_at", `${parsed.data.starts_at}:00`);

  if (overlapping && overlapping.length > 0) {
    throw new Error("Ya existe un bloque en este dia que se traslapa con el horario solicitado.");
  }

  const day = WEEKDAYS.find((item) => item.value === parsed.data.day_of_week);
  const label = `${day?.short ?? "DIA"} ${startsAt}-${endsAt} personalizado`;

  const { error } = await supabase.from("schedule_blocks").insert({
    template_id: template.id,
    day_of_week: parsed.data.day_of_week,
    starts_at: startsAt,
    ends_at: endsAt,
    label,
    position: startsAtMinutes,
    active: true,
    is_custom: true,
    created_by: profile.id
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un bloque con ese dia y horario para este cuadro.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/coordinador");
  revalidatePath(`/grupos/${parsed.data.group_id}`);
  revalidatePath("/horarios");
}
