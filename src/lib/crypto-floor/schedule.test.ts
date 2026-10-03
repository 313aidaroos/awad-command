import { describe, expect, it } from "vitest";
import { meetingAtHour, meetingHoursFor, nextMeetingAt } from "./schedule";

describe("meeting schedule", () => {
  it("RONIN every other hour, core teams 3×/day, all-hands at 11", () => {
    expect(meetingHoursFor("ronin")).toHaveLength(11);
    expect(meetingHoursFor("samurai")).toEqual([0, 8, 16]);
    expect(meetingHoursFor("allhands")).toEqual([11]);
    expect(meetingAtHour(11)).toBe("allhands");
  });
  it("next meeting is the next :20 slot for that team", () => {
    expect(nextMeetingAt("samurai", Date.UTC(2026, 9, 2, 8, 10))).toBe("2026-10-02T08:20:00.000Z");
    expect(nextMeetingAt("samurai", Date.UTC(2026, 9, 2, 8, 30))).toBe("2026-10-02T16:20:00.000Z");
    expect(nextMeetingAt("allhands", Date.UTC(2026, 9, 2, 12, 0))).toBe("2026-10-03T11:20:00.000Z");
  });
});
