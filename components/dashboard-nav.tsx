"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CircleAlert,
  FileText,
  GraduationCap,
  Home,
  LayoutGrid,
  Settings,
  UserCog,
  Users,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  { href: "/reportes", label: "Reportes", icon: FileText },
  { href: "/datos-incompletos", label: "Datos incompletos", icon: CircleAlert, adminOnly: true },
  { href: "/admin", label: "Admin", icon: Settings, adminOnly: true }
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ role, mobile = false }: { role?: string | null; mobile?: boolean }) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) return role === "admin";
    if (item.coordinatorOnly) return role === "coordinator";
    return true;
  });

  return (
    <nav className={mobile ? "mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden" : "flex flex-col gap-1 px-3 py-4"}>
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            className={cn(
              mobile
                ? "inline-flex min-h-10 whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold"
                : "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold",
              active
                ? "border-brand bg-brandSoft text-brandDeep"
                : "border-line bg-white text-slate-700 hover:bg-slate-100",
              !mobile && active && "border-l-4 border-l-brand"
            )}
            href={item.href}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            {!mobile ? <Icon aria-hidden className="h-4 w-4" /> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
