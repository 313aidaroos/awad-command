// Change note (Claude, Sep 2026): New. AES-256-GCM sealing of mailbox tokens with MAIL_TOKEN_KEY. See docs/LAUNCH_NOTES.md.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Mailbox refresh tokens are encrypted at rest (AES-256-GCM) with MAIL_TOKEN_KEY.
 * Server only. Rotating MAIL_TOKEN_KEY means reconnecting every mailbox.
 */

export const MAIL_TOKEN_KEY_MIN = 32;

function key(env: Record<string, string | undefined> = process.env) {
  const secret = (env.MAIL_TOKEN_KEY ?? "").trim();
  if (secret.length < MAIL_TOKEN_KEY_MIN)
    throw new Error("MAIL_TOKEN_KEY is missing or shorter than 32 characters.");
  return createHash("sha256").update(secret, "utf8").digest();
}

export function hasMailTokenKey(env: Record<string, string | undefined> = process.env) {
  return (env.MAIL_TOKEN_KEY ?? "").trim().length >= MAIL_TOKEN_KEY_MIN;
}

/** v1.<iv>.<tag>.<ciphertext>, all base64url. */
export function sealToken(plain: string, env?: Record<string, string | undefined>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(env), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function openToken(sealed: string, env?: Record<string, string | undefined>) {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unreadable mailbox token.");
  const decipher = createDecipheriv("aes-256-gcm", key(env), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
