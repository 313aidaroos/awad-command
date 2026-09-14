'use client';

import { Vessel } from '@/scene/universe/vessels';
import type { VesselKind } from '@/scene/universe/identities';

/** Kept for older imports — vessels are the silhouette language now. */
export function EntitySilhouette({ kind, accent }: { kind: VesselKind; accent: string; segs?: number }) {
  return <Vessel kind={kind} accent={accent} />;
}
