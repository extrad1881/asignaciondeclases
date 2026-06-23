export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { SavedGroups } from "@/components/groups/saved-groups";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";


export default async function GroupsPage() {
  const supabase = await createClient();
  const [profile, { data: groups = [] }] = await Promise.all([
    requireActiveProfileOrRedirect(),
    supabase
      .from("groups")
      .select("id, name, quarter, modality, shift, status, academic_cycles(code), careers(code, name)")
      .in("status", ["draft", "review", "final", "active"])
      .order("academic_cycle_id")
      .order("modality")
      .order("shift")
      .order("quarter")
  ]);

  return (
    <>
      <SectionHeader
        eyebrow="Grupos guardados"
        title="Grupos"
        description="Consulta los grupos por ciclo, modalidad y turno. Entra a cada grupo para revisar materias, asignaciones e historial."
      >
        <Link
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-subtle transition hover:bg-brandDeep"
          href="/grupos/nuevo"
        >
          <Plus className="h-4 w-4" />
          Crear grupo
        </Link>
      </SectionHeader>
      <SavedGroups canArchive={isAdmin(profile?.role_code)} groups={groups as any[]} />
    </>
  );
}
