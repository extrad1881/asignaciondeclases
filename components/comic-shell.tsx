"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Users
} from "lucide-react";

type ComicNavItem = {
  href: string;
  label: string;
  icon: string;
};

const iconMap: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
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

type ComicShellProps = {
  navItems: ComicNavItem[];
  displayName: string;
  roleLabel: string;
  signOutAction: () => void;
  children: React.ReactNode;
};

const FLOATING_TEXTS = [
  "CLASES",
  "COORDINACIÓN",
  "ACADÉMICA",
  "TUP",
  "ASIGNACIÓN"
];

function useDarkMode(): [boolean, () => void, boolean] {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return [dark, toggle, mounted];
}

export function ComicShell({ navItems, displayName, roleLabel, signOutAction, children }: ComicShellProps) {
  const pathname = usePathname();
  const [entered, setEntered] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [floatingIndex, setFloatingIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const [dark, toggleDark, mounted] = useDarkMode();

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextVisible(false);
      setTimeout(() => {
        setFloatingIndex((prev) => (prev + 1) % FLOATING_TEXTS.length);
        setTextVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const selectedIndex = useMemo(() => {
    const idx = navItems.findIndex((item) => pathname.startsWith(item.href));
    return idx >= 0 ? idx : 0;
  }, [pathname, navItems]);

  return (
    <div
      className="fixed inset-0 flex overflow-hidden select-none"
      style={{
        fontFamily: "var(--font-sans)",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <style>{`
        @keyframes comic-slide-left {
          0% { transform: translateX(-120%); opacity: 0; }
          60% { transform: translateX(4%); }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes comic-slide-right {
          0% { transform: translateX(120%); }
          60% { transform: translateX(-2%); }
          100% { transform: translateX(0); }
        }
        @keyframes comic-fade-left {
          0% { transform: translateX(-80px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes comic-pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes comic-scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(200%); opacity: 0; }
        }
        @keyframes comic-text-tilt {
          0%, 100% { transform: skewY(-2deg); }
          50% { transform: skewY(2deg); }
        }
        @keyframes comic-text-fade-in {
          0% { opacity: 0; transform: skewY(-1deg) scale(0.97); }
          100% { opacity: 1; transform: skewY(0deg) scale(1); }
        }
      `}</style>

      {/* LEFT PANEL — sidebar with user info, nav, dark toggle, logout */}
      <div
        className="relative z-20 flex flex-col w-[240px] flex-shrink-0"
        style={{
          backgroundColor: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          animation: entered ? "comic-slide-left 0.7s cubic-bezier(0.16, 1, 0.3, 1) both" : "none"
        }}
      >
        {/* User info — top of sidebar */}
        <div
          className="flex-shrink-0 px-5 pt-6 pb-4"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {roleLabel}
          </p>
          <p
            className="mt-1 text-sm font-black italic truncate"
            style={{ color: "var(--foreground)" }}
          >
            {displayName}
          </p>
        </div>

        {/* Menu items — middle */}
        <div className="relative flex-1 flex flex-col justify-center items-start pl-6 gap-0">
          {navItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            const isHovered = index === hoveredIndex;
            const highlight = isSelected || isHovered;

            return (
              <div
                className="relative flex items-center justify-start h-12"
                key={item.href}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {isSelected && (
                    <div
                      className="absolute -inset-x-4 -inset-y-1 pointer-events-none"
                      style={{
                        background: "linear-gradient(90deg, transparent, var(--sidebar-accent), transparent)",
                        animation: "comic-pulse-subtle 2s ease-in-out infinite"
                      }}
                    />
                  )}

                  <Link
                    className="group relative flex items-center gap-2.5 cursor-pointer"
                    href={item.href}
                    style={{
                      transform: `skewX(-8deg)`,
                      animation: entered
                        ? `comic-fade-left 0.35s ease-out ${0.08 * index}s both`
                        : "none"
                    }}
                  >

                  {(() => {
                    const IconComp = iconMap[item.icon];
                    return IconComp ? (
                      <IconComp
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{
                          color: highlight ? "var(--primary)" : "var(--muted-foreground)",
                          filter: highlight ? "drop-shadow(0 0 6px var(--primary))" : "none",
                          transition: "color 0.2s, filter 0.2s"
                        }}
                      />
                    ) : null;
                  })()}

                  <span
                    className="text-left font-black italic text-lg tracking-wider whitespace-nowrap"
                    style={{
                      color: highlight ? "var(--primary)" : "var(--foreground)",
                      textShadow: highlight ? "0 0 12px var(--primary)" : "none",
                      transition: "color 0.2s, text-shadow 0.2s",
                      transform: highlight ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {item.label.toUpperCase()}
                  </span>
                </Link>
              </div>
            );
          }          )}
        </div>

        {/* Bottom controls — dark toggle + logout */}
        <div
          className="flex-shrink-0 flex flex-col gap-2 px-5 pb-6 pt-3"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <button
            className="flex items-center gap-2 cursor-pointer text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
            onClick={toggleDark}
            title={mounted ? (dark ? "Modo claro" : "Modo oscuro") : "Modo oscuro"}
            type="button"
            style={{ color: "var(--foreground)" }}
          >
            {mounted ? (dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <span className="h-4 w-4" />}
            {mounted ? (dark ? "CLARO" : "OSCURO") : "OSCURO"}
          </button>

          <form action={signOutAction}>
            <button
              className="flex items-center gap-2 cursor-pointer text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
              type="submit"
              title="Cerrar sesión"
              style={{ color: "var(--foreground)" }}
            >
              <LogOut className="h-4 w-4" />
              <span>SALIR</span>
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL — content area */}
      <div
        className="relative z-10 flex flex-col flex-1 overflow-hidden"
        style={{
          backgroundColor: "var(--background)",
          animation: entered ? "comic-slide-right 0.7s cubic-bezier(0.16, 1, 0.3, 1) both" : "none"
        }}
      >
        {/* Dynamic tilted watermark — positioned more to the right */}
        <div
          className="absolute right-0 top-1/4 pointer-events-none z-0 select-none overflow-hidden"
          style={{
            opacity: textVisible ? 0.05 : 0,
            transition: "opacity 0.4s ease",
            animation: entered ? "comic-text-tilt 8s ease-in-out infinite" : "none"
          }}
        >
          <p
            className="text-[180px] font-black italic leading-none whitespace-nowrap translate-x-12"
            style={{
              color: "var(--foreground)",
              animation: textVisible ? "comic-text-fade-in 0.4s ease-out both" : "none",
            }}
            key={floatingIndex}
          >
            {FLOATING_TEXTS[floatingIndex]}
          </p>
        </div>

        {/* Content area */}
        <div className="relative z-10 flex-1 overflow-y-auto pt-6 pb-8">
          <div className="mx-auto w-full max-w-5xl px-6 md:px-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
