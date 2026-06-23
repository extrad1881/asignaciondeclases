"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
  LogOut,
  Moon,
  Settings,
  Sun,
  UserCog,
  Users,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type ShellProps = {
  navItems: Array<{ href: string; label: string; icon: string }>;
  displayName: string;
  roleLabel: string;
  signOutAction: () => void;
  children: React.ReactNode;
};

const iconMap: Record<string, LucideIcon> = {
  Home,
  UserCog,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
  LayoutGrid,
  CalendarDays,
  FileText,
  CircleAlert
};

function subscribeTheme(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === "theme") callback();
  };
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const mqChange = () => callback();
  window.addEventListener("storage", storage);
  mq.addEventListener("change", mqChange);
  return () => {
    window.removeEventListener("storage", storage);
    mq.removeEventListener("change", mqChange);
  };
}

function getThemeSnapshot() {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function useDarkMode(): [boolean, () => void] {
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const toggle = useCallback(() => {
    const next = !dark;
    localStorage.setItem("theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return [dark, toggle];
}

export function ComicShell({ navItems, displayName, roleLabel, signOutAction, children }: ShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, toggleDark] = useDarkMode();

  const items: NavItem[] = useMemo(
    () =>
      navItems
        .map((item) => {
          const Icon = iconMap[item.icon];
          return Icon ? { ...item, icon: Icon } : null;
        })
        .filter((item): item is NavItem => item !== null),
    [navItems]
  );

  const activeHref = useMemo(() => {
    return items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href ?? "/dashboard";
  }, [pathname, items]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          aria-label="Cerrar menú"
          className="absolute inset-0 z-20 bg-ink/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          "absolute z-30 flex h-full w-64 flex-col border-r border-line bg-panel transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-primary-foreground">
            <GraduationCap aria-hidden className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">Coordinación</p>
            <p className="truncate text-xs text-muted">Académica</p>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-brand text-primary-foreground"
                        : "text-ink hover:bg-accent hover:text-accent-foreground"
                    )}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon aria-hidden className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User + controls */}
        <div className="border-t border-line p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{roleLabel}</p>
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              aria-pressed={dark}
              className="focus-ring inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-line bg-background text-sm font-medium text-ink transition hover:bg-accent"
              onClick={toggleDark}
              type="button"
            >
              {dark ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
              <span className="sr-only lg:not-sr-only">{dark ? "Claro" : "Oscuro"}</span>
            </button>
            <form action={signOutAction} className="flex-1">
              <button
                aria-label="Cerrar sesión"
                className="focus-ring inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line bg-background text-sm font-medium text-ink transition hover:bg-accent"
                type="submit"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                <span className="sr-only lg:not-sr-only">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-primary-foreground">
              <GraduationCap aria-hidden className="h-5 w-5" />
            </div>
            <span className="font-semibold text-ink">Coordinación Académica</span>
          </div>
          <button
            aria-controls="sidebar"
            aria-expanded={mobileOpen}
            aria-label="Abrir menú"
            className="focus-ring rounded-md border border-line p-2 text-ink"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <LayoutGrid aria-hidden className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
