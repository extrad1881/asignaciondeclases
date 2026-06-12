export type RoleCode = "admin" | "coordinator";

export function isAdmin(roleCode?: string | null) {
  return roleCode === "admin";
}

export function canUseShift(modality: string, shift: string) {
  if (modality === "virtual_modular") return shift === "matutino";
  if (modality === "maestrias") return shift === "vespertino";
  return shift === "matutino" || shift === "vespertino";
}
