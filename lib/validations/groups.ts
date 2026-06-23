import { z } from "zod";
import { canUseShift } from "@/lib/permissions";

export const groupSchema = z
  .object({
    academic_cycle_id: z.string().uuid("Selecciona un ciclo escolar."),
    career_id: z.string().uuid("Selecciona una carrera."),
    quarter: z.coerce.number().int().min(1).max(12),
    modality: z.enum(["escolarizado", "modular", "virtual_modular", "maestrias", "sabatino"]),
    shift: z.enum(["matutino", "vespertino"]),
    name: z.string().min(1, "Escribe el nombre del grupo.").max(80),
    classroom_id: z.string().uuid().optional().or(z.literal(""))
  })
  .superRefine((value, ctx) => {
    if (!canUseShift(value.modality, value.shift)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shift"],
        message: "El turno no está permitido para esta modalidad."
      });
    }
  });

export type GroupInput = z.infer<typeof groupSchema>;
