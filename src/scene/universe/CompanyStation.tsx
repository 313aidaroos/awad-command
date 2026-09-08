'use client';

import { pointerGate } from '@/scene/lib/pointer';
import { identityOf } from '@/scene/universe/identities';
import { Vessel } from '@/scene/universe/vessels';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function CompanyStation({ project }: { project: ProjectDefinition }) {
  const hovered = useCommandStore((s) => s.hoveredProject === project.slug);
  const focused = useCommandStore((s) => s.focusedProject);
  const enterProject = useCommandStore((s) => s.enterProject);
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const identity = identityOf(project.slug);
  if (focused && focused !== project.slug) return null;

  return (
    <group
      position={project.universePosition}
      scale={identity.scale}
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
      <Vessel kind={identity.kind} accent={project.accent} />
      <mesh position={[0, 1.1, 0]} visible={false}>
        <boxGeometry args={[2.2, 2.6, 2.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hovered ? (
        <FloatingLabel
          id={`orb-${project.slug}`}
          priority={5}
          maxDist={48}
          fadeFrom={36}
          position={[0, 2.2, 0]}
        >
          <WorldName primary>{project.name}</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}
