/** Paper-only gate. Live Alpaca hosts are refused before any request is sent. */

export const ALPACA_PAPER_ORIGIN = "https://paper-api.alpaca.markets";
export const ALPACA_DATA_ORIGIN = "https://data.alpaca.markets";

const REFUSED_HOSTS = new Set([
  "api.alpaca.markets",
  "broker-api.alpaca.markets",
  "live.alpaca.markets",
]);

export class PaperGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaperGuardError";
  }
}

export function assertPaperMode(mode: string | undefined | null) {
  if ((mode ?? "").trim().toLowerCase() !== "paper") {
    throw new PaperGuardError(
      "TRADE_MODE must be paper. Live trading is refused.",
    );
  }
}

/** Trading calls may use only the Alpaca paper origin. */
export function assertAlpacaPaperBase(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PaperGuardError("Alpaca base URL is not a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new PaperGuardError("Alpaca base URL must be https.");
  }
  const host = url.hostname.toLowerCase();
  if (
    REFUSED_HOSTS.has(host) ||
    host.includes("live") ||
    host.endsWith(".alpaca.markets") === false
  ) {
    throw new PaperGuardError(`Refusing non-paper host ${host}.`);
  }
  if (url.origin !== ALPACA_PAPER_ORIGIN) {
    throw new PaperGuardError(
      `Refusing Alpaca origin ${url.origin}. Only ${ALPACA_PAPER_ORIGIN} is allowed.`,
    );
  }
  return url.origin;
}

/** Market-data reads only. Never pass this origin to an order request. */
export function assertAlpacaDataBase(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PaperGuardError("Market data URL is not valid.");
  }
  if (url.origin !== ALPACA_DATA_ORIGIN) {
    throw new PaperGuardError(
      `Market data host must be ${ALPACA_DATA_ORIGIN}.`,
    );
  }
  return url.origin;
}
