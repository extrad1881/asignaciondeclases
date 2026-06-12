export const MODALITIES = [
  { value: "escolarizado", label: "Escolarizado" },
  { value: "modular", label: "Modular" },
  { value: "virtual_modular", label: "Virtual modular" },
  { value: "maestrias", label: "Maestrías" }
] as const;

export const SHIFTS = [
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" }
] as const;

export const GROUP_STATUSES = [
  { value: "draft", label: "Borrador" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "archived", label: "Archivado" }
] as const;

export const WEEKDAYS = [
  { value: 1, short: "LUN", label: "Lunes" },
  { value: 2, short: "MAR", label: "Martes" },
  { value: 3, short: "MIE", label: "Miércoles" },
  { value: 4, short: "JUE", label: "Jueves" },
  { value: 5, short: "VIE", label: "Viernes" },
  { value: 6, short: "SAB", label: "Sábado" }
] as const;
