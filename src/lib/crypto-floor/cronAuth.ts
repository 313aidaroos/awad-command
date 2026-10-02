import { timingSafeEqual } from "node:crypto";

/** Cron routes accept only `Authorization: Bearer <CRON_SECRET>`. An unset secret never authorizes. */
export function cronAuthorized(request: Request, secret = process.env.CRON_SECRET): boolean {
  const expected = secret?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
