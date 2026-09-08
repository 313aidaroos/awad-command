'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geoSegments } from '@/lib/quality';
import { pointerGate } from '@/scene/lib/pointer';
import { EntityField } from '@/scene/universe/EntityField';
import { EntityRings } from '@/scene/universe/EntityRings';
import { EntitySilhouette } from '@/scene/universe/EntitySilhouette';
import { HitSphere } from '@/scene/universe/HitSphere';
import { identityOf } from '@/scene/universe/identities';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function ProjectOrb({ project }: { project: ProjectDefinition }) {
  const group = useRef<THREE.Group>(null);
  const runtime = useCommandStore((s) => s.projects[project.slug]);
  const hovered = useCommandStore((s) => s.hoveredProject === project.slug);
  const focused = useCommandStore((s) => s.focusedProject);
  const quality = useCommandStore((s) => s.quality.level);
  const enterProject = useCommandStore((s) => s.enterProject);
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const activity = runtime?.activity ?? 0.3;
  const identity = identityOf(project.slug);
  const other = Boolean(focused && focused !== project.slug);
  const segs = geoSegments(quality, 48, 32, 18);
  const detail = quality !== 'low';

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    let target = hovered ? 1.045 : 1;
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
      <HitSphere radius={1.55} />
      <EntitySilhouette kind={identity.kind} accent={project.accent} segs={segs} detail={detail} />
      <EntityField accent={project.accent} activity={activity} />
      <EntityRings count={identity.rings} accent={project.accent} />
      <FloatingLabel
        id={`orb-${project.slug}`}
        priority={hovered ? 5 : focused === project.slug ? 4 : 3}
        maxDist={hovered ? 80 : 58}
        fadeFrom={hovered ? 62 : 40}
        position={[0, -2.2, 0]}
      >
        <WorldName primary={hovered || focused === project.slug}>{project.name}</WorldName>
      </FloatingLabel>
    </group>
  );
}
