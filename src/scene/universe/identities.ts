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
  contraxis: { kind: 'lattice', rings: 3, scale: 1.32, core: 0.28 },
  apixis: { kind: 'crystal', rings: 0, scale: 1.22, core: 0.22 },
  lyrixis: { kind: 'rings', rings: 0, scale: 1.18, core: 0.18 },
  halaxis: { kind: 'octa', rings: 0, scale: 1.28, core: 0.2 },
  rawixis: { kind: 'monolith', rings: 0, scale: 1.26, core: 0.16 },
  socixis: { kind: 'constellation', rings: 0, scale: 1.2, core: 0.14 },
  awadbot: { kind: 'icosa', rings: 1, scale: 1.2, core: 0.24 },
  publishing: { kind: 'folios', rings: 0, scale: 1.16, core: 0.12 },
  studios: { kind: 'reel', rings: 0, scale: 1.18, core: 0.2 },
  'nursery-toons': { kind: 'soft', rings: 0, scale: 1.08, core: 0.28 },
  qahwahworld: { kind: 'vessel', rings: 0, scale: 1.1, core: 0.16 },
};

export function identityOf(slug: string): EntityIdentity {
  return IDENTITIES[slug] ?? { kind: 'soft', rings: 0, scale: 1, core: 0.22 };
}
