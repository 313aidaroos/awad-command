'use client';

import { FresnelShell } from '@/scene/materials/FresnelShell';
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

interface Props {
  kind: SilhouetteKind;
  accent: string;
  segs: number;
  detail: boolean;
}

export function EntitySilhouette({ kind, accent, segs, detail }: Props) {
  const props = { accent, segs, detail };
  return (
    <group>
      {kind === 'lattice' ? <LatticeKind {...props} /> : null}
      {kind === 'crystal' ? <CrystalKind {...props} /> : null}
      {kind === 'rings' ? <RingsKind {...props} /> : null}
      {kind === 'octa' ? <OctaKind {...props} /> : null}
      {kind === 'monolith' ? <MonolithKind {...props} /> : null}
      {kind === 'constellation' ? <ConstellationKind {...props} /> : null}
      {kind === 'icosa' ? <IcosaKind {...props} /> : null}
      {kind === 'folios' ? <FoliosKind {...props} /> : null}
      {kind === 'reel' ? <ReelKind {...props} /> : null}
      {kind === 'vessel' ? <VesselKind {...props} /> : null}
      {kind === 'soft' ? <SoftKind {...props} /> : null}
      <FresnelShell radius={kind === 'lattice' ? 1.42 : 1.28} accent={accent} amp={0.42} alpha={0.62} />
    </group>
  );
}
