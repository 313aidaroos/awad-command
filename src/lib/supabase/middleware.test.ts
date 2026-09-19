import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/env", () => ({
  AWAD_COMMAND_SCHEMA: "awad_command",
  allowedEmail: () => "owner@example.com",
  isAuthConfigured: vi.fn(() => true),
}));
import { createServerClient } from "@supabase/ssr";
import { isAuthConfigured } from "@/lib/env";
import { updateSession } from "./middleware";
function auth(email: string | null) {
  vi.mocked(createServerClient).mockReturnValue({
    auth: {
      getUser: async () => ({ data: { user: email ? { email } : null } }),
    },
  } as unknown as ReturnType<typeof createServerClient>);
}
beforeEach(() => {
  vi.mocked(isAuthConfigured).mockReturnValue(true);
  auth(null);
});
describe("private owner perimeter", () => {
  it("blocks all offices, static artwork, videos, and old preview pages before rendering", async () => {
    for (const path of [
      "/",
      "/command",
      "/agents",
      "/email",
      "/business-world",
      "/headquarters/cixy-idle.mp4",
      "/business-world/offices.png",
      "/awad-command-preview.html",
      "/_next/image?url=x",
    ]) {
      const r = await updateSession(
        new NextRequest(`https://example.com${path}`),
      );
      expect(r.status, path).toBe(307);
      expect(r.headers.get("location")).toBe("https://example.com/login");
    }
  });
  it("rejects anonymous APIs and signed-in non-owners", async () => {
    expect(
      (
        await updateSession(
          new NextRequest("https://example.com/api/mission-control"),
        )
      ).status,
    ).toBe(401);
    auth("outsider@example.com");
    expect(
      (await updateSession(new NextRequest("https://example.com/command")))
        .status,
    ).toBe(307);
  });
  it("fails closed when auth configuration is absent", async () => {
    vi.mocked(isAuthConfigured).mockReturnValue(false);
    expect(
      (await updateSession(new NextRequest("https://example.com/"))).status,
    ).toBe(307);
    expect(
      (await updateSession(new NextRequest("https://example.com/login")))
        .status,
    ).toBe(200);
  });
  it("lets only the owner through with private cache headers", async () => {
    auth("owner@example.com");
    const r = await updateSession(
      new NextRequest("https://example.com/command"),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });
  it("keeps the bearer-verified inbound webhook reachable without exposing GET", async () => {
    expect(
      (
        await updateSession(
          new NextRequest("https://example.com/api/lead-inbound", {
            method: "POST",
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await updateSession(
          new NextRequest("https://example.com/api/lead-inbound"),
        )
      ).status,
    ).toBe(401);
  });
});
