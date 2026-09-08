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

const _next = new THREE.Vector3();

export function AgentEntity({
  agent,
  nodes,
}: {
  agent: AgentDefinition;
  nodes: WorldNode[];
}) {
  const group = useRef<THREE.Group>(null);
  const t0 = useRef<THREE.Mesh>(null);
  const t1 = useRef<THREE.Mesh>(null);
  const t2 = useRef<THREE.Mesh>(null);
  const last = useRef(new THREE.Vector3(...agent.homePosition));
  const state = useCommandStore((s) => s.agents[agent.id]);
  const followAgent = useCommandStore((s) => s.followAgent);
  const following = useCommandStore((s) => s.followingAgent === agent.id);
  const workforce = useCommandStore((s) => s.mode === 'workforce');
  const status = state?.status ?? 'idle';
  const color = AGENT_TINT[status];

  useFrame(() => {
    if (!group.current) return;
    agentLocalPosition(agent, state, nodes, Date.now(), _next);
    const moving = _next.distanceTo(last.current) > 0.003;
    const dx = last.current.x - _next.x;
    const dy = last.current.y - _next.y;
    const dz = last.current.z - _next.z;
    if (t0.current) t0.current.position.set(dx, dy, dz);
    if (t1.current) t1.current.position.set(dx * 2.1, dy * 2.1, dz * 2.1);
    if (t2.current) t2.current.position.set(dx * 3.2, dy * 3.2, dz * 3.2);
    t0.current && (t0.current.visible = moving);
    t1.current && (t1.current.visible = moving);
    t2.current && (t2.current.visible = moving);
    if (moving) group.current.lookAt(_next.x + (_next.x - last.current.x), _next.y, _next.z + (_next.z - last.current.z));
    group.current.position.copy(_next);
    last.current.copy(_next);
    if (!moving) group.current.rotation.y += 0.01;
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
        <coneGeometry args={[0.15, 0.44, 5]} />
        <meshStandardMaterial
          color={color}
          metalness={0.45}
          roughness={0.28}
          emissive={color}
          emissiveIntensity={following || status === 'working' ? 0.4 : 0.16}
        />
      </mesh>
      <mesh ref={t0} visible={false}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <mesh ref={t1} visible={false}>
        <sphereGeometry args={[0.038, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>
      <mesh ref={t2} visible={false}>
        <sphereGeometry args={[0.026, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
      {following ? (
        <mesh rotation={[1.4, 0, 0]}>
          <torusGeometry args={[0.4, 0.014, 8, 28]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} />
        </mesh>
      ) : null}
      <Html distanceFactor={28} position={[0, 0.5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`text-[9px] tracking-[0.08em] whitespace-nowrap ${workforce || following ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
          {agent.name}
        </div>
      </Html>
    </group>
  );
}
