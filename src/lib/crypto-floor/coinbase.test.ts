import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CoinbaseClient,
  buildCoinbaseJwt,
  coinbaseConfig,
  floorToIncrement,
  loadCoinbaseKey,
  mapCoinbaseStatus,
  toProductId,
  uuidFromSeed,
} from "./coinbase";

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("Coinbase JWT", () => {
  it("signs ES256 with an ECDSA P-256 PEM key (Coinbase SDK layout)", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "sec1", format: "pem" }).toString();
    const name = "organizations/org-1/apiKeys/key-1";
    const jwt = buildCoinbaseJwt(name, pem.replace(/\n/g, "\\n"), "GET api.coinbase.com/api/v3/brokerage/accounts", 1_800_000_000);
    const [h, p, s] = jwt.split(".");
    expect(decode(h)).toMatchObject({ alg: "ES256", kid: name, typ: "JWT" });
    expect(decode(h).nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(decode(p)).toEqual({ sub: name, iss: "cdp", nbf: 1_800_000_000, exp: 1_800_000_120, uri: "GET api.coinbase.com/api/v3/brokerage/accounts" });
    expect(verify("sha256", Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"))).toBe(true);
  });

  it("signs EdDSA with a base64 Ed25519 secret (64-byte seed+public form)", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const seed = privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32);
    const pub = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
    const secret = Buffer.concat([seed, pub]).toString("base64");
    expect(loadCoinbaseKey(secret).alg).toBe("EdDSA");
    const jwt = buildCoinbaseJwt("key-uuid", secret, "POST api.coinbase.com/api/v3/brokerage/orders");
    const [h, p, s] = jwt.split(".");
    expect(decode(h).alg).toBe("EdDSA");
    expect(verify(null, Buffer.from(`${h}.${p}`), publicKey, Buffer.from(s, "base64url"))).toBe(true);
  });

  it("rejects garbage keys", () => {
    expect(() => loadCoinbaseKey("not a key")).toThrow();
  });
});

describe("CoinbaseClient", () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const cfg = { keyName: "k", privateKey: privateKey.export({ type: "sec1", format: "pem" }).toString(), host: "api.coinbase.com" };
  type Call = { url: string; init: RequestInit };
  const fake = (body: unknown, status = 200) => {
    const calls: Call[] = [];
    const f = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    return { f, calls };
  };

  it("buys by USD amount with market IOC and a client_order_id", async () => {
    const { f, calls } = fake({ success: true, success_response: { order_id: "o-1" } });
    const c = new CoinbaseClient(cfg, f);
    const r = await c.createMarketOrder({ productId: "BTC-USD", side: "BUY", clientOrderId: "11111111-2222-4333-8444-555555555555", quoteSize: "25.00" });
    expect(r.success_response?.order_id).toBe("o-1");
    expect(calls[0].url).toBe("https://api.coinbase.com/api/v3/brokerage/orders");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      client_order_id: "11111111-2222-4333-8444-555555555555",
      product_id: "BTC-USD",
      side: "BUY",
      order_configuration: { market_market_ioc: { quote_size: "25.00" } },
    });
    const jwtPayload = decode(String((calls[0].init.headers as Record<string, string>).Authorization).split(" ")[1].split(".")[1]);
    expect(jwtPayload.uri).toBe("POST api.coinbase.com/api/v3/brokerage/orders");
  });

  it("sells by coin amount and refuses a buy without a USD amount", async () => {
    const { f, calls } = fake({ success: true, success_response: { order_id: "o-2" } });
    const c = new CoinbaseClient(cfg, f);
    await c.createMarketOrder({ productId: "ETH-USD", side: "SELL", clientOrderId: "x", baseSize: "0.0123" });
    expect(JSON.parse(String(calls[0].init.body)).order_configuration).toEqual({ market_market_ioc: { base_size: "0.0123" } });
    expect(() => c.createMarketOrder({ productId: "ETH-USD", side: "BUY", clientOrderId: "x" })).toThrow();
  });

  it("puts query params in the URL but not in the signed uri", async () => {
    const { f, calls } = fake({ pricebooks: [{ product_id: "BTC-USD", bids: [{ price: "100" }], asks: [{ price: "102" }] }] });
    const m = await new CoinbaseClient(cfg, f).bestBidAsk(["BTC-USD", "ETH-USD"]);
    expect(m.get("BTC-USD")?.mid).toBe(101);
    expect(calls[0].url).toBe("https://api.coinbase.com/api/v3/brokerage/best_bid_ask?product_ids=BTC-USD&product_ids=ETH-USD");
    const jwtPayload = decode(String((calls[0].init.headers as Record<string, string>).Authorization).split(" ")[1].split(".")[1]);
    expect(jwtPayload.uri).toBe("GET api.coinbase.com/api/v3/brokerage/best_bid_ask");
  });

  it("returns null for an unknown order and throws on other errors", async () => {
    expect(await new CoinbaseClient(cfg, fake({}, 404).f).getOrder("nope")).toBeNull();
    await expect(new CoinbaseClient(cfg, fake({ error: "x" }, 401).f).keyPermissions()).rejects.toThrow(/401/);
  });
});

describe("Coinbase helpers", () => {
  it("maps statuses (IOC partial fills count as filled)", () => {
    expect(mapCoinbaseStatus("FILLED", 1)).toBe("filled");
    expect(mapCoinbaseStatus("CANCELLED", 0.5)).toBe("filled");
    expect(mapCoinbaseStatus("EXPIRED", 0)).toBe("canceled");
    expect(mapCoinbaseStatus("FAILED", 0)).toBe("rejected");
    expect(mapCoinbaseStatus("OPEN", 0)).toBe("submitted");
  });
  it("floors to the product increment", () => {
    expect(floorToIncrement(0.123456789, "0.00000001")).toBe("0.12345678");
    expect(floorToIncrement(25.009, "0.01")).toBe("25.00");
    expect(floorToIncrement(3.99, "1")).toBe("3");
  });
  it("makes stable UUIDs and product ids, reads config", () => {
    expect(uuidFromSeed("a")).toBe(uuidFromSeed("a"));
    expect(uuidFromSeed("a")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(toProductId("btc/usd")).toBe("BTC-USD");
    expect(coinbaseConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(coinbaseConfig({ COINBASE_API_KEY_NAME: "n", COINBASE_API_PRIVATE_KEY: "p" } as unknown as NodeJS.ProcessEnv)?.host).toBe("api.coinbase.com");
  });
});

describe("readCoinbaseState", () => {
  it("reads permissions, balances and prices into the planner's state", async () => {
    const { readCoinbaseState } = await import("./liveRun");
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const cfg = { keyName: "k", privateKey: privateKey.export({ type: "sec1", format: "pem" }).toString(), host: "api.coinbase.com" };
    const routes: Record<string, unknown> = {
      "/api/v3/brokerage/key_permissions": { can_view: true, can_trade: true, can_transfer: false },
      "/api/v3/brokerage/accounts": {
        accounts: [
          { uuid: "1", currency: "USD", available_balance: { value: "120.50", currency: "USD" }, hold: { value: "0", currency: "USD" } },
          { uuid: "2", currency: "BTC", available_balance: { value: "0.001", currency: "BTC" }, hold: { value: "0", currency: "BTC" } },
          { uuid: "3", currency: "DOGE", available_balance: { value: "0", currency: "DOGE" }, hold: { value: "0", currency: "DOGE" } },
        ],
        has_next: false,
      },
      "/api/v3/brokerage/best_bid_ask": { pricebooks: [{ product_id: "BTC-USD", bids: [{ price: "99000" }], asks: [{ price: "101000" }] }] },
    };
    const f = (async (url: string) => new Response(JSON.stringify(routes[new URL(url).pathname] ?? {}), { status: 200 })) as unknown as typeof fetch;
    const { state, holdings, totalUsd } = await readCoinbaseState(new CoinbaseClient(cfg, f), ["BTC/USD", "ETH/USD"], false);
    expect(state).toMatchObject({ configured: true, ok: true, canTrade: true, canTransfer: false, usdAvailable: 120.5 });
    expect(state.coins.get("BTC/USD")).toBe(0.001);
    expect(state.prices.get("BTC/USD")).toBe(100_000);
    expect(holdings.map((h) => h.currency)).toEqual(["USD", "BTC"]);
    expect(totalUsd).toBeCloseTo(220.5);
  });

  it("reports not-connected without a client and the error when Coinbase fails", async () => {
    const { readCoinbaseState } = await import("./liveRun");
    expect((await readCoinbaseState(null, ["BTC/USD"], false)).state.configured).toBe(false);
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const cfg = { keyName: "k", privateKey: privateKey.export({ type: "sec1", format: "pem" }).toString(), host: "api.coinbase.com" };
    const f = (async () => new Response("unauthorized", { status: 401 })) as unknown as typeof fetch;
    const r = await readCoinbaseState(new CoinbaseClient(cfg, f), ["BTC/USD"], false);
    expect(r.state).toMatchObject({ configured: true, ok: false });
    expect(r.state.error).toMatch(/401/);
  });
});
