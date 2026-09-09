export type VesselKind = 'hangarCargo' | 'glassNet' | 'miner' | 'botStack' | 'racerPad' | 'speeder' | 'cargoDock';

export interface EntityIdentity {
  kind: VesselKind;
  scale: number;
  plaza: boolean;
  plazaPosition?: [number, number, number];
}

/** Shared plaza orbit — ships frame the core instead of scattering. */
export const PLAZA_ORBIT_R = 7.2;
export const PLAZA_ORBIT_OFFSET = 1.12;

export function plazaOrbit(index: number, count = 7, radius = PLAZA_ORBIT_R, offset = PLAZA_ORBIT_OFFSET): [number, number, number] {
  const a = offset + (index / count) * Math.PI * 2;
  return [Math.sin(a) * radius, 0, Math.cos(a) * radius];
}

const IDENTITIES: Record<string, EntityIdentity> = {
  contraxis: { kind: 'hangarCargo', scale: 1, plaza: true, plazaPosition: plazaOrbit(0) },
  socixis: { kind: 'glassNet', scale: 1, plaza: true, plazaPosition: plazaOrbit(4) },
  rawixis: { kind: 'miner', scale: 1, plaza: true, plazaPosition: plazaOrbit(1) },
  awadbot: { kind: 'botStack', scale: 1, plaza: true, plazaPosition: plazaOrbit(2) },
  apixis: { kind: 'racerPad', scale: 1, plaza: true, plazaPosition: plazaOrbit(3) },
  lyrixis: { kind: 'speeder', scale: 1, plaza: true, plazaPosition: plazaOrbit(6) },
  halaxis: { kind: 'cargoDock', scale: 1, plaza: true, plazaPosition: plazaOrbit(5) },
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
