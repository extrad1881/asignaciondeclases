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
      .select("id, name, quarter, modality, shift, academic_cycles(code), careers(code, name)")
      .eq("status", "active")
      .order("academic_cycle_id")
      .order("modality")
      .order("shift")
      .order("quarter")
  ]);

  return (
    <>
      <SectionHeader eyebrow="Grupos guardados" title="Grupos">
        <Link href="/grupos/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </SectionHeader>
      <SavedGroups canDelete={isAdmin(profile?.role_code)} groups={groups as any[]} />
    </>
  );
}
