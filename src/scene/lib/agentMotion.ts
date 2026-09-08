import * as THREE from 'three';
import type { AgentDefinition, AgentState } from '@/types/agent';
import type { WorldNode } from '@/types/world';

const MOVE_MS = 2400;
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _out = new THREE.Vector3();

function nodePos(nodes: WorldNode[], id: string | undefined): THREE.Vector3 | null {
  if (!id) return null;
  const node = nodes.find((item) => item.id === id);
  return node ? _to.set(...node.position) : null;
}

function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function agentLocalPosition(
  agent: AgentDefinition,
  runtime: AgentState | undefined,
  nodes: WorldNode[],
  now: number,
  out: THREE.Vector3 = _out,
): THREE.Vector3 {
  const home = _from.set(...agent.homePosition);
  const dest = nodePos(nodes, runtime?.targetNodeId);
  if (!dest || !runtime) {
    const bob = Math.sin(now * 0.0016 + home.x) * 0.08;
    return out.copy(home).setY(home.y + bob);
  }
  const origin = nodes.find((item) => item.id === runtime.fromNodeId);
  const start = origin ? new THREE.Vector3(...origin.position) : home;
  const u = ease((now - (runtime.moveStartedAt ?? now)) / MOVE_MS);
  out.copy(start).lerp(dest, u);
  const working = runtime.status === 'working' ? 0.12 : 0.06;
  out.y += Math.sin(now * 0.002 + out.x * 0.4) * working;
  return out;
}

export function agentWorldPosition(
  projectPos: [number, number, number],
  agent: AgentDefinition,
  runtime: AgentState | undefined,
  nodes: WorldNode[],
  now: number,
  out: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  agentLocalPosition(agent, runtime, nodes, now, out);
  out.x += projectPos[0];
  out.y += projectPos[1];
  out.z += projectPos[2];
  return out;
}
