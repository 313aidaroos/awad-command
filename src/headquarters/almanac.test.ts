import { describe, it, expect } from "vitest";
import { moonPhase, wordForDate } from "./almanac";
import { interleaveSources } from "./news-topics";
describe("daily observatory", () => {
  it("keeps a word for a calendar date and changes the next day", () => {
    expect(wordForDate("2026-09-19")).toEqual(wordForDate("2026-09-19"));
    expect(wordForDate("2026-09-20")[0]).not.toBe(wordForDate("2026-09-19")[0]);
  });
  it("estimates known reference new moon and opposite full moon", () => {
    const t = Date.UTC(2000, 0, 6, 18, 14);
    expect(moonPhase(new Date(t))).toMatchObject({
      name: "New moon",
      illumination: 0,
    });
    expect(
      moonPhase(new Date(t + (29.530588853 / 2) * 86400000)),
    ).toMatchObject({ name: "Full moon", illumination: 100 });
  });
  it("interleaves publishers and removes duplicate URLs", () => {
    const item = (source: string, url: string) => ({
      source,
      url,
      title: url,
      publishedAt: null,
      kind: "reporting",
    });
    expect(
      interleaveSources([
        [item("A", "1"), item("A", "2")],
        [item("B", "3"), item("B", "1")],
      ]).map((i) => i.url),
    ).toEqual(["1", "3", "2"]);
  });
});
