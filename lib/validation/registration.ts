import { z } from "zod";

export const registrationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  universityId: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(30).optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

/**
 * Cross-checks submitted fields against an event's configured required
 * fields (Event.requiredFields, e.g. ['universityId']).
 */
export function findMissingRequiredFields(
  input: RegistrationInput,
  requiredFields: string[]
): string[] {
  return requiredFields.filter((field) => {
    const value = (input as Record<string, string | undefined>)[field];
    return !value || value.trim().length === 0;
  });
}
