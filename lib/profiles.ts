export function normalizeProfileCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export function isValidProfileCode(value: string | null | undefined) {
  const code = normalizeProfileCode(String(value ?? ""));
  if (!code) return false;
  if (code === "NAN" || code === "NULL" || code === "UNDEFINED") return false;
  if (code.includes("#REF") || code.includes("#ERROR")) return false;
  return /^[A-Z0-9_]+$/.test(code);
}

export function uniqueValidProfileCodes(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeProfileCode(value))
        .filter(isValidProfileCode)
    )
  );
}
