import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("@/lib/leadOwner", () => ({ isLeadOwner: vi.fn(async () => false) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceSupabase: vi.fn() }));
import { isLeadOwner } from "@/lib/leadOwner";
import { createServiceSupabase } from "@/lib/supabase/service";
import { GET, POST } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isLeadOwner).mockResolvedValue(false);
});
describe("office chat privacy", () => {
  it("protects conversation history and AI replies", async () => {
    expect(
      (
        await GET(
          new Request(
            "http://local/api/office-chat?agentId=contraxis.sales-agent",
          ),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await POST(
          new Request("http://local/api/office-chat", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(401);
    expect(createServiceSupabase).not.toHaveBeenCalled();
  });
  it("rejects unknown agents and malformed messages", async () => {
    vi.mocked(isLeadOwner).mockResolvedValue(true);
    expect(
      (
        await POST(
          new Request("http://local/api/office-chat", {
            method: "POST",
            body: JSON.stringify({
              agentId: "invented",
              message: "Hello",
              requestId: crypto.randomUUID(),
            }),
          }),
        )
      ).status,
    ).toBe(400);
    expect(createServiceSupabase).not.toHaveBeenCalled();
  });
});
