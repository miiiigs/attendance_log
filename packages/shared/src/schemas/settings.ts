import {
  DEFAULT_GRACE_PERIOD_MINUTES,
  DEFAULT_TIMEZONE,
  DEFAULT_WORK_END_TIME,
  DEFAULT_WORK_START_TIME,
} from "../constants/app";
import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const settingsSchema = z.object({
  organizationName: z.string().trim().min(2).max(160),
  timezone: z.string().trim().min(2).default(DEFAULT_TIMEZONE),
  workStartTime: z.string().regex(timePattern).default(DEFAULT_WORK_START_TIME),
  workEndTime: z.string().regex(timePattern).default(DEFAULT_WORK_END_TIME),
  gracePeriodMinutes: z.number().int().min(0).max(120).default(DEFAULT_GRACE_PERIOD_MINUTES),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
