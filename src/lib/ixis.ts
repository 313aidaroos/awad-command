/** Ixis = Apixis family points. 100 Ixis = $1. */

export const IXIS_PER_USD = 100;

export function usdToIxis(usd: number): number {
  return Math.round(usd * IXIS_PER_USD);
}

export function ixisToUsd(ixis: number): number {
  return ixis / IXIS_PER_USD;
}

export function formatIxis(ixis: number): string {
  return `${ixis.toLocaleString()} Ixis`;
}

export function formatIxisWithUsd(ixis: number): string {
  const usd = ixisToUsd(ixis);
  return `${ixis.toLocaleString()} Ixis · $${usd.toFixed(2)}`;
}

/** SKUs for Command features priced in Ixis. */
export const COMMAND_SKUS = {
  cixyAppearanceSkin: { ixis: 1000, label: 'Cixy Appearance Skin' },
  // TODO(pricing): propose boardroom seat + agent hire SKUs to @apixiswallet
} as const;
