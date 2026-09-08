import * as THREE from 'three';
import type { AgentDefinition, AgentState } from '@/types/agent';
import type { WorldNode } from '@/types/world';

export const MOVE_MS = 1550;
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
  const working = runtime.status === 'working' ? 0.16 : 0.06;
  out.y += Math.sin(now * 0.0032 + out.x * 0.4) * working;
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

export function agentTravelEndpoints(
  agent: AgentDefinition,
  runtime: AgentState | undefined,
  nodes: WorldNode[],
): { from: THREE.Vector3; to: THREE.Vector3; progress: number } | null {
  if (!runtime?.targetNodeId) return null;
  const dest = nodes.find((item) => item.id === runtime.targetNodeId);
  if (!dest) return null;
  const origin = nodes.find((item) => item.id === runtime.fromNodeId);
  const from = new THREE.Vector3(...(origin?.position ?? agent.homePosition));
  const to = new THREE.Vector3(...dest.position);
  const progress = ease((Date.now() - (runtime.moveStartedAt ?? Date.now())) / MOVE_MS);
  if (progress >= 1) return null;
  return { from, to, progress };
}
