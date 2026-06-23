import { PostgrestError } from "@supabase/supabase-js";

export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof PostgrestError) {
    const codeMap: Record<string, string> = {
      "23505": "Ya existe un registro con esos datos.",
      "23503": "No se puede eliminar porque hay datos vinculados.",
      "23514": "El valor ingresado no cumple las reglas del sistema.",
      "42501": "No tienes permiso para realizar esta accion."
    };
    if (error.code && codeMap[error.code]) {
      return codeMap[error.code];
    }
    if (error.message.includes("El aula ya tiene una clase")) return error.message;
    if (error.message.includes("El docente ya tiene una clase")) return error.message;
    if (error.message.includes("El grupo ya tiene una clase")) return error.message;
    if (error.message.includes("El docente no cumple con el perfil")) return error.message;
    if (error.message.includes("El docente excede su limite")) return error.message;
    if (error.message.includes("La materia ya tiene otro docente")) return error.message;
    if (error.message.includes("Las horas asignadas deben ser")) return error.message;
    return "Error del sistema. Contacta al administrador si persiste.";
  }

  if (error instanceof Error) {
    if (error.message.includes("fetch failed") || error.message.includes("network")) {
      return "No se pudo conectar con el servidor. Revisa tu conexion a internet.";
    }
    if (error.message.includes("JWT expired") || error.message.includes("token")) {
      return "Tu sesion ha expirado. Inicia sesion nuevamente.";
    }
    return error.message;
  }

  return "Ocurrio un error inesperado.";
}
