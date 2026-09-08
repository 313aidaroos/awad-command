'use client';

import { KitModel } from '@/scene/kit/KitModel';
import { pointerGate } from '@/scene/lib/pointer';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { identityOf, type VesselKind } from '@/scene/universe/identities';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

/** Craft-first vessels — hangars stay as pads so the silhouette is a ship, not a slab. */
function VesselBody({ kind }: { kind: VesselKind }) {
  if (kind === 'hangarCargo') {
    return (
      <group>
        <KitModel name="platformLarge" metalize scale={2.4} />
        <KitModel name="craftCargoB" metalize position={[0, 0.35, 0]} scale={6.2} rotation={[0, 0.55, 0]} />
      </group>
    );
  }
  if (kind === 'glassNet') {
    return (
      <group>
        <KitModel name="platformHigh" metalize scale={2.2} />
        <KitModel name="craftSpeederD" metalize position={[0, 0.45, 0]} scale={6.4} rotation={[0, -0.7, 0]} />
        <KitModel name="dishLarge" metalize position={[1.35, 1.55, -0.4]} scale={2.4} rotation={[0.25, 0.6, 0]} />
      </group>
    );
  }
  if (kind === 'miner') {
    return (
      <group>
        <KitModel name="platformLong" metalize scale={2.1} />
        <KitModel name="craftMiner" metalize position={[0, 0.4, 0]} scale={6.6} rotation={[0, 0.35, 0]} />
        <KitModel name="machineGen" metalize position={[-1.5, 0, 1.1]} scale={2.4} />
      </group>
    );
  }
  if (kind === 'botStack') {
    return (
      <group>
        <KitModel name="platformLarge" metalize scale={2.2} />
        <KitModel name="rover" metalize position={[0.15, 0.15, 0.2]} scale={5.4} rotation={[0, 0.8, 0]} />
        <KitModel name="structureDetailed" metalize position={[-1.15, 0, -0.55]} scale={3.6} />
      </group>
    );
  }
  if (kind === 'racerPad') {
    return (
      <group>
        <KitModel name="platformHigh" metalize scale={2.15} />
        <KitModel name="craftRacer" metalize position={[0, 0.4, 0]} scale={6.8} rotation={[0, -0.25, 0]} />
      </group>
    );
  }
  if (kind === 'speeder') {
    return (
      <group>
        <KitModel name="platformLarge" metalize scale={2.1} />
        <KitModel name="craftSpeederC" metalize position={[0, 0.35, 0]} scale={6.5} rotation={[0, 0.9, 0]} />
      </group>
    );
  }
  return (
    <group>
      <KitModel name="platformLong" metalize scale={2.2} />
      <KitModel name="craftCargoA" metalize position={[0, 0.35, 0]} scale={6.3} rotation={[0, -0.45, 0]} />
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
