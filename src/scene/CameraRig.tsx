'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { agentWorldPosition } from '@/scene/lib/agentMotion';
import { pointerGate } from '@/scene/lib/pointer';
import { getProject } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

const _core = new THREE.Vector3();
const _away = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const look = useRef(new THREE.Vector3());
  const lookT = useRef(new THREE.Vector3());
  const posT = useRef(new THREE.Vector3(0, 8, 38));
  const follow = useRef(new THREE.Vector3());
  const rot = useRef({ x: 0, y: 0, tx: 0, ty: 0, zoom: 42, tZoom: 42 });
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0, pan: false });
  const flying = useRef(false);
  const requestId = useCommandStore((s) => s.camera.requestId);
  const target = useCommandStore((s) => s.camera.target);
  const view = useCommandStore((s) => s.view);

  useEffect(() => {
    if (!target) return;
    posT.current.set(...target.position);
    lookT.current.set(...target.lookAt);
    flying.current = true;
    if (target.phase) useCommandStore.getState().setEnterPhase(target.phase);
    const id = window.setTimeout(() => {
      const state = useCommandStore.getState();
      if (state.camera.requestId !== requestId) return;
      if (state.camera.index < state.camera.sequence.length - 1) {
        state.advanceCamera();
        return;
      }
      flying.current = false;
      const focus = state.focusedProject ? getProject(state.focusedProject) : undefined;
      if (focus && state.view !== 'universe') {
        const [x, y, z] = target.position;
        const [lx, , lz] = target.lookAt;
        const dx = x - lx;
        const dz = z - lz;
        rot.current.tZoom = Math.max(14, Math.min(24, Math.hypot(dx, dz)));
        rot.current.zoom = rot.current.tZoom;
        rot.current.ty = Math.atan2(dx, dz);
        rot.current.y = rot.current.ty;
        rot.current.tx = Math.max(-0.45, Math.min(0.45, (y - focus.universePosition[1] - 2.2) / 5));
        rot.current.x = rot.current.tx;
      }
      if (state.view === 'universe') {
        rot.current.tZoom = 42;
        rot.current.zoom = 42;
      }
    }, target.duration * 1000);
    return () => window.clearTimeout(id);
  }, [requestId, target]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { on: true, x: e.clientX, y: e.clientY, moved: 0, pan: e.shiftKey || e.button === 2 };
      pointerGate.moved = 0;
      pointerGate.suppressClick = false;
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.on || flying.current) return;
      const following = Boolean(useCommandStore.getState().followingAgent);
      if (following) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current.moved += Math.abs(dx) + Math.abs(dy);
      pointerGate.moved = drag.current.moved;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      if (drag.current.pan) {
        rot.current.ty -= dx * 0.002;
        rot.current.tx = Math.max(-0.55, Math.min(0.55, rot.current.tx + dy * 0.002));
        return;
      }
      rot.current.ty += dx * 0.005;
      rot.current.tx = Math.max(-0.62, Math.min(0.62, rot.current.tx + dy * 0.003));
    };
    const up = () => {
      if (drag.current.moved > 8) {
        pointerGate.suppressClick = true;
        window.setTimeout(() => {
          pointerGate.suppressClick = false;
        }, 80);
      }
      drag.current.on = false;
    };
    const wheel = (e: WheelEvent) => {
      if (flying.current || useCommandStore.getState().followingAgent) return;
      const projectView = useCommandStore.getState().view !== 'universe';
      const min = projectView ? 12 : 24;
      const max = projectView ? 28 : 58;
      rot.current.tZoom = Math.max(min, Math.min(max, rot.current.tZoom + e.deltaY * 0.02));
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: true });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame(() => {
    const r = rot.current;
    r.y += (r.ty - r.y) * 0.08;
    r.x += (r.tx - r.x) * 0.08;
    r.zoom += (r.tZoom - r.zoom) * 0.06;
    const state = useCommandStore.getState();
    const followed = state.followingAgent
      ? Object.values(getProject(state.focusedProject ?? '')?.agents ?? []).find((a) => a.id === state.followingAgent)
      : undefined;
    const project = state.focusedProject ? getProject(state.focusedProject) : undefined;

    if (followed && project) {
      agentWorldPosition(project.universePosition, followed, state.agents[followed.id], project.nodes, Date.now(), follow.current);
      _core.set(...project.universePosition);
      _away.copy(follow.current).sub(_core);
      if (_away.lengthSq() < 0.25) _away.set(1, 0.35, 1);
      _away.normalize();
      posT.current.copy(follow.current).addScaledVector(_away, 6.8);
      posT.current.y = follow.current.y + 3.9;
      lookT.current.copy(follow.current).lerp(_core, 0.1);
      lookT.current.y += 0.15;
    } else if (view === 'universe' && !flying.current) {
      posT.current.set(Math.sin(r.y) * r.zoom, 9 + r.x * 8, Math.cos(r.y) * r.zoom);
      lookT.current.set(0, 0, 0);
    } else if (project && !flying.current && view !== 'universe') {
      const [cx, cy, cz] = project.universePosition;
      posT.current.set(cx + Math.sin(r.y) * r.zoom, cy + 4.6 + r.x * 5.2, cz + Math.cos(r.y) * r.zoom);
      lookT.current.set(cx, cy, cz);
    }

    camera.position.lerp(posT.current, flying.current ? 0.042 : followed ? 0.05 : 0.055);
    look.current.lerp(lookT.current, followed ? 0.07 : 0.06);
    camera.lookAt(look.current);
  });

  return null;
}
