'use client';

import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ENV_INTENSITY_INTERIOR, ENV_INTENSITY_UNIVERSE } from '@/scene/lib/exposure';
import { showExterior } from '@/scene/lib/cameraPaths';
import { useCommandStore } from '@/store/useCommandStore';

/** RoomEnvironment probe — created once. Intensity only changes with view. */
export function StudioEnvironment() {
  const { gl, scene } = useThree();
  const level = useCommandStore((s) => s.quality.level);
  const enterPhase = useCommandStore((s) => s.enterPhase);

  useLayoutEffect(() => {
    if (level === 'low') {
      scene.environment = null;
      scene.environmentIntensity = 1;
      return;
    }
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const tex = pmrem.fromScene(room, 0.04).texture;
    scene.environment = tex;
    room.dispose();
    return () => {
      if (scene.environment === tex) scene.environment = null;
      scene.environmentIntensity = 1;
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, level, scene]);

  useLayoutEffect(() => {
    if (level === 'low') return;
    scene.environmentIntensity = showExterior(enterPhase) ? ENV_INTENSITY_UNIVERSE : ENV_INTENSITY_INTERIOR;
  }, [enterPhase, level, scene]);

  return null;
}
