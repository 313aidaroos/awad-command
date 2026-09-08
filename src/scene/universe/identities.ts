export type VesselKind =
  | 'hall'
  | 'mast'
  | 'discs'
  | 'spire'
  | 'stack'
  | 'cabinet'
  | 'cluster'
  | 'folios'
  | 'stage'
  | 'tent'
  | 'urn';

export interface EntityIdentity {
  kind: VesselKind;
  scale: number;
}

const IDENTITIES: Record<string, EntityIdentity> = {
  contraxis: { kind: 'hall', scale: 1.22 },
  socixis: { kind: 'mast', scale: 1.08 },
  lyrixis: { kind: 'discs', scale: 1.05 },
  halaxis: { kind: 'spire', scale: 1.12 },
  rawixis: { kind: 'stack', scale: 1.1 },
  awadbot: { kind: 'cabinet', scale: 1.08 },
  apixis: { kind: 'cluster', scale: 1.1 },
  publishing: { kind: 'folios', scale: 0.92 },
  studios: { kind: 'stage', scale: 0.94 },
  'nursery-toons': { kind: 'tent', scale: 0.88 },
  qahwahworld: { kind: 'urn', scale: 0.9 },
};

export function identityOf(slug: string): EntityIdentity {
  return IDENTITIES[slug] ?? { kind: 'tent', scale: 0.9 };
}

export function listedIdentities(): Record<string, EntityIdentity> {
  return IDENTITIES;
}
