import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const EDITABLE_GROUP_STATUSES = new Set(["draft", "review", "active"]);

export function isEditableGroupStatus(status: string | null | undefined) {
  return EDITABLE_GROUP_STATUSES.has(status ?? "");
}

function assertEditableGroup(status: string | null | undefined) {
  if (!isEditableGroupStatus(status)) {
    throw new Error("El grupo está finalizado o archivado y es de solo lectura.");
  }
}

export async function requireEditableGroup(supabase: SupabaseServerClient, groupId: string) {
  const { data: group, error } = await supabase
    .from("groups")
    .select("id, status")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!group) throw new Error("Grupo no encontrado.");

  assertEditableGroup(group.status);
  return group;
}

export async function requireEditableGroupForSubject(
  supabase: SupabaseServerClient,
  groupSubjectId: string
) {
  const { data: groupSubject, error } = await supabase
    .from("group_subjects")
    .select("id, groups(id, status)")
    .eq("id", groupSubjectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!groupSubject) throw new Error("Materia del grupo no encontrada.");

  const relationData = groupSubject.groups as
    | { id?: string | null; status?: string | null }
    | Array<{ id?: string | null; status?: string | null }>
    | null;
  const relation = Array.isArray(relationData) ? relationData[0] : relationData;
  assertEditableGroup(relation?.status);
  return relation;
}
