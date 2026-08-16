import { PROFILE_STATUSES } from "../constants/app";
import { z } from "zod";

export const personCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
});

export type PersonCreateInput = z.infer<typeof personCreateSchema>;

export const personUpdateSchema = personCreateSchema.extend({
  status: z.enum(PROFILE_STATUSES).default("active"),
});

export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;
