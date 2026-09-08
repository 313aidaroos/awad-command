'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { agentWorldPosition } from '@/scene/lib/agentMotion';
import { INTERIOR_ZOOM, UNIVERSE_ZOOM } from '@/scene/lib/cameraPaths';
import { FOLLOW_BACK, FOLLOW_LIFT, FOLLOW_SIDE, followCorrections } from '@/scene/lib/followFraming';
import { pointerGate } from '@/scene/lib/pointer';
import { getProject } from '@/projects/registry';
import { useCommandStore } from '@/store/useCommandStore';

const _core = new THREE.Vector3();
const _away = new THREE.Vector3();
const _side = new THREE.Vector3();
const _ndc = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const look = useRef(new THREE.Vector3());
  const lookT = useRef(new THREE.Vector3());
  const posT = useRef(new THREE.Vector3(0, 6.6, UNIVERSE_ZOOM));
  const follow = useRef(new THREE.Vector3());
  const rot = useRef({ x: 0, y: 0, tx: 0, ty: 0, zoom: UNIVERSE_ZOOM, tZoom: UNIVERSE_ZOOM });
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0, pan: false });
  const flying = useRef(false);
  const followBias = useRef(0);
  const followDrop = useRef(0);
  const wasFollow = useRef(false);
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
        rot.current.tZoom = INTERIOR_ZOOM;
        rot.current.zoom = INTERIOR_ZOOM;
        rot.current.ty = Math.atan2(dx, dz);
        rot.current.y = rot.current.ty;
        rot.current.tx = Math.max(-0.28, Math.min(0.28, (y - focus.universePosition[1] - 2.5) / 6));
        rot.current.x = rot.current.tx;
      }
      if (state.view === 'universe') {
        rot.current.tZoom = UNIVERSE_ZOOM;
        rot.current.zoom = UNIVERSE_ZOOM;
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
      const min = projectView ? 8.6 : 22;
      const max = projectView ? 13.2 : 52;
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
      flying.current = false;
      agentWorldPosition(project.universePosition, followed, state.agents[followed.id], project.nodes, Date.now(), follow.current);
      _core.set(...project.universePosition);
      _away.copy(follow.current).sub(_core);
      _away.y = 0;
      if (_away.lengthSq() < 0.25) _away.set(1, 0, 1);
      _away.normalize();
      _side.set(-_away.z, 0, _away.x);
      posT.current.copy(follow.current).addScaledVector(_away, FOLLOW_BACK).addScaledVector(_side, FOLLOW_SIDE);
      posT.current.y = follow.current.y + FOLLOW_LIFT - followDrop.current;
      lookT.current.copy(follow.current);
      lookT.current.y += 0.06 + followBias.current;

      if (!wasFollow.current) {
        followBias.current = 0;
        followDrop.current = 0;
        look.current.copy(lookT.current);
        camera.position.copy(posT.current);
      }
      wasFollow.current = true;

      _ndc.copy(follow.current).project(camera);
      const fix = followCorrections(_ndc.y, _ndc.x);
      followBias.current += (fix.lookLift - followBias.current) * 0.18;
      followDrop.current += (fix.camDrop - followDrop.current) * 0.16;
      lookT.current.y = follow.current.y + 0.06 + followBias.current;
      posT.current.y = follow.current.y + FOLLOW_LIFT - followDrop.current;
      if (fix.pullBack > 0) posT.current.addScaledVector(_away, fix.pullBack);
    } else if (view === 'universe' && !flying.current) {
      wasFollow.current = false;
      followBias.current = 0;
      followDrop.current = 0;
      posT.current.set(Math.sin(r.y) * r.zoom, 6.6 + r.x * 7, Math.cos(r.y) * r.zoom);
      lookT.current.set(0, 0.25, 0);
    } else if (project && !flying.current && view !== 'universe') {
      wasFollow.current = false;
      followBias.current = 0;
      followDrop.current = 0;
      const [cx, cy, cz] = project.universePosition;
      posT.current.set(cx + Math.sin(r.y) * r.zoom, cy + 2.5 + r.x * 1.35, cz + Math.cos(r.y) * r.zoom);
      lookT.current.set(cx, cy - 0.35, cz);
    } else {
      wasFollow.current = false;
      followBias.current = 0;
      followDrop.current = 0;
    }

    camera.position.lerp(posT.current, flying.current ? 0.042 : followed ? 0.16 : 0.055);
    look.current.lerp(lookT.current, followed ? 0.22 : 0.06);
    camera.lookAt(look.current);
  });

  return null;
}
