/**
 * Apixis Wallet API client stubs for Command.
 * 
 * Real endpoints live in 313aidaroos/ApixisWallet and are managed by @apixiswallet.
 * Command redeems Ixis for features (skins, seats, agent hires) via this contract:
 *   POST /api/v1/quotes → /reservations → capture/release → entitlement
 * 
 * Wallet docs/INTEGRATION.md is not live yet. Until then:
 * - walletConnected() returns false and shows "Wallet connecting…" everywhere.
 * - getLedger() returns unavailable.
 * 
 * TODO(integration): wire real Wallet base URL + API key when docs land.
 */

export type WalletAvailability<T> = { available: true } & T | { available: false; reason: string };

export interface WalletLedger {
  familyIxisSold: number;
  familyIxisRedeemed: number;
  outstandingBalance: number;
}

export interface QuoteRequest {
  sku: string;
  quantity: number;
}

export interface QuoteResponse {
  quoteId: string;
  ixis: number;
  usd: number;
  expiresAt: number;
}

export interface ReservationResponse {
  reservationId: string;
  status: 'held' | 'captured' | 'released';
  ixis: number;
}

const WALLET_BASE_URL = process.env.NEXT_PUBLIC_WALLET_API_URL ?? '';
const WALLET_API_KEY = process.env.WALLET_API_KEY ?? '';

export function walletConnected(): boolean {
  return Boolean(WALLET_BASE_URL && WALLET_API_KEY);
}

export async function getLedger(): Promise<WalletAvailability<WalletLedger>> {
  if (!walletConnected()) {
    return { available: false, reason: 'Wallet API not configured yet (docs/INTEGRATION.md pending)' };
  }
  try {
    const res = await fetch(`${WALLET_BASE_URL}/api/v1/ledger`, {
      headers: { Authorization: `Bearer ${WALLET_API_KEY}` },
    });
    if (!res.ok) return { available: false, reason: `Wallet ledger returned ${res.status}` };
    const data = await res.json() as WalletLedger;
    return { available: true, ...data };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Wallet fetch failed' };
  }
}

export async function createQuote(req: QuoteRequest): Promise<WalletAvailability<QuoteResponse>> {
  if (!walletConnected()) {
    return { available: false, reason: 'Wallet connecting…' };
  }
  try {
    const res = await fetch(`${WALLET_BASE_URL}/api/v1/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WALLET_API_KEY}` },
      body: JSON.stringify(req),
    });
    if (!res.ok) return { available: false, reason: `Wallet quote returned ${res.status}` };
    const data = await res.json() as QuoteResponse;
    return { available: true, ...data };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Wallet fetch failed' };
  }
}

export async function createReservation(quoteId: string): Promise<WalletAvailability<ReservationResponse>> {
  if (!walletConnected()) {
    return { available: false, reason: 'Wallet connecting…' };
  }
  try {
    const res = await fetch(`${WALLET_BASE_URL}/api/v1/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WALLET_API_KEY}` },
      body: JSON.stringify({ quoteId }),
    });
    if (!res.ok) return { available: false, reason: `Wallet reservation returned ${res.status}` };
    const data = await res.json() as ReservationResponse;
    return { available: true, ...data };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Wallet fetch failed' };
  }
}

export async function captureReservation(reservationId: string): Promise<WalletAvailability<{ status: 'captured' }>> {
  if (!walletConnected()) {
    return { available: false, reason: 'Wallet connecting…' };
  }
  try {
    const res = await fetch(`${WALLET_BASE_URL}/api/v1/reservations/${reservationId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WALLET_API_KEY}` },
    });
    if (!res.ok) return { available: false, reason: `Wallet capture returned ${res.status}` };
    return { available: true, status: 'captured' };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Wallet fetch failed' };
  }
}

export async function releaseReservation(reservationId: string): Promise<WalletAvailability<{ status: 'released' }>> {
  if (!walletConnected()) {
    return { available: false, reason: 'Wallet connecting…' };
  }
  try {
    const res = await fetch(`${WALLET_BASE_URL}/api/v1/reservations/${reservationId}/release`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WALLET_API_KEY}` },
    });
    if (!res.ok) return { available: false, reason: `Wallet release returned ${res.status}` };
    return { available: true, status: 'released' };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Wallet fetch failed' };
  }
}
