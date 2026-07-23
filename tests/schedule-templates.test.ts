import { describe, expect, it } from "vitest";
import { findScheduleTemplate } from "../lib/schedule/templates";

function uniqueTimes(modality: string, shift: string) {
  const template = findScheduleTemplate(modality, shift);
  expect(template).toBeDefined();
  return Array.from(
    new Set(template?.blocks.map((block) => `${block.startsAt}-${block.endsAt}`))
  );
}

describe("plantillas de horario visibles", () => {
  it("conserva únicamente las tres franjas del escolarizado matutino", () => {
    expect(uniqueTimes("escolarizado", "matutino")).toEqual([
      "08:00-09:30",
      "10:00-11:30",
      "11:30-13:00"
    ]);
  });

  it("conserva únicamente las tres franjas del escolarizado vespertino", () => {
    expect(uniqueTimes("escolarizado", "vespertino")).toEqual([
      "15:00-16:30",
      "17:00-18:30",
      "18:30-20:00"
    ]);
  });

  it("virtual y sabatino no duplican franjas por módulo", () => {
    const expectedMorning = ["08:00-09:30", "10:00-11:30", "11:30-13:00"];
    const virtual = findScheduleTemplate("virtual_modular", "matutino");
    const saturdayMorning = findScheduleTemplate("sabatino", "matutino");
    const saturdayEvening = findScheduleTemplate("sabatino", "vespertino");

    expect(uniqueTimes("virtual_modular", "matutino")).toEqual(expectedMorning);
    expect(uniqueTimes("sabatino", "matutino")).toEqual(expectedMorning);
    expect(uniqueTimes("sabatino", "vespertino")).toEqual([
      "14:00-15:30",
      "16:00-17:30",
      "17:30-19:00"
    ]);
    expect(virtual?.blocks).toHaveLength(3);
    expect(saturdayMorning?.blocks).toHaveLength(3);
    expect(saturdayEvening?.blocks).toHaveLength(3);
    expect([
      ...(virtual?.blocks ?? []),
      ...(saturdayMorning?.blocks ?? []),
      ...(saturdayEvening?.blocks ?? [])
    ].every((block) => block.dayOfWeek === 6 && block.module == null)).toBe(true);
  });
});
