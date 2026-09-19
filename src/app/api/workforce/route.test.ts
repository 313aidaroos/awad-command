import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("@/lib/leadOwner", () => ({ isLeadOwner: vi.fn(async () => false) }));
vi.mock("@/lib/agentTasks", () => ({
  persistCeoTask: vi.fn(),
  resolveAgentRef: vi.fn(),
}));
import { isLeadOwner } from "@/lib/leadOwner";
import { persistCeoTask } from "@/lib/agentTasks";
import { GET, POST, PATCH } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isLeadOwner).mockResolvedValue(false);
});
describe("owner workforce controls", () => {
  it("blocks anonymous reads, edits, and assignments", async () => {
    expect((await GET()).status).toBe(401);
    expect(
      (
        await POST(
          new Request("http://local/api/workforce", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await PATCH(
          new Request("http://local/api/workforce", {
            method: "PATCH",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(401);
    expect(persistCeoTask).not.toHaveBeenCalled();
  });
  it("blocks cross-origin task submissions", async () => {
    vi.mocked(isLeadOwner).mockResolvedValue(true);
    expect(
      (
        await POST(
          new Request("http://local/api/workforce", {
            method: "POST",
            headers: { origin: "http://other" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
    expect(persistCeoTask).not.toHaveBeenCalled();
  });
});
