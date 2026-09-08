'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { agentLocalPosition } from '@/scene/lib/agentMotion';
import { pointerGate } from '@/scene/lib/pointer';
import { STATUS_COLOR } from '@/scene/universe/statusColor';
import { useCommandStore } from '@/store/useCommandStore';
import type { AgentDefinition, AgentStatus } from '@/types/agent';
import type { WorldNode } from '@/types/world';

const AGENT_TINT: Record<AgentStatus, string> = {
  working: STATUS_COLOR.active,
  idle: STATUS_COLOR.idle,
  waiting: STATUS_COLOR.attention,
  blocked: STATUS_COLOR.warning,
  error: STATUS_COLOR.error,
  needs_approval: STATUS_COLOR.attention,
};

export function AgentEntity({
  agent,
  nodes,
}: {
  agent: AgentDefinition;
  nodes: WorldNode[];
}) {
  const group = useRef<THREE.Group>(null);
  const state = useCommandStore((s) => s.agents[agent.id]);
  const followAgent = useCommandStore((s) => s.followAgent);
  const following = useCommandStore((s) => s.followingAgent === agent.id);
  const workforce = useCommandStore((s) => s.mode === 'workforce');
  const status = state?.status ?? 'idle';
  const color = AGENT_TINT[status];

  useFrame(() => {
    if (!group.current) return;
    agentLocalPosition(agent, state, nodes, Date.now(), group.current.position);
    group.current.rotation.y += 0.012;
  });

  return (
    <group ref={group} position={agent.homePosition}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (pointerGate.suppressClick) return;
          followAgent(agent.id);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'grab';
        }}
      >
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color={color}
          metalness={0.4}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={following ? 0.45 : 0.18}
        />
      </mesh>
      <mesh position={[0, -0.08, -0.16]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} />
      </mesh>
      {following ? (
        <mesh rotation={[1.4, 0, 0]}>
          <torusGeometry args={[0.28, 0.012, 8, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      ) : null}
      <Html distanceFactor={18} position={[0, 0.34, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`text-[9px] tracking-[0.08em] whitespace-nowrap ${workforce || following ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
          {agent.name}
        </div>
      </Html>
    </group>
  );
}
