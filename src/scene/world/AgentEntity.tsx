'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { agentLocalPosition, agentTravelEndpoints } from '@/scene/lib/agentMotion';
import { pointerGate } from '@/scene/lib/pointer';
import { AccentGlow } from '@/scene/materials/AccentGlow';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { SilverMaterial } from '@/scene/materials/SilverMaterial';
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
  const t0 = useRef<THREE.Mesh>(null);
  const t1 = useRef<THREE.Mesh>(null);
  const t2 = useRef<THREE.Mesh>(null);
  const last = useRef(new THREE.Vector3(...agent.homePosition));
  const state = useCommandStore((s) => s.agents[agent.id]);
  const followAgent = useCommandStore((s) => s.followAgent);
  const following = useCommandStore((s) => s.followingAgent === agent.id);
  const workforce = useCommandStore((s) => s.mode === 'workforce');
  const quality = useCommandStore((s) => s.quality.level);
  const status = state?.status ?? 'idle';
  const color = AGENT_TINT[status];
  const glow = useMemo(() => new THREE.Color(color), [color]);

  useFrame(() => {
    if (!group.current) return;
    agentLocalPosition(agent, state, nodes, Date.now(), _next);
    const moving = _next.distanceTo(last.current) > 0.004;
    const dx = last.current.x - _next.x;
    const dy = last.current.y - _next.y;
    const dz = last.current.z - _next.z;
    if (t0.current) t0.current.position.set(dx, dy, dz);
    if (t1.current) t1.current.position.set(dx * 2.4, dy * 2.4, dz * 2.4);
    if (t2.current) t2.current.position.set(dx * 3.8, dy * 3.8, dz * 3.8);
    if (t0.current) t0.current.visible = moving;
    if (t1.current) t1.current.visible = moving;
    if (t2.current) t2.current.visible = moving;
    if (moving) {
      group.current.lookAt(_next.x + (_next.x - last.current.x), _next.y, _next.z + (_next.z - last.current.z));
    }
    group.current.position.copy(_next);
    last.current.copy(_next);
    if (!moving) group.current.rotation.y += 0.004;

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
        <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
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
          <capsuleGeometry args={[0.1, 0.28, 4, 10]} />
          <ChassisMaterial roughness={0.22} />
        </mesh>
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <AccentGlow accent={color} opacity={following || status === 'working' ? 0.95 : 0.7} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.06]}>
          <torusGeometry args={[0.12, 0.012, 6, 16]} />
          <SilverMaterial />
        </mesh>
        {quality !== 'low' ? (
          <pointLight color={glow} intensity={following || status === 'working' ? 0.7 : 0.22} distance={2.8} />
        ) : null}
        <mesh ref={t0} visible={false}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
        <mesh ref={t1} visible={false}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.24} />
        </mesh>
        <mesh ref={t2} visible={false}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.14} />
        </mesh>
        {following ? (
          <mesh rotation={[1.4, 0, 0]}>
            <torusGeometry args={[0.42, 0.012, 8, 28]} />
            <meshBasicMaterial color={color} transparent opacity={0.75} />
          </mesh>
        ) : null}
        {following ? (
          <Html center transform={false} position={[0, -0.58, 0]} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.18em',
                fontWeight: 400,
                color: '#E6E8EC',
                textShadow: '0 2px 14px rgba(0,0,0,0.9)',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.name}
            </div>
          </Html>
        ) : null}
        {workforce && !following ? (
          <Html center transform={false} position={[0, 0.62, 0]} style={{ pointerEvents: 'none' }}>
            <div className="text-[8px] tracking-[0.12em] text-[var(--text)] whitespace-nowrap">{agent.name}</div>
          </Html>
        ) : null}
      </group>
    </group>
  );
}
