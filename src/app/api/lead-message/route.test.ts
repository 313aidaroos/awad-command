vi.mock("@/lib/leadOwner", () => ({ isLeadOwner: vi.fn(async () => true) }));
import { isLeadOwner } from "@/lib/leadOwner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/lead-message/route";
import { getLeadBySlug } from "@/config/orbLeads";

const CONTRAXIS = getLeadBySlug("contraxis")!;

afterEach(() => {
  vi.mocked(isLeadOwner).mockResolvedValue(true);
  delete process.env.LEAD_MESSAGE_WEBHOOK_URL;
  delete process.env.LEAD_MESSAGE_WEBHOOK_SECRET;
});

describe("POST /api/lead-message", () => {
  it("rejects unauthenticated sends", async () => {
    vi.mocked(isLeadOwner).mockResolvedValue(false);
    const res = await POST(
      new Request("http://local/api/lead-message", {
        method: "POST",
        body: JSON.stringify({ projectSlug: "contraxis", message: "hi" }),
      }),
    );
    expect(res.status).toBe(401);
  });
  it("rejects malformed JSON", async () => {
    const res = await POST(
      new Request("http://local/api/lead-message", {
        method: "POST",
        body: "{",
      }),
    );
    expect(res.status).toBe(400);
  });
  it("still returns the Message lead UI contract for a queued send", async () => {
    const res = await POST(
      new Request("http://local/api/lead-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug: "contraxis",
          message: "from the HUD",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      demo: boolean;
      lead: { slug: string; agentId: string };
      id: string;
    };
    expect(body.status).toBe("queued");
    expect(body.demo).toBe(true);
    expect(body.lead.slug).toBe("contraxis");
    expect(body.lead.agentId).toBe(CONTRAXIS.agentId);
    expect(body.id).toBeTruthy();
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await POST(
      new Request("http://local/api/lead-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug: "ghost-orb", message: "hi" }),
      }),
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/Unknown lead/),
    });
  });
});
