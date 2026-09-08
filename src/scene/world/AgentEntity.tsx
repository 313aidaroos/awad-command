'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { agentLocalPosition, agentTravelEndpoints } from '@/scene/lib/agentMotion';
import { pointerGate } from '@/scene/lib/pointer';
import { Anodized, Graphite } from '@/scene/kit/materials';
import { Slit } from '@/scene/kit/parts';
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
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function AgentEntity({
  agent,
  nodes,
}: {
  agent: AgentDefinition;
  nodes: WorldNode[];
}) {
  const group = useRef<THREE.Group>(null);
  const path = useRef<THREE.Mesh>(null);
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
    const moving = _next.distanceTo(last.current) > 0.004;
    if (moving) {
      group.current.lookAt(_next.x + (_next.x - last.current.x), _next.y, _next.z + (_next.z - last.current.z));
    }
    group.current.position.copy(_next);
    last.current.copy(_next);

    const travel = agentTravelEndpoints(agent, state, nodes);
    if (path.current) {
      if (!travel) {
        path.current.visible = false;
      } else {
        _mid.copy(travel.from).add(travel.to).multiplyScalar(0.5);
        _dir.copy(travel.to).sub(travel.from);
        const len = Math.max(0.08, _dir.length());
        path.current.visible = true;
        path.current.position.copy(_mid);
        path.current.scale.set(1, len, 1);
        path.current.quaternion.setFromUnitVectors(_up, _dir.normalize());
      }
    }
  });

  return (
    <group>
      <mesh ref={path} visible={false}>
        <boxGeometry args={[0.04, 1, 0.04]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} />
      </mesh>
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
          <boxGeometry args={[0.28, 0.72, 0.18]} />
          <Graphite roughness={0.36} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <Anodized />
        </mesh>
        <Slit position={[0, 0.12, 0.1]} size={[0.08, 0.22, 0.02]} accent={color} intensity={following ? 0.9 : 0.45} />
        {following ? (
          <Html center transform={false} position={[0, -0.52, 0]} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                fontWeight: 450,
                color: '#E6E8EC',
                textShadow: '0 1px 8px rgba(0,0,0,0.85)',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.name}
            </div>
          </Html>
        ) : null}
        {workforce && !following ? (
          <Html center transform={false} position={[0, 0.72, 0]} style={{ pointerEvents: 'none' }}>
            <div className="text-[8px] tracking-[0.1em] text-[var(--text)] whitespace-nowrap">{agent.name}</div>
          </Html>
        ) : null}
      </group>
    </group>
  );
}
