import { describe, expect, it } from "vitest";
import { escapeCsvCell } from "../lib/csv";

describe("rowsToCsv", () => {
  it.each(["=2+2", "+cmd", "-10+20", "@SUM(A1:A2)", "  =HYPERLINK(\"https://example.test\")", "\t=1+1"])(
    "neutraliza una celda que una hoja de cálculo podría ejecutar: %s",
    (formula) => {
      expect(escapeCsvCell(formula)).toBe(`"'${formula.replace(/"/g, '""')}"`);
    }
  );

  it("conserva texto normal y escapa comillas dobles", () => {
    const csvCell = escapeCsvCell('Ana "Coordinación"');
    expect(csvCell).toBe('"Ana ""Coordinación"""');
    expect(csvCell).not.toContain('"\'Ana');
  });
});
