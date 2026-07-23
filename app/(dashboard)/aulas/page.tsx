import { redirect } from "next/navigation";
import { DoorOpen, Plus } from "lucide-react";
import { createClassroomStateAction } from "@/app/(dashboard)/actions/aulas";
import { ClassroomCard } from "@/components/aulas/classroom-card";
import {
  ClassroomManageControls,
  type ClassroomItem
} from "@/components/aulas/classroom-manage-controls";
import { SectionHeader } from "@/components/section-header";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTableAdvanced,
  type DataTableAdvancedRow
} from "@/components/ui/data-table-advanced";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ClassroomsPage() {
  const profile = await requireActiveProfileOrRedirect();
  if (!isAdmin(profile.role_code)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: classrooms = [] } = await supabase
    .from("classrooms")
    .select("id, name, capacity, kind, active")
    .order("active", { ascending: false })
    .order("name");

  const classroomItems: ClassroomItem[] = (classrooms ?? []).map((classroom) => ({
    id: classroom.id,
    name: classroom.name,
    capacity: classroom.capacity,
    kind: classroom.kind,
    active: classroom.active
  }));

  const rows: DataTableAdvancedRow[] = classroomItems.map((classroom) => ({
    id: classroom.id,
    searchText: [
      classroom.name,
      classroom.kind ?? "",
      classroom.capacity ?? "",
      classroom.active ? "Activa" : "Inactiva"
    ].join(" "),
    filters: {
      tipo: classroom.kind || "Sin especificar",
      estado: classroom.active ? "Activa" : "Inactiva"
    },
    cells: [
      <span className="font-semibold text-ink" key="name">{classroom.name}</span>,
      classroom.kind || <span className="text-muted" key="kind">Sin especificar</span>,
      classroom.capacity == null
        ? <span className="text-muted" key="capacity">Sin especificar</span>
        : `${classroom.capacity} lugares`,
      <Badge key="state" tone={classroom.active ? "success" : "warning"}>
        {classroom.active ? "Activa" : "Inactiva"}
      </Badge>,
      <ClassroomManageControls classroom={classroom} compact key="manage" />
    ]
  }));

  return (
    <>
      <SectionHeader
        eyebrow="Catálogo"
        title="Aulas"
        description="Administra los espacios disponibles para grupos y asignaciones sin eliminar su historial."
      />

      <section className="mb-6 rounded-md border border-line bg-card p-4 shadow-subtle">
        <div className="mb-4 flex items-start gap-3">
          <span className="rounded-md bg-brandSoft p-2 text-brandDeep">
            <DoorOpen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Agregar aula</h2>
            <p className="text-sm text-muted">Registra el espacio una sola vez para reutilizarlo en grupos y horarios.</p>
          </div>
        </div>
        <ActionStateForm
          action={createClassroomStateAction}
          alertClassName="md:col-span-full"
          className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,0.6fr)_150px_auto]"
        >
          <label className="grid gap-1 text-sm font-medium text-ink">
            Nombre
            <Input name="name" placeholder="Aula 101" required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Tipo
            <Input name="kind" placeholder="Aula, laboratorio..." />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Capacidad
            <Input min={0} name="capacity" placeholder="Sin límite" type="number" />
          </label>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <Plus className="h-4 w-4" aria-hidden />
              Agregar aula
            </Button>
          </div>
        </ActionStateForm>
      </section>

      <ResponsiveTable
        cards={
          <ul className="grid gap-3 sm:grid-cols-2">
            {classroomItems.map((classroom) => (
              <li key={classroom.id}>
                <ClassroomCard classroom={classroom} />
              </li>
            ))}
          </ul>
        }
        table={
          <DataTableAdvanced
            emptyDescription="Agrega un aula para utilizarla al crear grupos y asignaciones."
            emptyLabel="No hay aulas registradas."
            filters={[
              { key: "tipo", label: "Tipo" },
              { key: "estado", label: "Estado" }
            ]}
            headers={["Aula", "Tipo", "Capacidad", "Estado", "Administrar"]}
            initialPageSize={25}
            rows={rows}
          />
        }
      />
    </>
  );
}
