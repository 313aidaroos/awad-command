'use client';

import {
  ConstellationKind,
  CrystalKind,
  LatticeKind,
  MonolithKind,
  OctaKind,
  RingsKind,
} from '@/scene/universe/entityKinds';
import { FoliosKind, IcosaKind, ReelKind, SoftKind, VesselKind } from '@/scene/universe/entityKindsMore';
import type { SilhouetteKind } from '@/scene/universe/identities';

export function EntitySilhouette({ kind }: { kind: SilhouetteKind }) {
  return (
    <group>
      {kind === 'lattice' ? <LatticeKind /> : null}
      {kind === 'crystal' ? <CrystalKind /> : null}
      {kind === 'rings' ? <RingsKind /> : null}
      {kind === 'octa' ? <OctaKind /> : null}
      {kind === 'monolith' ? <MonolithKind /> : null}
      {kind === 'constellation' ? <ConstellationKind /> : null}
      {kind === 'icosa' ? <IcosaKind /> : null}
      {kind === 'folios' ? <FoliosKind /> : null}
      {kind === 'reel' ? <ReelKind /> : null}
      {kind === 'vessel' ? <VesselKind /> : null}
      {kind === 'soft' ? <SoftKind /> : null}
    </group>
  );
}
