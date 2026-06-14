import Link from "next/link";
import { Plus } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { SavedGroups } from "@/components/groups/saved-groups";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await createClient();
  const [profile, { data: groups = [] }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("groups")
      .select("id, name, quarter, modality, shift, status, academic_cycles(code), careers(code, name)")
      .neq("status", "archived")
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
        <Link href="/grupos/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Crear grupo
          </Button>
        </Link>
      </SectionHeader>
      <SavedGroups canDelete={isAdmin(profile?.role_code)} groups={groups as any[]} />
    </>
  );
}
