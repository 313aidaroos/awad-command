'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { money } from '@/lib/format';
import { geoSegments } from '@/lib/quality';
import { EntityField } from '@/scene/universe/EntityField';
import { EntityRings } from '@/scene/universe/EntityRings';
import { EntitySilhouette } from '@/scene/universe/EntitySilhouette';
import { identityOf } from '@/scene/universe/identities';
import { OrbCore } from '@/scene/universe/OrbCore';
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
  const segs = geoSegments(quality, 28, 18, 12);

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

  const mrr = runtime?.metrics.mrr ?? 0;
  const agents = project.agents.length;
  const stat =
    typeof mrr === 'number' && mrr > 0
      ? `${money(mrr)} · ${agents} agents`
      : project.slug === 'awadbot'
        ? `paper · ${agents} agents`
        : `${agents} agents`;

  return (
    <group ref={group} position={project.universePosition}>
      <OrbCore
        accent={project.accent}
        status={status}
        activity={activity}
        hovered={hovered}
        radius={1.02}
        onClick={() => enterProject(project.slug)}
        onPointerOver={() => hoverProject(project.slug)}
        onPointerOut={() => hoverProject(undefined)}
      />
      <group scale={1.28}>
        <EntitySilhouette kind={identity.kind} accent={project.accent} segs={segs} />
      </group>
      <EntityField accent={project.accent} />
      <EntityRings count={identity.rings} accent={project.accent} />
      {!focused && (
        <Html center distanceFactor={16} position={[0, -1.85, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-center whitespace-nowrap">
            <div className="text-[11px] tracking-[0.22em] font-light text-[rgba(230,232,236,0.88)]">
              {project.name}
            </div>
            <div className="font-num text-[9.5px] text-[var(--muted)] mt-0.5">{stat}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
