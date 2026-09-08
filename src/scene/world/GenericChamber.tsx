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
    scene.background = new THREE.Color('#14181E');
    gl.setClearColor('#14181E', 1);
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#07080A', 1);
    };
  }, [gl, scene]);
  return null;
}

/** Compact MegaKit booth so generic worlds are not Kenney cubes. */
export function GenericChamber({ accent }: { accent: string }) {
  return (
    <group>
      <ChamberBackdrop />
      {([-4, 0, 4] as const).map((x) =>
        ([-4, 0, 4] as const).map((z) => (
          <KitModel key={`gfl-${x}-${z}`} name={x === 0 && z === 0 ? 'floorMetal' : 'floorDark'} position={[x, 0, z]} />
        )),
      )}
      {([-4, 0, 4] as const).map((x) => (
        <group key={`gns-${x}`}>
          <KitModel name="wallAstra" position={[x, 0, -6.1]} rotation={[0, Math.PI / 2, 0]} />
          <KitModel name="wallAstra" position={[x, 0, 6.1]} rotation={[0, -Math.PI / 2, 0]} />
        </group>
      ))}
      {([-4, 0, 4] as const).map((z) => (
        <group key={`gew-${z}`}>
          <KitModel name="wallAstra" position={[-6.1, 0, z]} />
          <KitModel name="wallAstra" position={[6.1, 0, z]} rotation={[0, Math.PI, 0]} />
        </group>
      ))}
      <KitModel name="computer" position={[-1.6, 0, -1.1]} />
      <KitModel name="deskComputer" metalize position={[1.4, 0, 0.8]} scale={2.4} />
      <KitModel name="columnSupport" position={[-3.6, 0, -3.4]} scale={0.7} />
      <KitModel name="columnPipes" position={[3.6, 0, 3.4]} scale={0.62} />
      <KitModel name="lightWide" position={[0, 3.1, 0]} sit={false} />
      <pointLight color="#f2f4f7" intensity={1.5} distance={12} position={[0, 2.4, 1.2]} />
      <pointLight color={accent} intensity={0.35} distance={8} position={[1.5, 1.8, 0]} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.34} scale={16} blur={2} far={6} color="#000000" />
    </group>
  );
}
