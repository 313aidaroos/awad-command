import { describe, expect, it, vi } from "vitest";
import { openToken, sealToken, hasMailTokenKey } from "@/lib/mail/crypto";
import { addressOf, buildRawEmail, encodeHeader, htmlToText, replySubject } from "@/lib/mail/format";
import { gmailBodyText, gmailQuery, googleAuthUrl, googleSendDraft } from "@/lib/mail/google";
import { graphListPath, microsoftAuthUrl } from "@/lib/mail/microsoft";
import { mailRedirectUri, stateMatches, newState } from "@/lib/mail/oauth";
import { CEO_ANTHROPIC_TOOLS } from "@/ceo/tools";

const env = { MAIL_TOKEN_KEY: "x".repeat(40) };

describe("mailbox token sealing", () => {
  it("round-trips and never stores plaintext", () => {
    const sealed = sealToken("1//refresh-token", env);
    expect(sealed).not.toContain("refresh-token");
    expect(openToken(sealed, env)).toBe("1//refresh-token");
  });
  it("fails closed with a different key or a tampered token", () => {
    const sealed = sealToken("secret", env);
    expect(() => openToken(sealed, { MAIL_TOKEN_KEY: "y".repeat(40) })).toThrow();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("other").toString("base64url");
    expect(() => openToken(parts.join("."), env)).toThrow();
    expect(hasMailTokenKey({ MAIL_TOKEN_KEY: "short" })).toBe(false);
  });
});

describe("mail formatting", () => {
  it("builds a threaded plain-text reply with no header injection", () => {
    const raw = buildRawEmail({
      from: "awad@apixis.dev",
      to: "a@b.co\r\nBcc: evil@x.co",
      subject: "Re: Hello\r\nBcc: evil@x.co",
      body: "Thanks — see you soon.",
      inReplyTo: "<m1@b.co>",
      references: "<m0@b.co>",
    });
    const text = Buffer.from(raw, "base64url").toString("utf8");
    const headers = text.split("\r\n\r\n")[0];
    expect(headers.split("\r\n").some((h) => h.startsWith("Bcc:"))).toBe(false);
    expect(headers).toContain("In-Reply-To: <m1@b.co>");
    expect(headers).toContain("References: <m0@b.co> <m1@b.co>");
    expect(Buffer.from(text.split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64").toString("utf8")).toBe(
      "Thanks — see you soon.",
    );
  });
  it("encodes non-ASCII subjects and prefixes Re: once", () => {
    expect(encodeHeader("Salaam — hi")).toMatch(/^=\?UTF-8\?B\?/);
    expect(replySubject("Re: x")).toBe("Re: x");
    expect(replySubject("x")).toBe("Re: x");
    expect(addressOf("Jane <jane@x.co>")).toBe("jane@x.co");
  });
  it("turns HTML into text without scripts", () => {
    const text = htmlToText("<p>Hi&nbsp;there</p><script>alert(1)</script><br>Bye");
    expect(text).toMatch(/^Hi there\n+Bye$/);
    expect(text).not.toContain("alert");
  });
  it("prefers text/plain in Gmail multipart bodies", () => {
    const b64 = (s: string) => Buffer.from(s).toString("base64url");
    expect(
      gmailBodyText({
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/html", body: { data: b64("<b>html</b>") } },
          { mimeType: "text/plain", body: { data: b64("plain") } },
        ],
      }),
    ).toBe("plain");
  });
});

describe("provider queries", () => {
  it("Gmail: inbox, unread and an exact time window", () => {
    expect(gmailQuery({ unreadOnly: true, sinceHours: 24 }, 1_700_000_000_000)).toBe(
      "in:inbox is:unread after:1699913600",
    );
    expect(gmailQuery({ query: "from:bank" })).toBe("from:bank");
  });
  it("Graph: search cannot be combined with orderby", () => {
    expect(graphListPath({ query: 'invoice "x"' })).not.toContain("orderby");
    expect(decodeURIComponent(graphListPath({ unreadOnly: true }))).toContain("isRead eq false");
  });
  it("asks Google for offline read + compose only, and Microsoft for offline mail access", () => {
    const g = new URL(googleAuthUrl("https://c.example/api/mail/callback/google", "s", { GOOGLE_CLIENT_ID: "id" }));
    expect(g.searchParams.get("access_type")).toBe("offline");
    expect(g.searchParams.get("scope")).toContain("gmail.readonly");
    expect(g.searchParams.get("scope")).not.toContain("mail.google.com");
    const m = new URL(microsoftAuthUrl("https://c.example/api/mail/callback/microsoft", "s", { MICROSOFT_CLIENT_ID: "id" }));
    expect(m.searchParams.get("scope")).toContain("offline_access");
  });
  it("sends only the given Gmail draft", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ id: "sent1" }), { status: 200 }));
    await googleSendDraft({ accessToken: "t", email: "a@b.co" }, "d1", f as never);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/drafts\/send$/);
    expect(JSON.parse(String(init.body))).toEqual({ id: "d1" });
  });
});

describe("oauth", () => {
  it("state must match exactly", () => {
    const s = newState("google");
    expect(s.startsWith("google.")).toBe(true);
    expect(stateMatches(s, s)).toBe(true);
    expect(stateMatches(s, `${s}x`)).toBe(false);
    expect(stateMatches(undefined, s)).toBe(false);
  });
  it("uses NEXT_PUBLIC_SITE_URL for the registered redirect", () => {
    expect(mailRedirectUri("google", "https://preview.vercel.app/api/mail/connect/google", { NEXT_PUBLIC_SITE_URL: "https://awad-command.vercel.app/" })).toBe(
      "https://awad-command.vercel.app/api/mail/callback/google",
    );
  });
});

describe("Cixy cannot send email", () => {
  it("has no tool that sends", () => {
    const names = CEO_ANTHROPIC_TOOLS.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["inbox_overview", "search_inbox", "read_inbox_email", "draft_reply"]));
    expect(names.some((n) => /send/i.test(n))).toBe(false);
  });
});
