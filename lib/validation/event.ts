import { z } from "zod";

const REQUIRED_FIELD_OPTIONS = ["universityId", "phone"] as const;

export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).default(""),
    date: z.coerce.date(),
    endTime: z.coerce.date(),
    venue: z.string().trim().min(1).max(200),
    capacity: z.number().int().min(1),
    bannerUrl: z.string().url().optional(),
    autoPublishAt: z.coerce.date().optional(),
    registrationDeadline: z.coerce.date().optional(),
    reminderHoursBefore: z.array(z.number().int().min(0)).default([24, 2]),
    waitlistEnabled: z.boolean().default(true),
    requiredFields: z.array(z.enum(REQUIRED_FIELD_OPTIONS)).default([]),
  })
  .refine((data) => data.endTime > data.date, {
    message: "endTime must be after date",
    path: ["endTime"],
  });

export const eventUpdateSchema = eventCreateSchema.innerType().partial();

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
