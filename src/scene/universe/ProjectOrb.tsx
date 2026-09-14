'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pointerGate } from '@/scene/lib/pointer';
import { EntitySilhouette } from '@/scene/universe/EntitySilhouette';
import { HitSphere } from '@/scene/universe/HitSphere';
import { identityOf } from '@/scene/universe/identities';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function ProjectOrb({ project }: { project: ProjectDefinition }) {
  const group = useRef<THREE.Group>(null);
  const hovered = useCommandStore((s) => s.hoveredProject === project.slug);
  const focused = useCommandStore((s) => s.focusedProject);
  const enterProject = useCommandStore((s) => s.enterProject);
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const identity = identityOf(project.slug);
  const other = Boolean(focused && focused !== project.slug);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    let target = hovered ? 1.04 : 1;
    if (other) target = 0.92;
    const current = g.scale.x;
    const next = current + (target * identity.scale - current) * 0.08;
    g.scale.setScalar(next);
    g.position.y = project.universePosition[1];
  });

  return (
    <group
      ref={group}
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
      <HitSphere radius={1.35} />
      <EntitySilhouette kind={identity.kind} />
      {hovered ? (
        <FloatingLabel id={`orb-${project.slug}`} priority={5} maxDist={80} fadeFrom={62} position={[0, -1.55, 0]}>
          <WorldName primary>{project.name}</WorldName>
        </FloatingLabel>
      ) : null}
    </group>
  );
}
