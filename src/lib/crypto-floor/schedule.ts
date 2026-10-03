/** Team meeting schedule (shared by the server meeting runner and the UI). Pure, no imports. */
export type ScheduledDesk = "samurai" | "neon" | "orbit" | "phantom" | "ronin";

/** Hour of the day (UTC) % 8 → team. RONIN every other hour; each core team three times a day. */
export const MEETING_ROTATION: ScheduledDesk[] = ["samurai", "ronin", "neon", "ronin", "orbit", "ronin", "phantom", "ronin"];
/** Daily all-hands of the desk leads (before the 13:00 UTC review + email). Replaces that hour's RONIN slot. */
export const ALLHANDS_HOUR_UTC = 11;
export const MEETING_MINUTE = 20;

export function meetingAtHour(hourUtc: number): ScheduledDesk | "allhands" {
  return hourUtc === ALLHANDS_HOUR_UTC ? "allhands" : MEETING_ROTATION[hourUtc % MEETING_ROTATION.length];
}

/** Next scheduled meeting start for a team (or the all-hands), as an ISO string. */
export function nextMeetingAt(who: ScheduledDesk | "allhands", now: number): string {
  const start = new Date(now);
  start.setUTCMinutes(MEETING_MINUTE, 0, 0);
  if (start.getTime() <= now) start.setUTCHours(start.getUTCHours() + 1);
  for (let i = 0; i < 48; i++) {
    const t = new Date(start.getTime() + i * 3_600_000);
    if (meetingAtHour(t.getUTCHours()) === who) return t.toISOString();
  }
  return start.toISOString();
}

/** UTC hours a team meets each day. */
export function meetingHoursFor(who: ScheduledDesk | "allhands"): number[] {
  return Array.from({ length: 24 }, (_, h) => h).filter((h) => meetingAtHour(h) === who);
}
