/**
 * Subscriptions snapshot for the Headquarters dashboard.
 *
 * Static data from Awad's Oct 2, 2026 inbox audit (both Gmail accounts).
 * Structured so a future `/api/subscriptions` feed can replace it:
 * keep the exported names and shapes, swap the constants for a fetch.
 */
export type SubscriptionStatus = "ok" | "attention" | "failing";

export type Subscription = {
  /** Display name, e.g. "ChatGPT Plus" */
  name: string;
  /** Monthly price display, e.g. "$20/mo" (approximates with ~ when inferred) */
  price: string;
  /** Renewal display, e.g. "Oct 19" or "~Oct 8" (approximates with ~) */
  renewal: string;
  status: SubscriptionStatus;
};

export type SubscriptionFlag = {
  service: string;
  detail: string;
  severity: "red" | "amber";
};

export const SUBSCRIPTIONS_UPDATED = "2026-10-02";
export const SUBSCRIPTIONS_MONTHLY_TOTAL = "~$280";

export const activeSubscriptions: Subscription[] = [
  { name: "ChatGPT Plus", price: "$20/mo", renewal: "~Oct 8", status: "ok" },
  {
    name: "LinkedIn Premium",
    price: "$67/mo",
    renewal: "starts Oct 29",
    status: "attention",
  },
  { name: "Vercel Pro", price: "~$32/mo", renewal: "~Oct 26", status: "ok" },
  { name: "Cursor", price: "~$60/mo", renewal: "payment failing", status: "failing" },
  {
    name: "Disney+ / Hulu / ESPN",
    price: "$21.99/mo",
    renewal: "Oct 19",
    status: "ok",
  },
  {
    name: "Meta Verified",
    price: "$14.99/mo",
    renewal: "Oct 18",
    status: "ok",
  },
  {
    name: "Paramount+",
    price: "$13.99/mo",
    renewal: "Oct 18",
    status: "ok",
  },
  { name: "Kling AI", price: "$10.60/mo", renewal: "Oct 19", status: "ok" },
  { name: "GeForce NOW", price: "$9.99/mo", renewal: "~Oct 6", status: "ok" },
  { name: "X Premium", price: "$8/mo", renewal: "Oct 27", status: "ok" },
  { name: "iCloud+ 200GB", price: "$2.99/mo", renewal: "Oct 21", status: "ok" },
  {
    name: "Namecheap Relate Pro",
    price: "$9.88/mo",
    renewal: "monthly",
    status: "ok",
  },
  {
    name: "Google Workspace",
    price: "paid",
    renewal: "card updated Oct 2",
    status: "ok",
  },
];

export const subscriptionFlags: SubscriptionFlag[] = [
  {
    service: "LinkedIn Premium",
    detail: "Free trial ends Oct 29 — cancel before then if unwanted",
    severity: "red",
  },
  {
    service: "Cursor",
    detail: "Card failing since July — account likely suspended. Fix or cancel",
    severity: "red",
  },
  {
    service: "X (old Google Play plan)",
    detail: "Suspended $53/mo — cancel it, already paying $8/mo direct",
    severity: "amber",
  },
  {
    service: "Apple — NFL+",
    detail: "Billing problem on $14.99/mo — check Apple subscriptions",
    severity: "amber",
  },
];
