'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const look = useRef(new THREE.Vector3());
  const lookT = useRef(new THREE.Vector3());
  const posT = useRef(new THREE.Vector3(0, 4, 22));
  const rot = useRef({ x: 0, y: 0, tx: 0, ty: 0, zoom: 22, tZoom: 22 });
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0 });
  const flying = useRef(false);
  const requestId = useCommandStore((s) => s.camera.requestId);
  const target = useCommandStore((s) => s.camera.target);
  const view = useCommandStore((s) => s.view);

  useEffect(() => {
    if (!target) return;
    posT.current.set(...target.position);
    lookT.current.set(...target.lookAt);
    flying.current = true;
    const id = window.setTimeout(() => {
      flying.current = false;
    }, target.duration * 1000);
    return () => window.clearTimeout(id);
  }, [requestId, target]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { on: true, x: e.clientX, y: e.clientY, moved: 0 };
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.on || view !== 'universe' || flying.current) return;
      rot.current.ty += (e.clientX - drag.current.x) * 0.005;
      rot.current.tx = Math.max(-0.6, Math.min(0.6, rot.current.tx + (e.clientY - drag.current.y) * 0.003));
      drag.current.moved += Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y);
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const up = () => {
      drag.current.on = false;
    };
    const wheel = (e: WheelEvent) => {
      if (view !== 'universe' || flying.current) return;
      rot.current.tZoom = Math.max(12, Math.min(32, rot.current.tZoom + e.deltaY * 0.02));
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl, view]);

  useFrame((_, dt) => {
    const r = rot.current;
    r.y += (r.ty - r.y) * 0.08;
    r.x += (r.tx - r.x) * 0.08;
    r.zoom += (r.tZoom - r.zoom) * 0.06;
    if (view === 'universe' && !flying.current) {
      posT.current.set(Math.sin(r.y) * r.zoom, 4 + r.x * 6, Math.cos(r.y) * r.zoom);
      lookT.current.set(0, 0, 0);
    }
    camera.position.lerp(posT.current, flying.current ? 0.045 : 0.06);
    look.current.lerp(lookT.current, 0.06);
    camera.lookAt(look.current);
    camera.updateProjectionMatrix();
    void dt;
  });

  return null;
}
