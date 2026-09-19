import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/leadOwner", () => ({ isLeadOwner: vi.fn(async () => true) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceSupabase: vi.fn() }));
import { createServiceSupabase } from "@/lib/supabase/service";
import { isLeadOwner } from "@/lib/leadOwner";
import { createEmailDraft, sendEmailDraft, resendRequest } from "./cixyEmail";
beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(isLeadOwner).mockResolvedValue(true);
  process.env.RESEND_API_KEY = "test-only";
});
describe("private email execution", () => {
  it("refuses signed-out draft creation before reading the database", async () => {
    vi.mocked(isLeadOwner).mockResolvedValue(false);
    await expect(
      createEmailDraft({
        to: "person@example.com",
        subject: "Hello",
        body: "Draft",
      }),
    ).rejects.toThrow("Sign in");
  });
  it("keeps provider secrets on the server and uses a stable idempotency header", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "accepted" }), { status: 200 }),
    );
    await resendRequest(
      "/emails",
      { method: "POST", headers: { "Idempotency-Key": "draft-one" } },
      fetcher as typeof fetch,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "draft-one",
          Authorization: "Bearer test-only",
        }),
      }),
    );
  });
  it("never sends a draft already claimed by another request", async () => {
    const chain = {
      eq: () => chain,
      select: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    vi.mocked(createServiceSupabase).mockReturnValue({
      from: () => ({ update: () => chain }),
    } as unknown as NonNullable<ReturnType<typeof createServiceSupabase>>);
    const fetcher = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmailDraft("14d89ca4-7c64-4d83-98b2-bd1c60e3bc40"),
    ).rejects.toThrow("already submitted");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not claim provider acceptance when the provider rejects the request", async () => {
    await expect(
      resendRequest(
        "/emails",
        {},
        vi.fn(async () => new Response("{}", { status: 403 })) as typeof fetch,
      ),
    ).rejects.toThrow("403");
  });
});
