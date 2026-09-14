'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Offline studio probe — intensity high enough for MEDIUM metals to spec. */
export function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const texture = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = texture;
    scene.environmentIntensity = 2.85;
    return () => {
      if (scene.environment === texture) scene.environment = null;
      texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}
