import { afterEach, describe, expect, it } from 'vitest';
import { getLeadBySlug } from '@/config/orbLeads';
import { sendLeadMessage } from '@/lib/leadOutbound';
import { runCeoTurn, type AnthropicLike, type CeoSnapshot } from '@/ceo/runCeoTurn';

const CONTRAXIS = getLeadBySlug('contraxis')!;

function snapshot(): CeoSnapshot {
  return {
    dataMode: 'demo',
    projects: {},
    agents: {},
    events: { buffer: [], unread: 0 },
    approvals: [],
  };
}

function mockHub() {
  const posts: Array<{ url: string; body: unknown; auth?: string }> = [];
  const outbound = {
    persist: async <T>(message: T) => message,
    fetchImpl: async (url: RequestInfo | URL, init?: RequestInit) => {
      posts.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? '{}')),
        auth: (init?.headers as Record<string, string> | undefined)?.Authorization,
      });
      return new Response('ok', { status: 200 });
    },
  };
  return { posts, outbound };
}

afterEach(() => {
  delete process.env.LEAD_MESSAGE_WEBHOOK_URL;
  delete process.env.LEAD_MESSAGE_WEBHOOK_SECRET;
  delete process.env.AI_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_MODEL;
});

describe('runCeoTurn demo path', () => {
  it('sends a real outbound lead-message for “tell Contraxis Lead to ping me”', async () => {
    process.env.LEAD_MESSAGE_WEBHOOK_URL = 'https://hub.test/lead';
    process.env.LEAD_MESSAGE_WEBHOOK_SECRET = 's3cret';
    const { posts, outbound } = mockHub();
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'tell Contraxis Lead to ping me' }], context: snapshot() },
      { outbound },
    );
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({
      agentId: CONTRAXIS.agentId,
      message: 'Awad asked Cixy to tell you: ping me',
      projectSlug: 'contraxis',
    });
    expect(posts[0].auth).toBe('Bearer s3cret');
    expect(result.provider).toBe('demo');
    expect(result.text).toMatch(/Message delivered to Contraxis Lead/);
    expect(result.text).toMatch(/lead-inbound/);
    expect(result.actions.some((action) => action.name === 'message_lead' && action.status === 'delivered')).toBe(
      true,
    );
  });

  it('unknown slug is a graceful error with no fake success', async () => {
    process.env.LEAD_MESSAGE_WEBHOOK_URL = 'https://hub.test/lead';
    const { posts, outbound } = mockHub();
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'tell NotACompany Lead to ping me' }], context: snapshot() },
      { outbound },
    );
    expect(posts).toHaveLength(0);
    expect(result.text).toMatch(/Unknown lead/);
    expect(result.text).not.toMatch(/delivered/i);
    expect(result.actions.some((action) => action.name === 'message_lead' && action.status === 'unknown')).toBe(true);
  });

  it('does not claim delivery when the webhook is unset', async () => {
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'tell Contraxis Lead to ping me' }], context: snapshot() },
      { outbound: { persist: async (message) => message } },
    );
    expect(result.text).toMatch(/queued for Contraxis Lead/);
    expect(result.text).toMatch(/DEMO/);
    expect(result.text).not.toMatch(/Message delivered/);
  });
});

describe('runCeoTurn Anthropic gate', () => {
  it('keeps demo when Anthropic is not enabled', async () => {
    const result = await runCeoTurn({
      messages: [{ role: 'user', content: 'what needs my attention' }],
      context: snapshot(),
    });
    expect(result.provider).toBe('demo');
    expect(result.error).toBeUndefined();
  });

  it('requests the current Claude API Sonnet id when ANTHROPIC_MODEL is unset', async () => {
    let requested: string | undefined;
    const client: AnthropicLike = {
      messages: {
        create: async (args) => {
          requested = args.model;
          return {
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: 'ok' }],
          };
        },
      },
    };
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'status' }], context: snapshot() },
      { client },
    );
    expect(requested).toBe('claude-sonnet-5');
    expect(result.provider).toBe('anthropic');
  });

  it('returns provider error instead of demo when Anthropic is enabled and the call fails', async () => {
    process.env.AI_PROVIDER = 'ANTHROPIC';
    process.env.ANTHROPIC_API_KEY = ' sk-test ';
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          throw new Error('401 invalid x-api-key');
        },
      },
    };
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'status' }], context: snapshot() },
      { client },
    );
    expect(result.provider).toBe('error');
    expect(result.error).toMatch(/401 invalid x-api-key/);
    expect(result.text).toMatch(/Anthropic CEO request failed/);
    expect(result.text).not.toMatch(/DEMO/i);
    expect(result.actions).toEqual([]);
  });
});

describe('runCeoTurn Anthropic tool_use', () => {
  it('executes message_lead from a tool_use loop and returns honest status', async () => {
    process.env.LEAD_MESSAGE_WEBHOOK_URL = 'https://hub.test/lead';
    const { posts, outbound } = mockHub();
    let round = 0;
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          round += 1;
          if (round === 1) {
            return {
              stop_reason: 'tool_use',
              content: [
                {
                  type: 'tool_use',
                  id: 'tu_1',
                  name: 'message_lead',
                  input: { projectSlug: 'contraxis', message: 'Please ping Awad.' },
                },
              ],
            };
          }
          return {
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: 'I delivered that to Contraxis Lead.' }],
          };
        },
      },
    };

    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'ask the Contraxis lead to ping me' }], context: snapshot() },
      { client, outbound, sendLead: (input) => sendLeadMessage(input, outbound) },
    );

    expect(posts).toHaveLength(1);
    expect(result.provider).toBe('anthropic');
    expect(result.text).toMatch(/Message delivered to Contraxis Lead/);
    expect(result.actions[0]).toMatchObject({ name: 'message_lead', status: 'delivered', projectSlug: 'contraxis' });
  });

  it('strips a fake success if the tool failed', async () => {
    let round = 0;
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          round += 1;
          if (round === 1) {
            return {
              stop_reason: 'tool_use',
              content: [
                {
                  type: 'tool_use',
                  id: 'tu_1',
                  name: 'message_lead',
                  input: { projectSlug: 'ghost-orb', message: 'hi' },
                },
              ],
            };
          }
          return {
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: 'Message delivered successfully.' }],
          };
        },
      },
    };
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'tell ghost-orb to hi' }], context: snapshot() },
      {
        client,
        outbound: { persist: async (message) => message },
      },
    );
    expect(result.text).toMatch(/Unknown lead/);
    expect(result.text).not.toMatch(/delivered/i);
  });

  it('persists create_task through the server helper and reports honestly', async () => {
    const created: unknown[] = [];
    let round = 0;
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          round += 1;
          if (round === 1) {
            return {
              stop_reason: 'tool_use',
              content: [
                {
                  type: 'tool_use',
                  id: 'tu_task',
                  name: 'create_task',
                  input: {
                    agentId: 'contraxis.analytics',
                    title: 'Summarise leads',
                    instruction: "Summarise today's leads and conversion",
                    requiresApproval: false,
                    risk: 'low',
                  },
                },
              ],
            };
          }
          return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Queued the analytics pass.' }] };
        },
      },
    };
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'have analytics summarise leads' }], context: snapshot() },
      {
        client,
        persistTask: async (input) => {
          created.push(input);
          return {
            ok: true,
            demo: true,
            taskId: 'task-demo',
            agentId: 'contraxis.analytics-agent',
            projectSlug: 'contraxis',
            title: input.title,
            instruction: input.instruction,
            status: 'queued',
            requiresApproval: false,
            risk: 'low',
            kind: 'other',
            capabilities: [],
          };
        },
      },
    );
    expect(created).toHaveLength(1);
    expect(result.actions[0]).toMatchObject({ name: 'create_task', taskId: 'task-demo', demo: true });
    expect(result.text).toMatch(/Summarise leads/);
    expect(result.text).toMatch(/queued locally \(DEMO\)/);
  });

  it('collects navigate and open_panel for the client', async () => {
    let round = 0;
    const client: AnthropicLike = {
      messages: {
        create: async () => {
          round += 1;
          if (round === 1) {
            return {
              stop_reason: 'tool_use',
              content: [
                { type: 'tool_use', id: 'n1', name: 'navigate', input: { project: 'contraxis' } },
                { type: 'tool_use', id: 'p1', name: 'open_panel', input: { kind: 'lead' } },
              ],
            };
          }
          return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Showing Contraxis.' }] };
        },
      },
    };
    const result = await runCeoTurn(
      { messages: [{ role: 'user', content: 'show Contraxis and the lead panel' }], context: snapshot() },
      { client },
    );
    expect(result.actions).toEqual(
      expect.arrayContaining([
        { name: 'navigate', project: 'contraxis', agent: undefined, mode: undefined },
        { name: 'open_panel', kind: 'lead' },
      ]),
    );
  });
});
