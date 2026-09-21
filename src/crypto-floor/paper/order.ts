import { assertAlpacaPaperBase, assertPaperMode, PaperGuardError } from "./guard";
import { primaryMethod, type DeskId } from "./desks";
import { normalizeCryptoSymbol } from "./journal";
import { isResearchOnlySymbol } from "./universe";

export type DeskSide = "buy" | "sell";

export type DeskOrder = {
  deskId: DeskId;
  method: string;
  side: DeskSide;
  symbol: string;
  notional: number;
  timeInForce: "gtc";
  type: "market";
};

export type BrokerAck = {
  id: string;
  status: string;
  symbol: string;
  side: DeskSide;
};

export interface PaperBroker {
  /** Must be the Alpaca paper origin. Checked before submit. */
  baseUrl: string;
  submit(order: DeskOrder): Promise<BrokerAck>;
}

const MAX_NOTIONAL = 1000;

export function buildDeskOrder(input: {
  deskId: DeskId;
  side: DeskSide;
  symbol: string;
  notional: number;
}): DeskOrder {
  if (!(input.notional > 0) || input.notional > MAX_NOTIONAL) {
    throw new PaperGuardError(
      `Paper notional must be greater than 0 and at most ${MAX_NOTIONAL} USD.`,
    );
  }
  const symbol = normalizeCryptoSymbol(input.symbol);
  if (isResearchOnlySymbol(symbol)) {
    throw new PaperGuardError(
      `${symbol} is not Alpaca-listed. Research notes only. No paper order.`,
    );
  }
  return {
    deskId: input.deskId,
    method: primaryMethod[input.deskId],
    side: input.side,
    symbol,
    notional: Math.round(input.notional * 100) / 100,
    timeInForce: "gtc",
    type: "market",
  };
}

/** Body that would be posted to the paper trading API. Tests assert this shape. */
export function alpacaPaperOrderBody(order: DeskOrder) {
  return {
    symbol: order.symbol,
    side: order.side,
    type: order.type,
    time_in_force: order.timeInForce,
    notional: order.notional.toFixed(2),
  };
}

/**
 * Deterministic paper order path.
 * The running floor stays observe-only (`execution: "observe"`), because
 * AwadBot already places orders on this same paper book.
 * `execution: "submit"` is for tests and an explicit operator tool — it still
 * cannot target a live URL.
 */
export async function submitDeskPaperOrder(
  input: {
    deskId: DeskId;
    side: DeskSide;
    symbol: string;
    notional: number;
  },
  broker: PaperBroker,
  opts: { mode: string | undefined | null; execution: "observe" | "submit" },
): Promise<BrokerAck> {
  assertPaperMode(opts.mode);
  assertAlpacaPaperBase(broker.baseUrl);
  if (opts.execution !== "submit") {
    throw new PaperGuardError(
      "Shared AwadBot book is observe-only. COMMAND does not submit a second order stream.",
    );
  }
  const order = buildDeskOrder(input);
  const ack = await broker.submit(order);
  if (ack.side !== order.side || !ack.id) {
    throw new PaperGuardError("Paper broker ack did not match the desk order.");
  }
  return ack;
}
