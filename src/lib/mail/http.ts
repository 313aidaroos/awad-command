// Change note (Claude, Sep 2026): New. Owner-only guard shared by the mail routes. See docs/LAUNCH_NOTES.md.
/** Browser writes must come from COMMAND itself. A missing Origin (same-origin GET/fetch in some browsers) is allowed. */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.name === "ZodError") return "Check the mailbox, message and text.";
  return e instanceof Error ? e.message : fallback;
}
