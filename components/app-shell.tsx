import { redirect } from "next/navigation";
import { ComicShell } from "@/components/comic-shell";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";

type NavItemDef = {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  coordinatorOnly?: boolean;
};

const navItems: NavItemDef[] = [
  { href: "/dashboard", label: "Dashboard", icon: "Home" },
  { href: "/coordinador", label: "Mi panel", icon: "UserCog", coordinatorOnly: true },
  { href: "/docentes", label: "Docentes", icon: "Users" },
  { href: "/materias", label: "Materias", icon: "BookOpen" },
  { href: "/carreras", label: "Carreras", icon: "GraduationCap" },
  { href: "/coordinadores", label: "Coordinadores", icon: "Settings" },
  { href: "/grupos", label: "Grupos", icon: "LayoutGrid" },
  { href: "/horarios", label: "Horarios", icon: "CalendarDays" },
  { href: "/reportes", label: "Reportes", icon: "FileText" },
  { href: "/datos-incompletos", label: "Incompletos", icon: "CircleAlert", adminOnly: true },
  { href: "/ciclos", label: "Ciclos", icon: "CalendarDays", adminOnly: true },
  { href: "/cohortes", label: "Cohortes", icon: "LayoutGrid" },
  { href: "/admin", label: "Admin", icon: "Settings", adminOnly: true }
];

async function signOut() {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function AppShell({ children, breadcrumbs }: { children: React.ReactNode; breadcrumbs?: React.ReactNode }) {
  const profile = await requireActiveProfileOrRedirect();

  const visibleNavItems: Array<{ href: string; label: string; icon: string }> = navItems
    .filter((item) => {
      if (item.adminOnly) return isAdmin(profile?.role_code);
      if (item.coordinatorOnly) return profile?.role_code === "coordinator";
      return true;
    })
    .map(({ href, label, icon }) => ({ href, label, icon }));

  const displayName = profile?.display_name ?? profile?.email ?? "Usuario";
  const roleLabel = profile?.role_code === "admin" ? "Administrador" : "Coordinador";

  return (
    <ComicShell
      breadcrumbs={breadcrumbs}
      displayName={displayName}
      navItems={visibleNavItems}
      roleLabel={roleLabel}
      signOutAction={signOut}
    >
      {children}
    </ComicShell>
  );
}
