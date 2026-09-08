'use client';

import { KitModel } from '@/scene/kit/KitModel';
import type { KitName } from '@/scene/kit/catalog';
import { pointerGate } from '@/scene/lib/pointer';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { identityOf, type VesselKind } from '@/scene/universe/identities';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

/** One authored Quaternius hull per plaza company — not Kenney toys, not Mesh boxes. */
const HULL: Record<VesselKind, { ship: KitName; scale: number; yaw: number }> = {
  hangarCargo: { ship: 'shipImperial', scale: 0.26, yaw: 0.55 },
  glassNet: { ship: 'shipExecutioner', scale: 0.42, yaw: -0.7 },
  miner: { ship: 'shipChallenger', scale: 0.4, yaw: 0.35 },
  botStack: { ship: 'shipInsurgent', scale: 0.4, yaw: 0.8 },
  racerPad: { ship: 'shipSpitfire', scale: 0.42, yaw: -0.25 },
  speeder: { ship: 'shipStriker', scale: 0.5, yaw: 0.9 },
  cargoDock: { ship: 'shipZenith', scale: 0.36, yaw: -0.45 },
};

function VesselBody({ kind }: { kind: VesselKind }) {
  const hull = HULL[kind];
  return (
    <group>
      <KitModel name="floorDark" scale={0.55} />
      <KitModel name={hull.ship} position={[0, 0.08, 0]} scale={hull.scale} rotation={[0, hull.yaw, 0]} />
    </group>
  );
}

export function CompanyVessel({ project }: { project: ProjectDefinition }) {
  const identity = identityOf(project.slug);
  const pos = identity.plazaPosition ?? project.universePosition;
  const hovered = useCommandStore((s) => s.hoveredProject === project.slug);
  const enterProject = useCommandStore((s) => s.enterProject);
  const hoverProject = useCommandStore((s) => s.hoverProject);

  return (
    <group
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        if (pointerGate.suppressClick) return;
        enterProject(project.slug);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hoverProject(project.slug);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverProject(undefined);
        document.body.style.cursor = 'grab';
      }}
    >
      <VesselBody kind={identity.kind} />
      <FloatingLabel
        id={`vessel-${project.slug}`}
        priority={hovered ? 5 : 2}
        maxDist={hovered ? 36 : 24}
        fadeFrom={hovered ? 28 : 16}
        position={[0, 2.85, 0]}
      >
        <WorldName primary={hovered}>{project.name}</WorldName>
      </FloatingLabel>
    </group>
  );
}

export { CompanyVessel as ProjectOrb };
