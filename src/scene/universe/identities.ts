export type VesselKind = 'hangarCargo' | 'glassNet' | 'miner' | 'botStack' | 'racerPad' | 'speeder' | 'cargoDock';

export interface EntityIdentity {
  kind: VesselKind;
  scale: number;
  plaza: boolean;
  plazaPosition?: [number, number, number];
}

const IDENTITIES: Record<string, EntityIdentity> = {
  contraxis: { kind: 'hangarCargo', scale: 1, plaza: true, plazaPosition: [8.4, 0, 3.15] },
  socixis: { kind: 'glassNet', scale: 1, plaza: true, plazaPosition: [-8.4, 0, 3.15] },
  rawixis: { kind: 'miner', scale: 1, plaza: true, plazaPosition: [6.6, 0, -6.4] },
  awadbot: { kind: 'botStack', scale: 1, plaza: true, plazaPosition: [0, 0, -8.35] },
  apixis: { kind: 'racerPad', scale: 1, plaza: true, plazaPosition: [-6.6, 0, -6.4] },
  lyrixis: { kind: 'speeder', scale: 1, plaza: true, plazaPosition: [10.4, 0, -2.1] },
  halaxis: { kind: 'cargoDock', scale: 1, plaza: true, plazaPosition: [-10.4, 0, -2.1] },
  publishing: { kind: 'speeder', scale: 0.85, plaza: false },
  studios: { kind: 'racerPad', scale: 0.85, plaza: false },
  'nursery-toons': { kind: 'botStack', scale: 0.8, plaza: false },
  qahwahworld: { kind: 'cargoDock', scale: 0.8, plaza: false },
};

export function identityOf(slug: string): EntityIdentity {
  return IDENTITIES[slug] ?? { kind: 'botStack', scale: 0.85, plaza: false };
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
