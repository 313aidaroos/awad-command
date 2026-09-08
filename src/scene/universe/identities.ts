export type VesselKind = 'hall' | 'mast' | 'spire' | 'stack' | 'cabinet';

export interface EntityIdentity {
  kind: VesselKind;
  scale: number;
  plaza: boolean;
  plazaPosition?: [number, number, number];
}

const IDENTITIES: Record<string, EntityIdentity> = {
  contraxis: { kind: 'hall', scale: 2.05, plaza: true, plazaPosition: [7.8, 0, 5.4] },
  socixis: { kind: 'mast', scale: 1.72, plaza: true, plazaPosition: [-7.2, 0, 5.6] },
  rawixis: { kind: 'stack', scale: 1.68, plaza: true, plazaPosition: [7.4, 0, -5.2] },
  awadbot: { kind: 'cabinet', scale: 1.7, plaza: true, plazaPosition: [-0.2, 0, 8.8] },
  apixis: { kind: 'spire', scale: 1.74, plaza: true, plazaPosition: [-0.4, 0, -8.4] },
  lyrixis: { kind: 'mast', scale: 1.05, plaza: false },
  halaxis: { kind: 'spire', scale: 1.12, plaza: false },
  publishing: { kind: 'stack', scale: 0.92, plaza: false },
  studios: { kind: 'cabinet', scale: 0.94, plaza: false },
  'nursery-toons': { kind: 'stack', scale: 0.88, plaza: false },
  qahwahworld: { kind: 'cabinet', scale: 0.9, plaza: false },
};

export function identityOf(slug: string): EntityIdentity {
  return IDENTITIES[slug] ?? { kind: 'cabinet', scale: 0.9, plaza: false };
}

export function listedIdentities(): Record<string, EntityIdentity> {
  return IDENTITIES;
}

export function plazaSlugs(): string[] {
  return Object.entries(IDENTITIES)
    .filter(([, id]) => id.plaza)
    .map(([slug]) => slug);
}

export function onPlaza(slug: string): boolean {
  return identityOf(slug).plaza;
}
