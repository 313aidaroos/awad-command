import { describe, expect, it } from "vitest";
import { projects } from "./registry";
import { CORE_TEAM } from "./teams";
import { expertiseBrief } from "./expertise";
import { contraxis } from "./contraxis";
import { MODULES } from "@/config/modules";
describe("equal business teams", () => {
  it("covers every campus business with twelve agents and all six execution specialties", () => {
    for (const m of MODULES.filter(
      (m) => m.category === "company" || m.category === "studio",
    )) {
      const p = projects.find(
        (p) => p.slug === (m.slug === "books" ? "publishing" : m.slug),
      );
      expect(p, m.slug).toBeDefined();
      expect(p!.agents, m.slug).toHaveLength(12);
      for (const core of CORE_TEAM)
        expect(
          p!.agents.some((a) => a.role === core.role),
          `${m.slug}: ${core.role}`,
        ).toBe(true);
      expect(p!.agents.flatMap((a) => a.responsibilities ?? [])).toHaveLength(
        12,
      );
    }
  });
  it("preserves existing agent identities and produces business-specific worker briefs", () => {
    const p = projects.find((p) => p.slug === "contraxis")!;
    for (const a of contraxis.agents)
      expect(p.agents.some((x) => x.id === a.id)).toBe(true);
    const ids = projects.flatMap((p) => p.agents.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of projects)
      for (const a of p.agents) {
        expect(expertiseBrief(a)).toContain(p.slug);
        expect(expertiseBrief(a).length).toBeLessThan(3500);
      }
  });
});
