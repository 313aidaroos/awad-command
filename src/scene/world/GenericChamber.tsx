'use client';

import { useEffect } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { KitModel } from '@/scene/kit/KitModel';

function ChamberBackdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color('#1A1F26');
    gl.setClearColor('#1A1F26', 1);
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#07080A', 1);
    };
  }, [gl, scene]);
  return null;
}

export function GenericChamber({ accent }: { accent: string }) {
  return (
    <group>
      <ChamberBackdrop />
      <KitModel name="roomSmall" metalize tint="#98a1ab" />
      <KitModel name="computer" position={[-1.6, 0, -1.1]} />
      <KitModel name="deskComputer" metalize tint={accent} position={[1.4, 0, 0.8]} scale={2.4} />
      <KitModel name="columnSupport" position={[-3.6, 0, -3.4]} scale={0.7} />
      <KitModel name="columnSupport" position={[3.6, 0, 3.4]} scale={0.7} />
      <pointLight color="#f2f4f7" intensity={1.4} distance={12} position={[0, 2.4, 1.2]} />
      <pointLight color={accent} intensity={0.35} distance={8} position={[1.5, 1.8, 0]} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.34} scale={16} blur={2} far={6} color="#000000" />
    </group>
  );
}
