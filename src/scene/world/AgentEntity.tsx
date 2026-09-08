'use client';

import { Html } from '@react-three/drei';
import { STATUS_COLOR } from '@/scene/universe/statusColor';
import { useCommandStore } from '@/store/useCommandStore';
import type { AgentDefinition } from '@/types/agent';
import type { AgentStatus } from '@/types/agent';

const AGENT_TINT: Record<AgentStatus, string> = {
  working: STATUS_COLOR.active,
  idle: STATUS_COLOR.idle,
  waiting: STATUS_COLOR.attention,
  blocked: STATUS_COLOR.warning,
  error: STATUS_COLOR.error,
  needs_approval: STATUS_COLOR.attention,
};

export function AgentEntity({ agent }: { agent: AgentDefinition }) {
  const state = useCommandStore((s) => s.agents[agent.id]);
  const enterAgent = useCommandStore((s) => s.enterAgent);
  const status = state?.status ?? 'idle';
  return (
    <group position={agent.homePosition}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          enterAgent(agent.id);
        }}
      >
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color={AGENT_TINT[status]} transparent opacity={0.9} />
      </mesh>
      <Html distanceFactor={18} position={[0, 0.32, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-[9px] tracking-[0.08em] text-[var(--muted)] whitespace-nowrap">
          {agent.name}
        </div>
      </Html>
    </group>
  );
}
