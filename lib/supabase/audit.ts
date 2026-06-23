import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedProfile } from "@/lib/supabase/auth-helpers";

export type AuditLogRow = {
  id: number;
  user_id: string | null;
  action_type: string;
  table_name: string;
  record_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  users_profile?: {
    email?: string | null;
    display_name?: string | null;
  } | null;
};

export type FormattedAuditLogEntry = AuditLogRow & {
  dateLabel: string;
  userLabel: string;
  actionLabel: string;
  summary: string;
};

function changedKeys(oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]);
  return Array.from(keys).filter((key) => JSON.stringify(oldValue?.[key] ?? null) !== JSON.stringify(newValue?.[key] ?? null));
}

function valueLabel(value: unknown) {
  if (value == null || value === "") return "sin valor";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatAuditLogEntry(log: AuditLogRow): FormattedAuditLogEntry {
  const actionLabels: Record<string, string> = {
    insert: "Creacion",
    update: "Actualizacion",
    delete: "Eliminacion"
  };
  const actionLabel = actionLabels[log.action_type] ?? log.action_type;
  const keys = changedKeys(log.old_value, log.new_value);
  const userLabel = log.users_profile?.display_name || log.users_profile?.email || "Sistema";
  const summary =
    log.action_type === "update" && keys.length > 0
      ? `Cambio en ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? "..." : ""}`
      : `${actionLabel} en ${log.table_name}`;

  return {
    ...log,
    dateLabel: new Date(log.created_at).toLocaleString("es-MX"),
    userLabel,
    actionLabel,
    summary
  };
}

function recordTouchesGroupSubject(log: AuditLogRow, groupSubjectIds: Set<string>) {
  const oldGroupSubject = valueLabel(log.old_value?.group_subject_id);
  const newGroupSubject = valueLabel(log.new_value?.group_subject_id);
  return groupSubjectIds.has(oldGroupSubject) || groupSubjectIds.has(newGroupSubject);
}

async function fetchAuditLogsByRecordIds(recordIds: string[]) {
  if (recordIds.length === 0) return [];
  await requireAuthenticatedProfile();
  const service = createServiceClient();
  const { data, error } = await service
    .from("audit_logs")
    .select("id, user_id, action_type, table_name, record_id, old_value, new_value, created_at, users_profile(email, display_name)")
    .in("record_id", recordIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogRow[];
}

export async function getGroupAuditHistory(groupId: string) {
  const supabase = await createClient();
  const { data: group } = await supabase.from("groups").select("id").eq("id", groupId).maybeSingle();
  if (!group) return [];

  const { data: groupSubjects = [] } = await supabase.from("group_subjects").select("id").eq("group_id", groupId);
  const groupSubjectIds = new Set((groupSubjects ?? []).map((item: any) => String(item.id)));

  const { data: assignments = [] } =
    groupSubjectIds.size > 0
      ? await supabase
          .from("assignments")
          .select("id, group_subject_id")
          .in("group_subject_id", Array.from(groupSubjectIds))
      : { data: [] };

  const assignmentIds = new Set((assignments ?? []).map((item: any) => String(item.id)));
  const recordIds = Array.from(new Set([groupId, ...Array.from(groupSubjectIds), ...Array.from(assignmentIds)]));
  const directLogs = await fetchAuditLogsByRecordIds(recordIds);

  const service = createServiceClient();
  const { data: assignmentLogs = [], error } = await service
    .from("audit_logs")
    .select("id, user_id, action_type, table_name, record_id, old_value, new_value, created_at, users_profile(email, display_name)")
    .eq("table_name", "assignments")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);

  const combined = new Map<number, AuditLogRow>();
  [...directLogs, ...((assignmentLogs ?? []) as AuditLogRow[]).filter((log) => recordTouchesGroupSubject(log, groupSubjectIds))].forEach(
    (log) => combined.set(log.id, log)
  );

  return Array.from(combined.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(formatAuditLogEntry);
}

export async function getAssignmentAuditHistory(assignmentId: string) {
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return [];

  const logs = await fetchAuditLogsByRecordIds([assignmentId]);
  return logs.map(formatAuditLogEntry);
}
