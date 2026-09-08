'use client';

import { KitModel } from '@/scene/kit/KitModel';
import { pointerGate } from '@/scene/lib/pointer';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { identityOf, type VesselKind } from '@/scene/universe/identities';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

function VesselBody({ kind, accent }: { kind: VesselKind; accent: string }) {
  const tint = accent;
  if (kind === 'hangarCargo') {
    return (
      <group>
        <KitModel name="hangarLargeA" metalize tint={tint} scale={5.2} />
        <KitModel name="craftCargoB" metalize tint="#d5dae2" position={[0, 1.05, 0.2]} scale={3.4} rotation={[0, 0.4, 0]} />
      </group>
    );
  }
  if (kind === 'glassNet') {
    return (
      <group>
        <KitModel name="hangarRoundGlass" metalize tint={tint} scale={5.6} />
        <KitModel name="dishLarge" metalize tint="#cfd4dc" position={[0, 2.4, 0]} scale={3.2} />
        <KitModel name="dishDetailed" metalize position={[1.6, 1.1, 1.1]} scale={2.2} rotation={[0.2, 0.8, 0]} />
      </group>
    );
  }
  if (kind === 'miner') {
    return (
      <group>
        <KitModel name="machineGenLarge" metalize tint={tint} scale={4.4} position={[-0.8, 0, 0.4]} />
        <KitModel name="craftMiner" metalize tint="#d8dce4" position={[0.7, 0.85, 0]} scale={3.6} rotation={[0, -0.5, 0]} />
      </group>
    );
  }
  if (kind === 'botStack') {
    return (
      <group>
        <KitModel name="structureDetailed" metalize tint={tint} scale={5.4} />
        <KitModel name="rover" metalize tint="#cfd6e0" position={[1.15, 0, 0.35]} scale={3.1} rotation={[0, 0.6, 0]} />
        <KitModel name="machineWireless" metalize position={[-0.85, 0, -0.4]} scale={3.2} />
      </group>
    );
  }
  if (kind === 'racerPad') {
    return (
      <group>
        <KitModel name="hangarLargeB" metalize tint={tint} scale={5.1} />
        <KitModel name="craftRacer" metalize tint="#e4e8ee" position={[0.15, 1.1, 0]} scale={3.5} rotation={[0, 0.25, 0]} />
      </group>
    );
  }
  if (kind === 'speeder') {
    return (
      <group>
        <KitModel name="hangarSmallA" metalize tint={tint} scale={4.8} />
        <KitModel name="craftSpeederC" metalize tint="#dfe4ec" position={[0, 0.95, 0.15]} scale={3.8} rotation={[0, -0.35, 0]} />
      </group>
    );
  }
  return (
    <group>
      <KitModel name="hangarRoundA" metalize tint={tint} scale={5} />
      <KitModel name="craftCargoA" metalize tint="#d4d9e2" position={[0.1, 0.9, 0]} scale={3.5} rotation={[0, 0.55, 0]} />
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
      <VesselBody kind={identity.kind} accent={project.accent} />
      <FloatingLabel
        id={`vessel-${project.slug}`}
        priority={hovered ? 5 : 2}
        maxDist={hovered ? 36 : 24}
        fadeFrom={hovered ? 28 : 16}
        position={[0, 3.35, 0]}
      >
        <WorldName primary={hovered}>{project.name}</WorldName>
      </FloatingLabel>
    </group>
  );
}

export { CompanyVessel as ProjectOrb };
