import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#eef8f5,transparent_28rem),#f3f6fa]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white/95 lg:block">
        <div className="border-b border-line px-5 py-5">
          <Link className="flex items-center gap-3" href="/dashboard">
            <Image alt="Logo institucional" className="h-11 w-11 rounded-md object-contain" height={44} src="/logos/logo-color.png" width={44} />
            <span>
              <span className="block text-xs font-semibold uppercase text-brand">Coordinación académica</span>
              <span className="mt-1 block text-lg font-semibold leading-tight text-ink">Asignación de clases</span>
            </span>
          </Link>
          <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-muted">
            Gestión de grupos, docentes, materias y horarios.
          </p>
        </div>
        <DashboardNav role={profile?.role_code} />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-3 shadow-subtle backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {profile?.display_name ?? profile?.email ?? "Usuario"}
              </p>
              <p className="text-xs uppercase text-muted">
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
          <DashboardNav mobile role={profile?.role_code} />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}
