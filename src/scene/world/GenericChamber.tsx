'use client';

import { useEffect } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INTERIOR_EXPOSURE, UNIVERSE_EXPOSURE } from '@/scene/lib/exposure';
import { KitModel } from '@/scene/kit/KitModel';

function ChamberBackdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color('#12161C');
    gl.setClearColor('#12161C', 1);
    gl.toneMappingExposure = INTERIOR_EXPOSURE;
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#07080A', 1);
      gl.toneMappingExposure = UNIVERSE_EXPOSURE;
    };
  }, [gl, scene]);
  return null;
}

/** Compact MegaKit booth. */
export function GenericChamber({ accent }: { accent: string }) {
  return (
    <group>
      <ChamberBackdrop />
      {([-4, 0, 4] as const).map((x) =>
        ([-4, 0, 4] as const).map((z) => (
          <KitModel key={`gfl-${x}-${z}`} name="floorDark" position={[x, 0, z]} grade="#6E737C" />
        )),
      )}
      {([-4, 0, 4] as const).map((x) => (
        <group key={`gns-${x}`}>
          <KitModel name="wallAstra" position={[x, 0, -6.1]} rotation={[0, Math.PI / 2, 0]} grade="#B4B8BE" />
          <KitModel name="wallAstra" position={[x, 0, 6.1]} rotation={[0, -Math.PI / 2, 0]} grade="#B4B8BE" />
        </group>
      ))}
      {([-4, 0, 4] as const).map((z) => (
        <group key={`gew-${z}`}>
          <KitModel name="wallAstra" position={[-6.1, 0, z]} grade="#B4B8BE" />
          <KitModel name="wallAstra" position={[6.1, 0, z]} rotation={[0, Math.PI, 0]} grade="#B4B8BE" />
        </group>
      ))}
      <KitModel name="computer" position={[-1.6, 0, -1.1]} grade="#9AA0A8" />
      <KitModel name="deskComputer" metalize position={[1.4, 0, 0.8]} scale={2.4} grade="#7A8088" />
      <KitModel name="lightWide" position={[0, 3.1, 0]} sit={false} grade="#8A909A" />
      <pointLight color="#C9D0DA" intensity={0.45} distance={10} position={[0, 2.4, 1.2]} />
      <pointLight color={accent} intensity={0.18} distance={7} position={[1.5, 1.8, 0]} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.4} scale={16} blur={2.2} far={6} color="#000000" />
    </group>
  );
}
