import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CircleAlert,
  GraduationCap,
  Home,
  LayoutGrid,
  type LucideIcon,
  LogOut,
  Settings,
  UserCog,
  Users
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  coordinatorOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/coordinador", label: "Mi panel", icon: UserCog, coordinatorOnly: true },
  { href: "/docentes", label: "Docentes", icon: Users },
  { href: "/materias", label: "Materias", icon: BookOpen },
  { href: "/carreras", label: "Carreras", icon: GraduationCap },
  { href: "/coordinadores", label: "Coordinadores", icon: Settings },
  { href: "/grupos", label: "Grupos", icon: LayoutGrid },
  { href: "/horarios", label: "Horarios", icon: CalendarDays },
  { href: "/datos-incompletos", label: "Datos incompletos", icon: CircleAlert, adminOnly: true },
  { href: "/admin", label: "Admin", icon: Settings, adminOnly: true }
];

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin(profile?.role_code);
    if (item.coordinatorOnly) return profile?.role_code === "coordinator";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">
        <div className="border-b border-line px-5 py-5">
          <p className="text-xs font-semibold uppercase text-brand">Coordinación</p>
          <p className="mt-1 text-lg font-semibold text-ink">Asignación de clases</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 py-3 shadow-subtle backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {profile?.display_name ?? profile?.email ?? "Usuario"}
              </p>
              <p className="text-xs uppercase text-slate-500">
                {profile?.role_code === "admin" ? "Administrador" : "Coordinador"}
              </p>
            </div>
            <form action={signOut}>
              <Button title="Cerrar sesión" type="submit" variant="secondary">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {visibleNavItems.map((item) => (
              <Link
                className="whitespace-nowrap rounded-md border border-line bg-white px-3 py-2 text-xs font-medium text-slate-700"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
