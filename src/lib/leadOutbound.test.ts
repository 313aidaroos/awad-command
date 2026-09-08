import { afterEach, describe, expect, it } from 'vitest';
import { getLeadBySlug } from '@/config/orbLeads';
import {
  leadMessageApiBody,
  leadMessageHttpStatus,
  resolveLeadContact,
  sendLeadMessage,
} from '@/lib/leadOutbound';

const CONTRAXIS = getLeadBySlug('contraxis')!;

function persistPassThrough() {
  return async <T>(message: T) => message;
}

afterEach(() => {
  delete process.env.LEAD_MESSAGE_WEBHOOK_URL;
  delete process.env.LEAD_MESSAGE_WEBHOOK_SECRET;
});

describe('resolveLeadContact', () => {
  it('resolves slug, lead name, and agentId', () => {
    expect(resolveLeadContact('contraxis')?.agentId).toBe(CONTRAXIS.agentId);
    expect(resolveLeadContact('Contraxis Lead')?.slug).toBe('contraxis');
    expect(resolveLeadContact(undefined, CONTRAXIS.agentId)?.slug).toBe('contraxis');
  });

  it('returns undefined for unknown names', () => {
    expect(resolveLeadContact('not-a-real-orb')).toBeUndefined();
  });
});

describe('sendLeadMessage', () => {
  it('unknown slug is a hard error, not success', async () => {
    const result = await sendLeadMessage({ projectSlug: 'nope', message: 'hello' }, { persist: persistPassThrough() });
    expect(result.ok).toBe(false);
    expect(result.status).toBe('unknown');
    expect(result.error).toMatch(/Unknown lead/);
    expect(leadMessageHttpStatus(result)).toBe(404);
    expect(leadMessageApiBody(result)).toEqual({ error: result.error });
  });

  it('queues as DEMO when the webhook URL is missing', async () => {
    const result = await sendLeadMessage(
      { projectSlug: 'contraxis', message: 'ping Awad' },
      { persist: persistPassThrough(), id: () => 'lm_test', now: () => 1 },
    );
    expect(result).toMatchObject({ ok: true, status: 'queued', demo: true });
    expect(result.record?.direction).toBe('outbound');
    expect(leadMessageHttpStatus(result)).toBe(200);
  });

  it('posts the hub-locked body and claims delivered only on 2xx', async () => {
    process.env.LEAD_MESSAGE_WEBHOOK_URL = 'https://hub.test/lead';
    process.env.LEAD_MESSAGE_WEBHOOK_SECRET = 's3cret';
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const result = await sendLeadMessage(
      { projectSlug: 'contraxis', message: 'ping Awad' },
      {
        persist: persistPassThrough(),
        fetchImpl: async (url, init) => {
          calls.push({ url: String(url), init: init ?? {} });
          return new Response('ok', { status: 200 });
        },
      },
    );
    expect(result.status).toBe('delivered');
    expect(result.demo).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://hub.test/lead');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      agentId: CONTRAXIS.agentId,
      message: 'ping Awad',
      projectSlug: 'contraxis',
    });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer s3cret');
  });

  it('does not claim delivery when the webhook fails', async () => {
    process.env.LEAD_MESSAGE_WEBHOOK_URL = 'https://hub.test/lead';
    const result = await sendLeadMessage(
      { agentId: CONTRAXIS.agentId, message: 'hello' },
      {
        persist: persistPassThrough(),
        fetchImpl: async () => new Response('nope', { status: 500 }),
      },
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/500/);
    expect(leadMessageHttpStatus(result)).toBe(502);
  });
});
