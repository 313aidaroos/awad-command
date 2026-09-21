import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMMAND_PROD_ORIGIN,
  DEFAULT_WALLET_APP_URL,
  commandOriginFromRequest,
  commandWalletReturnUrl,
  isAllowedCommandOrigin,
  parseWalletBalance,
  readWalletBalance,
  walletAppOrigin,
  walletDeepLink,
} from "./walletEmbed";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WALLET_URL;
  vi.unstubAllGlobals();
});

describe("walletDeepLink", () => {
  it("opens Wallet with origin=command and a production return_url", () => {
    const link = new URL(walletDeepLink(COMMAND_PROD_ORIGIN));
    expect(link.origin).toBe(DEFAULT_WALLET_APP_URL);
    expect(link.pathname).toBe("/");
    expect(link.searchParams.get("origin")).toBe("command");
    expect(link.searchParams.get("return_url")).toBe(
      "https://awad-command.vercel.app/wallet",
    );
    expect([...link.searchParams.keys()].sort()).toEqual(["origin", "return_url"]);
  });

  it("keeps localhost and 127.0.0.1 return targets, including the dev port", () => {
    expect(commandWalletReturnUrl("http://localhost:43180")).toBe(
      "http://localhost:43180/wallet",
    );
    expect(commandWalletReturnUrl("http://127.0.0.1:43180/somewhere")).toBe(
      "http://127.0.0.1:43180/wallet",
    );
    expect(new URL(walletDeepLink("http://localhost:43180")).searchParams.get("return_url")).toBe(
      "http://localhost:43180/wallet",
    );
  });

  it("refuses open redirects and falls back to production", () => {
    const evil = [
      "https://evil.example",
      "https://awad-command.vercel.app.evil.example",
      "javascript:alert(1)",
      "http://awad-command.vercel.app",
      "https://user:secret@evil.example",
      "//evil.example",
      "",
    ];
    for (const origin of evil) {
      expect(isAllowedCommandOrigin(origin)).toBe(false);
      expect(commandWalletReturnUrl(origin)).toBe(
        "https://awad-command.vercel.app/wallet",
      );
    }
  });

  it("reads the request host only when it is allowlisted", () => {
    expect(commandOriginFromRequest("localhost:43180", null)).toBe("http://localhost:43180");
    expect(commandOriginFromRequest("awad-command.vercel.app", "https")).toBe(
      "https://awad-command.vercel.app",
    );
    expect(commandOriginFromRequest("evil.example", "https")).toBe(
      "https://awad-command.vercel.app",
    );
    expect(commandOriginFromRequest("awad-command.vercel.app", "http")).toBe(
      "https://awad-command.vercel.app",
    );
    expect(commandOriginFromRequest(null, null)).toBe("https://awad-command.vercel.app");
  });

  it("strips a caller path so return_url is only /wallet", () => {
    expect(commandWalletReturnUrl("https://awad-command.vercel.app/payments?next=https://evil.example")).toBe(
      "https://awad-command.vercel.app/wallet",
    );
  });

  it("uses NEXT_PUBLIC_WALLET_URL origin and drops extra path or query", () => {
    process.env.NEXT_PUBLIC_WALLET_URL = "https://wallet.example.com/buy?steal=1";
    const link = new URL(walletDeepLink("https://awad-command.vercel.app"));
    expect(link.origin).toBe("https://wallet.example.com");
    expect(link.pathname).toBe("/");
    expect(link.searchParams.get("steal")).toBeNull();
    expect(link.searchParams.get("origin")).toBe("command");
  });

  it("ignores a non-http wallet base", () => {
    process.env.NEXT_PUBLIC_WALLET_URL = "javascript:alert(1)";
    expect(walletAppOrigin()).toBe(DEFAULT_WALLET_APP_URL);
    process.env.NEXT_PUBLIC_WALLET_URL = "http://evil.example";
    expect(walletAppOrigin()).toBe(DEFAULT_WALLET_APP_URL);
  });
});

describe("parseWalletBalance", () => {
  it("reads a numeric available balance", () => {
    expect(parseWalletBalance({ available: 52000, currency: "Ixis" })).toEqual({
      available: true,
      ixis: 52000,
      currency: "Ixis",
    });
    expect(parseWalletBalance({ available: 0 })).toEqual({
      available: true,
      ixis: 0,
      currency: "Ixis",
    });
  });

  it("does not invent a balance from null, strings, or failures", () => {
    expect(parseWalletBalance({ available: null, paid: null })).toEqual({ available: false });
    expect(parseWalletBalance({ available: "52000" })).toEqual({ available: false });
    expect(parseWalletBalance({ available: Number.NaN })).toEqual({ available: false });
    expect(parseWalletBalance({ message: "Connect Supabase auth" })).toEqual({ available: false });
    expect(parseWalletBalance(null)).toEqual({ available: false });
  });
});

describe("readWalletBalance", () => {
  it("returns a numeric available balance and ignores null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe("https://apixis-wallet.vercel.app/api/v1/wallet");
        const headers = new Headers(init?.headers);
        expect(headers.get("authorization")).toBe("Bearer session-token");
        return new Response(JSON.stringify({ available: 1200, currency: "Ixis" }), {
          status: 200,
        });
      }),
    );
    await expect(readWalletBalance("session-token")).resolves.toEqual({
      available: true,
      ixis: 1200,
      currency: "Ixis",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ available: null }), { status: 200 })),
    );
    await expect(readWalletBalance("session-token")).resolves.toEqual({ available: false });
  });

  it("does not call Wallet without a session token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(readWalletBalance(null)).resolves.toEqual({ available: false });
    await expect(readWalletBalance("")).resolves.toEqual({ available: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
