import { describe, expect, it } from "vitest";
import {
  boardroomAgents,
  resolveBoardroomParticipants,
} from "@/boardroom/roster";

describe("boardroom seating registry", () => {
  it("includes every configured business agent", () => {
    expect(resolveBoardroomParticipants({ kind: "all" })).toHaveLength(
      boardroomAgents.length,
    );
    expect(boardroomAgents.length).toBeGreaterThanOrEqual(180);
  });

  it("can address one business or one specialty", () => {
    const business = resolveBoardroomParticipants({
      kind: "business",
      value: "contraxis",
    });
    expect(business.length).toBeGreaterThanOrEqual(12);
    expect(business.every((agent) => agent.projectSlug === "contraxis")).toBe(
      true,
    );
    const leads = resolveBoardroomParticipants({ kind: "role", value: "Lead" });
    expect(leads.length).toBeGreaterThan(1);
    expect(leads.every((agent) => agent.role === "Lead")).toBe(true);
  });
});
