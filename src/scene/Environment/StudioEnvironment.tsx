'use client';

import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useCommandStore } from '@/store/useCommandStore';

/** Local RoomEnvironment probe — no CDN HDR. Metals/glass need this to spec. */
export function StudioEnvironment() {
  const { gl, scene } = useThree();
  const level = useCommandStore((s) => s.quality.level);

  useLayoutEffect(() => {
    if (level === 'low') {
      scene.environment = null;
      return;
    }
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = tex;
    room.dispose();
    return () => {
      if (scene.environment === tex) scene.environment = null;
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, level, scene]);

  return null;
}
