import { WEEKDAYS } from "@/lib/constants";

export type ScheduleBlock = {
  dayOfWeek: number;
  label: string;
  startsAt: string;
  endsAt: string;
};

export type ScheduleTemplateConfig = {
  code: string;
  label: string;
  modality: "escolarizado" | "modular" | "virtual_modular" | "maestrias";
  shift: "matutino" | "vespertino";
  asset: string;
  blocks: ScheduleBlock[];
};

const weekdays = WEEKDAYS.filter((day) => day.value <= 5);

function weekdayBlocks(times: Array<[string, string]>) {
  return weekdays.flatMap((day) =>
    times.map(([startsAt, endsAt]) => ({
      dayOfWeek: day.value,
      label: `${day.short} ${startsAt}-${endsAt}`,
      startsAt,
      endsAt
    }))
  );
}

export const scheduleTemplates: ScheduleTemplateConfig[] = [
  {
    code: "escolarizado-matutino",
    label: "Escolarizado matutino",
    modality: "escolarizado",
    shift: "matutino",
    asset: "/schedule-assets/CUADRO ESCOLARIZADO.png",
    blocks: weekdayBlocks([
      ["08:00", "09:30"],
      ["10:00", "11:30"],
      ["11:30", "13:00"]
    ])
  },
  {
    code: "escolarizado-vespertino",
    label: "Escolarizado vespertino",
    modality: "escolarizado",
    shift: "vespertino",
    asset: "/schedule-assets/CUADRO ESCOLARIZADO VESPERTINO.png",
    blocks: weekdayBlocks([
      ["15:00", "16:30"],
      ["17:00", "18:30"],
      ["18:30", "20:00"]
    ])
  },
  {
    code: "modular-matutino",
    label: "Modular matutino",
    modality: "modular",
    shift: "matutino",
    asset: "/schedule-assets/CUADRO MODULAR.png",
    blocks: weekdayBlocks([
      ["08:00", "09:30"],
      ["10:00", "11:30"],
      ["11:30", "13:00"]
    ])
  },
  {
    code: "modular-vespertino",
    label: "Modular vespertino",
    modality: "modular",
    shift: "vespertino",
    asset: "/schedule-assets/CUADRO MODULAR VESPERTINO.png",
    blocks: weekdayBlocks([
      ["14:00", "15:30"],
      ["16:00", "17:30"],
      ["17:30", "19:00"]
    ])
  },
  {
    code: "virtual-modular-matutino",
    label: "Virtual modular matutino",
    modality: "virtual_modular",
    shift: "matutino",
    asset: "/schedule-assets/CUADRO MODULAR VIRTUAL.png",
    blocks: weekdayBlocks([
      ["08:00", "09:30"],
      ["10:00", "11:30"],
      ["11:30", "13:00"]
    ])
  },
  {
    code: "maestrias-vespertino",
    label: "Maestrías",
    modality: "maestrias",
    shift: "vespertino",
    asset: "/schedule-assets/CUADRO MAESTRIAS.png",
    blocks: [
      { dayOfWeek: 6, label: "SAB 14:30-16:30", startsAt: "14:30", endsAt: "16:30" },
      { dayOfWeek: 6, label: "SAB 17:00-19:00", startsAt: "17:00", endsAt: "19:00" }
    ]
  }
];

export function findScheduleTemplate(modality: string, shift: string) {
  return scheduleTemplates.find(
    (template) => template.modality === modality && template.shift === shift
  );
}
