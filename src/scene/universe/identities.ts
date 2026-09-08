export type SilhouetteKind =
  | 'lattice'
  | 'crystal'
  | 'rings'
  | 'octa'
  | 'monolith'
  | 'constellation'
  | 'icosa'
  | 'folios'
  | 'reel'
  | 'soft'
  | 'vessel';

export interface EntityIdentity {
  kind: SilhouetteKind;
  rings: number;
  scale: number;
  core: number;
}

/**
 * Quiet graphite monuments. CEO is the only object that should dominate the frame.
 * Rings stay at 0 — orbit lines read as a space-game network.
 */
const IDENTITIES: Record<string, EntityIdentity> = {
  contraxis: { kind: 'lattice', rings: 0, scale: 0.82, core: 0.12 },
  apixis: { kind: 'crystal', rings: 0, scale: 0.48, core: 0.08 },
  lyrixis: { kind: 'rings', rings: 0, scale: 0.44, core: 0.08 },
  halaxis: { kind: 'octa', rings: 0, scale: 0.46, core: 0.08 },
  rawixis: { kind: 'monolith', rings: 0, scale: 0.5, core: 0.08 },
  socixis: { kind: 'constellation', rings: 0, scale: 0.45, core: 0.08 },
  awadbot: { kind: 'icosa', rings: 0, scale: 0.48, core: 0.08 },
  publishing: { kind: 'folios', rings: 0, scale: 0.46, core: 0.08 },
  studios: { kind: 'reel', rings: 0, scale: 0.47, core: 0.08 },
  'nursery-toons': { kind: 'soft', rings: 0, scale: 0.42, core: 0.08 },
  qahwahworld: { kind: 'vessel', rings: 0, scale: 0.44, core: 0.08 },
};

export function identityOf(slug: string): EntityIdentity {
  return IDENTITIES[slug] ?? { kind: 'soft', rings: 0, scale: 0.42, core: 0.08 };
}

export function listedIdentities(): Record<string, EntityIdentity> {
  return IDENTITIES;
}
