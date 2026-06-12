import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const activeStateSchema = z.enum(["true", "false"]);
