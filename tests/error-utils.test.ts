import { describe, expect, it } from "vitest";
import { getSafeErrorMessage } from "../lib/supabase/error-utils";

describe("getSafeErrorMessage", () => {
  it("reconoce errores PostgREST recibidos como objetos planos", () => {
    expect(
      getSafeErrorMessage({
        code: "23505",
        message: "duplicate key value violates unique constraint",
        details: null,
        hint: null
      })
    ).toBe("Ya existe un registro con esos datos.");
  });

  it("mantiene ocultos los detalles de errores PostgREST no reconocidos", () => {
    expect(
      getSafeErrorMessage({
        code: "XX000",
        message: "detalle interno sensible",
        details: null,
        hint: null
      })
    ).toBe("Error del sistema. Contacta al administrador si persiste.");
  });

  it("conserva mensajes de validación controlados", () => {
    expect(getSafeErrorMessage(new Error("El código es requerido."))).toBe("El código es requerido.");
  });
});
