import { describe, expect, it } from "vitest";
import { createServiceTestClient } from "../helpers/supabase-test-client";

const expectedCatalog: Record<string, { days: number[]; times: string[]; modules: number[] }> = {
  "escolarizado-matutino": {
    days: [1, 2, 3, 4, 5],
    times: ["08:00-09:30", "10:00-11:30", "11:30-13:00"],
    modules: [0]
  },
  "escolarizado-vespertino": {
    days: [1, 2, 3, 4, 5],
    times: ["15:00-16:30", "17:00-18:30", "18:30-20:00"],
    modules: [0]
  },
  "modular-matutino": {
    days: [1, 2, 3, 4, 5],
    times: ["08:00-09:30", "10:00-11:30", "11:30-13:00"],
    modules: [0]
  },
  "modular-vespertino": {
    days: [1, 2, 3, 4, 5],
    times: ["14:00-15:30", "16:00-17:30", "17:30-19:00"],
    modules: [0]
  },
  "virtual-modular-matutino": {
    days: [6],
    times: ["08:00-09:30", "10:00-11:30", "11:30-13:00"],
    modules: [1, 2]
  },
  "sabatino-matutino": {
    days: [6],
    times: ["08:00-09:30", "10:00-11:30", "11:30-13:00"],
    modules: [1, 2]
  },
  "sabatino-vespertino": {
    days: [6],
    times: ["14:00-15:30", "16:00-17:30", "17:30-19:00"],
    modules: [1, 2]
  }
};

function readTemplateCode(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object" || !("code" in candidate)) return null;
  return typeof candidate.code === "string" ? candidate.code : null;
}

describe("catálogo de bloques de horario", () => {
  const service = createServiceTestClient();

  it("publica los bloques canónicos con módulos solo en sabatino y virtual", async () => {
    const { data, error } = await service
      .from("schedule_blocks")
      .select("day_of_week, starts_at, ends_at, module, schedule_templates!inner(code)")
      .eq("active", true)
      .eq("is_custom", false)
      .in("schedule_templates.code", Object.keys(expectedCatalog))
      .order("day_of_week")
      .order("starts_at");

    expect(error).toBeNull();
    const blocks = data ?? [];

    for (const [code, expected] of Object.entries(expectedCatalog)) {
      const templateBlocks = blocks.filter(
        (block) => readTemplateCode(block.schedule_templates) === code
      );
      expect(templateBlocks).toHaveLength(
        expected.days.length * expected.times.length * expected.modules.length
      );
      expect(Array.from(new Set(templateBlocks.map((block) => block.module))).sort()).toEqual(
        [...expected.modules].sort()
      );
      expect(Array.from(new Set(templateBlocks.map((block) => block.day_of_week)))).toEqual(expected.days);
      expect(Array.from(new Set(templateBlocks.map((block) =>
        `${block.starts_at.slice(0, 5)}-${block.ends_at.slice(0, 5)}`
      )))).toEqual(expected.times);
    }
  });

  it("conserva intactos los bloques vigentes de maestrías", async () => {
    const { data, error } = await service
      .from("schedule_blocks")
      .select("starts_at, ends_at, schedule_templates!inner(code)")
      .eq("active", true)
      .eq("is_custom", false)
      .eq("schedule_templates.code", "maestrias-vespertino")
      .order("starts_at");

    expect(error).toBeNull();
    expect((data ?? []).map((block) =>
      `${block.starts_at.slice(0, 5)}-${block.ends_at.slice(0, 5)}`
    )).toEqual(["14:30-16:00", "16:00-17:30", "17:30-19:00"]);
  });
});
