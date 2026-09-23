/** Shared text helpers for mail providers. Pure, unit-tested. */

export const MAX_BODY_CHARS = 20_000;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/** Crude but safe HTML → text for reading. Never rendered as HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function clip(text: string, max = MAX_BODY_CHARS) {
  return text.length > max ? `${text.slice(0, max)}\n…[truncated]` : text;
}

/** RFC 2047 encode a header value when it has non-ASCII characters. */
export function encodeHeader(value: string): string {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  if (/^[\x00-\x7F]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

export function replySubject(subject: string) {
  const s = subject.trim() || "(no subject)";
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

/** Plain-text RFC 5322 message, base64url for the Gmail API. Headers are stripped of CR/LF. */
export function buildRawEmail(input: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ").trim();
  const headers = [
    `From: ${oneLine(input.from)}`,
    `To: ${oneLine(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${oneLine(input.inReplyTo)}`);
  const refs = [input.references, input.inReplyTo].filter(Boolean).join(" ").trim();
  if (refs) headers.push(`References: ${oneLine(refs)}`);
  const body = Buffer.from(input.body.replace(/\r?\n/g, "\r\n"), "utf8")
    .toString("base64")
    .replace(/.{76}/g, "$&\r\n");
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`, "utf8").toString("base64url");
}

/** "Name <a@b.co>" → "a@b.co" (best effort). */
export function addressOf(value: string): string {
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(value);
  return (m ? m[1] : value).trim();
}
