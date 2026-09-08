'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { geoSegments } from '@/lib/quality';
import { pointerGate } from '@/scene/lib/pointer';
import { EntityField } from '@/scene/universe/EntityField';
import { EntityRings } from '@/scene/universe/EntityRings';
import { EntitySilhouette } from '@/scene/universe/EntitySilhouette';
import { identityOf } from '@/scene/universe/identities';
import { OrbCore } from '@/scene/universe/OrbCore';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function ProjectOrb({ project }: { project: ProjectDefinition }) {
  const group = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const runtime = useCommandStore((s) => s.projects[project.slug]);
  const hovered = useCommandStore((s) => s.hoveredProject === project.slug);
  const focused = useCommandStore((s) => s.focusedProject);
  const enterPhase = useCommandStore((s) => s.enterPhase);
  const quality = useCommandStore((s) => s.quality.level);
  const enterProject = useCommandStore((s) => s.enterProject);
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const activity = runtime?.activity ?? 0.3;
  const status = runtime?.status ?? project.initialStatus;
  const identity = identityOf(project.slug);
  const other = Boolean(focused && focused !== project.slug);
  const selfInterior = focused === project.slug && enterPhase === 'interior';
  const segs = geoSegments(quality, 48, 32, 18);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    let target = hovered ? 1.08 : 1;
    if (other) target = 0.001;
    else if (selfInterior) target = 0.001;
    else if (focused === project.slug && enterPhase === 'approach') target = 1.22;
    else if (focused === project.slug && enterPhase === 'shell') target = 1.85;
    const current = g.scale.x;
    const next = current + (target * identity.scale - current) * 0.075;
    g.scale.setScalar(next);
    g.position.y = project.universePosition[1] + Math.sin(t * 0.55 + phase) * 0.16;
    g.visible = next > 0.05;
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
      <OrbCore
        accent={project.accent}
        status={status}
        activity={activity}
        hovered={hovered}
        radius={identity.core}
      />
      <group scale={1.85}>
        <EntitySilhouette kind={identity.kind} accent={project.accent} segs={segs} />
      </group>
      <EntityField accent={project.accent} />
      <EntityRings count={identity.rings} accent={project.accent} />
      {!focused && (
        <FloatingLabel
          id={`orb-${project.slug}`}
          priority={hovered ? 5 : 2}
          maxDist={hovered ? 74 : 52}
          fadeFrom={hovered ? 58 : 34}
          position={[0, -2.45, 0]}
        >
          <WorldName primary={hovered}>{project.name}</WorldName>
        </FloatingLabel>
      )}
    </group>
  );
}
