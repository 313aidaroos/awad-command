import { createHash, timingSafeEqual } from 'node:crypto';

/** Dedicated inbound secret, then the shared hub secret, then the Grok alias. */
export function leadInboundSecret(): string | undefined {
  return (
    process.env.LEAD_INBOUND_WEBHOOK_SECRET ||
    process.env.LEAD_MESSAGE_WEBHOOK_SECRET ||
    process.env.GROK_BOT_API_KEY ||
    undefined
  );
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Constant-time Bearer compare. Missing or wrong secret is always false. */
export function authorizeLeadWebhook(request: Request): boolean {
  const expected = leadInboundSecret();
  if (!expected) return false;
  const header = request.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return false;
  const token = header.slice(7).trim();
  if (!token) return false;
  return timingSafeEqual(sha256(token), sha256(expected));
}
