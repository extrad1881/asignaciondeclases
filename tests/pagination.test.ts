import { describe, expect, it } from "vitest";
import { fetchAllRows } from "../lib/supabase/pagination";

describe("fetchAllRows", () => {
  it("recupera todas las filas aunque el servidor limite cada respuesta", async () => {
    const source = Array.from({ length: 1_197 }, (_, index) => ({ id: index + 1 }));
    const serverMaxRows = 237;

    const result = await fetchAllRows(
      async (from, to) => ({
        data: source.slice(from, Math.min(to + 1, from + serverMaxRows)),
        error: null
      }),
      { pageSize: 500 }
    );

    expect(result).toEqual(source);
  });

  it("propaga el contexto y el mensaje de un error de consulta", async () => {
    await expect(
      fetchAllRows(
        async () => ({ data: null, error: { message: "falló la consulta" } }),
        { label: "Materias" }
      )
    ).rejects.toThrow("Materias: falló la consulta");
  });
});
