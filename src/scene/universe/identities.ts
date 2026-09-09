import { REALM_ISLANDS } from '@/scene/dragon/islands';

export type VesselKind = 'hangarCargo' | 'glassNet' | 'miner' | 'botStack' | 'racerPad' | 'speeder' | 'cargoDock';

export interface EntityIdentity {
  kind: VesselKind;
  scale: number;
  plaza: boolean;
  plazaPosition?: [number, number, number];
}

const KIND_BY_SLUG: Record<string, VesselKind> = {
  contraxis: 'hangarCargo',
  socixis: 'glassNet',
  rawixis: 'miner',
  awadbot: 'botStack',
  apixis: 'racerPad',
  lyrixis: 'speeder',
  halaxis: 'cargoDock',
  studios: 'racerPad',
  publishing: 'speeder',
};

const IDENTITIES: Record<string, EntityIdentity> = {
  ...Object.fromEntries(
    REALM_ISLANDS.map((realm) => [
      realm.slug,
      {
        kind: KIND_BY_SLUG[realm.slug] ?? 'botStack',
        scale: 1,
        plaza: true,
        plazaPosition: realm.position,
      } satisfies EntityIdentity,
    ]),
  ),
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
