import { z } from "zod";

export const societyUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  logo: z.string().url().optional(),
  description: z.string().trim().max(2000).optional(),
  certificateTemplate: z
    .object({
      backgroundUrl: z.string().url().optional(),
      signatureUrl: z.string().url().optional(),
      layoutConfig: z
        .object({
          nameY: z.number().min(0).max(1).optional(),
          titleY: z.number().min(0).max(1).optional(),
          fontFamily: z.string().optional(),
          accentColor: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});
