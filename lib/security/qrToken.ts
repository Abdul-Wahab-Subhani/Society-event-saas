import { randomBytes } from "crypto";

/**
 * Opaque, unguessable registration token. Never derived from the Mongo
 * _id or anything sequential. 24 bytes -> ~192 bits of entropy.
 */
export function generateQrToken(): string {
  return randomBytes(24).toString("base64url");
}
