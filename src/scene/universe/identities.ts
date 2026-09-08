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
}

const IDENTITIES: Record<string, EntityIdentity> = {
  contraxis: { kind: 'lattice', rings: 3, scale: 1.28 },
  apixis: { kind: 'crystal', rings: 2, scale: 1.16 },
  lyrixis: { kind: 'rings', rings: 3, scale: 1.14 },
  halaxis: { kind: 'octa', rings: 2, scale: 1.2 },
  rawixis: { kind: 'monolith', rings: 1, scale: 1.22 },
  socixis: { kind: 'constellation', rings: 2, scale: 1.12 },
  awadbot: { kind: 'icosa', rings: 2, scale: 1.16 },
  publishing: { kind: 'folios', rings: 1, scale: 1.1 },
  studios: { kind: 'reel', rings: 2, scale: 1.14 },
  'nursery-toons': { kind: 'soft', rings: 1, scale: 1.04 },
  qahwahworld: { kind: 'vessel', rings: 1, scale: 1.06 },
};

export function identityOf(slug: string): EntityIdentity {
  return IDENTITIES[slug] ?? { kind: 'soft', rings: 1, scale: 1 };
}
