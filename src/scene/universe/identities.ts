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

const IDENTITIES: Record<string, EntityIdentity> = {
  contraxis: { kind: 'lattice', rings: 2, scale: 1.12, core: 0.2 },
  apixis: { kind: 'crystal', rings: 0, scale: 1.08, core: 0.16 },
  lyrixis: { kind: 'rings', rings: 0, scale: 1.05, core: 0.14 },
  halaxis: { kind: 'octa', rings: 0, scale: 1.1, core: 0.14 },
  rawixis: { kind: 'monolith', rings: 0, scale: 1.08, core: 0.12 },
  socixis: { kind: 'constellation', rings: 0, scale: 1.06, core: 0.12 },
  awadbot: { kind: 'icosa', rings: 1, scale: 1.06, core: 0.18 },
  publishing: { kind: 'folios', rings: 0, scale: 1.04, core: 0.12 },
  studios: { kind: 'reel', rings: 0, scale: 1.05, core: 0.16 },
  'nursery-toons': { kind: 'soft', rings: 0, scale: 1.02, core: 0.2 },
  qahwahworld: { kind: 'vessel', rings: 0, scale: 1.02, core: 0.14 },
};

export function identityOf(slug: string): EntityIdentity {
  return IDENTITIES[slug] ?? { kind: 'soft', rings: 0, scale: 1, core: 0.18 };
}

export function listedIdentities(): Record<string, EntityIdentity> {
  return IDENTITIES;
}
