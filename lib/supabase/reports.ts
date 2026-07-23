import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/auth-session";
import { escapeCsvCell } from "@/lib/csv";

export type ReportRow = {
  ciclo: string;
  carrera: string;
  grupo: string;
  modalidad: string;
  turno: string;
  materia: string;
  docente: string;
  dia: string;
  hora: string;
  aula: string;
};

const DAY_LABELS: Record<number, string> = {
  1: "LUN",
  2: "MAR",
  3: "MIE",
  4: "JUE",
  5: "VIE",
  6: "SAB",
  7: "DOM"
};

export async function getReportData(groupId?: string): Promise<ReportRow[]> {
  const supabase = await createClient();
  const { userId } = await getVerifiedSession(supabase);
  if (!userId) return [];

  let query = supabase
    .from("assignments")
    .select(`
      id,
      duration_hours,
      group_subject:group_subjects!inner(
        hours_per_week,
        group:groups!inner(
          id,
          name,
          modality,
          shift,
          quarter,
          academic_cycles!inner(code, name),
          careers!inner(code, name)
        ),
        subject:subjects!inner(name)
      ),
      teacher:teachers!inner(name),
      schedule_block:schedule_blocks!inner(
        day_of_week,
        starts_at,
        ends_at
      ),
      classroom:classrooms(name)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (groupId) {
    query = query.eq("group_subject.group_id", groupId);
  }

  const { data: assignments } = await query;

  if (!assignments) return [];

  return assignments.map((a) => {
    const gs = a.group_subject;
    const g = gs.group;
    const sb = a.schedule_block;
    return {
      ciclo: g.academic_cycles?.code ?? "",
      carrera: g.careers?.code ?? "",
      grupo: g.name,
      modalidad: g.modality,
      turno: g.shift,
      materia: gs.subject?.name ?? "",
      docente: a.teacher?.name ?? "",
      dia: DAY_LABELS[sb.day_of_week] ?? String(sb.day_of_week),
      hora: `${sb.starts_at?.slice(0, 5) ?? ""}-${sb.ends_at?.slice(0, 5) ?? ""}`,
      aula: a.classroom?.name ?? ""
    };
  });
}

export function rowsToCsv(rows: ReportRow[]): string {
  const headers = [
    "Ciclo",
    "Carrera",
    "Grupo",
    "Modalidad",
    "Turno",
    "Materia",
    "Docente",
    "Dia",
    "Hora",
    "Aula"
  ];

  const lines = rows.map((row) =>
    [
      row.ciclo,
      row.carrera,
      row.grupo,
      row.modalidad,
      row.turno,
      row.materia,
      row.docente,
      row.dia,
      row.hora,
      row.aula
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

export async function getGroupsForReport(): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name")
    .in("status", ["active", "draft"])
    .order("name");
  return data ?? [];
}
