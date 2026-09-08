'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { money } from '@/lib/format';
import { particleCount } from '@/lib/quality';
import { OrbCore } from '@/scene/universe/OrbCore';
import { STATUS_COLOR } from '@/scene/universe/statusColor';
import { useCommandStore } from '@/store/useCommandStore';
import type { ProjectDefinition } from '@/types/project';

export function ProjectOrb({ project }: { project: ProjectDefinition }) {
  const group = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const runtime = useCommandStore((s) => s.projects[project.slug]);
  const hovered = useCommandStore((s) => s.hoveredProject === project.slug);
  const focused = useCommandStore((s) => s.focusedProject);
  const quality = useCommandStore((s) => s.quality.level);
  const enterProject = useCommandStore((s) => s.enterProject);
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const activity = runtime?.activity ?? 0.3;
  const status = runtime?.status ?? project.initialStatus;
  const hidden = Boolean(focused && focused !== project.slug);

  const inner = useMemo(() => {
    const n = particleCount(quality, 90, 45, 18);
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const rr = Math.cbrt(Math.random()) * 0.95;
      positions.set(
        [rr * Math.sin(ph) * Math.cos(th), rr * Math.sin(ph) * Math.sin(th), rr * Math.cos(ph)],
        i * 3,
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [quality]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const target = hidden ? 0.001 : focused === project.slug ? 2.4 : hovered ? 1.08 : 1;
    const current = g.scale.x;
    const next = current + (target - current) * 0.08;
    g.scale.setScalar(next);
    g.position.y = project.universePosition[1] + Math.sin(t * 0.8 + phase) * 0.12;
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
        onClick={() => enterProject(project.slug)}
        onPointerOver={() => hoverProject(project.slug)}
        onPointerOut={() => hoverProject(undefined)}
      />
      <points geometry={inner}>
        <pointsMaterial
          color={project.accent}
          size={0.045}
          transparent
          opacity={0.8}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <mesh rotation={[1.35, 0, 0]}>
        <torusGeometry args={[1.35, 0.012, 8, 64]} />
        <meshBasicMaterial color={STATUS_COLOR[status]} transparent opacity={0.5} />
      </mesh>
      {!focused && (
        <Html center distanceFactor={14} position={[0, -1.7, 0]} style={{ pointerEvents: 'none' }}>
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
