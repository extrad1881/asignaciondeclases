import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function formatHours(value: number | null | undefined) {
  if (value == null) return "0 h";
  return `${Number(value).toLocaleString("es-MX", { maximumFractionDigits: 1 })} h`;
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function computeBlockHours(startsAt: string | null | undefined, endsAt: string | null | undefined): number {
  if (!startsAt || !endsAt) return 1.5;
  const [startH, startM] = startsAt.split(":").map(Number);
  const [endH, endM] = endsAt.split(":").map(Number);
  const minutes = (endH * 60 + endM) - (startH * 60 + startM);
  return minutes > 0 ? minutes / 60 : 1.5;
}
