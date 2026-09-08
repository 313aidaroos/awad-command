'use client';

import { useEffect } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { KitModel } from '@/scene/kit/KitModel';

const BAYS = [-7.2, -5.2, -3.2, -1.0, 1.2, 3.4, 7.4] as const;

function HallBackdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color('#1A1F26');
    gl.setClearColor('#1A1F26', 1);
    gl.toneMappingExposure = 1.28;
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#07080A', 1);
      gl.toneMappingExposure = 1.12;
    };
  }, [gl, scene]);
  return null;
}

/** Sealed Kenney room-large + MegaKit/Space dress. Customer→Revenue stays populated. */
export function ContraxisFacility({ accent }: { accent: string }) {
  return (
    <group>
      <HallBackdrop />
      <KitModel name="roomLarge" />
      <KitModel name="cables" position={[0, 0.02, 0]} scale={0.92} />
      {([-6.4, 0, 6.4] as const).map((x) => (
        <group key={`col-${x}`}>
          <KitModel name="columnPipes" position={[x, 0, -5.4]} scale={0.72} />
          <KitModel name="columnSupport" position={[x, 0, 5.4]} scale={0.78} />
        </group>
      ))}
      {BAYS.map((x, i) => (
        <group key={`pad-${x}`} position={[x, 0.01, i % 2 === 0 ? -2.15 : 2.15]}>
          <KitModel name="floorDark" scale={0.42} />
        </group>
      ))}
      <KitModel name="topCables" position={[0, 3.15, -4.2]} rotation={[0, Math.PI / 2, 0]} scale={1.05} sit={false} />
      <KitModel name="topCables" position={[0, 3.15, 4.2]} rotation={[0, Math.PI / 2, 0]} scale={1.05} sit={false} />
      <KitModel name="pipeHolder" position={[-4.6, 0, -5.6]} scale={1.1} />
      <KitModel name="pipeHolder" position={[4.8, 0, 5.6]} scale={1.1} rotation={[0, Math.PI, 0]} />
      <KitModel name="cable3" position={[-2.2, 0, -5.8]} rotation={[0, 0.2, 0]} />
      <KitModel name="cable1" position={[2.4, 0, 5.8]} rotation={[0, Math.PI, 0]} />
      <KitModel name="vent" position={[-8.2, 2.4, 0]} rotation={[0, Math.PI / 2, 0]} sit={false} />
      <KitModel name="vent" position={[8.2, 2.4, 0]} rotation={[0, -Math.PI / 2, 0]} sit={false} />
      <KitModel name="lightWide" position={[-4, 3.6, 0]} sit={false} />
      <KitModel name="lightWide" position={[2, 3.6, 0]} sit={false} />
      <KitModel name="lightWide" position={[6.4, 3.6, 0]} sit={false} />
      <KitModel name="machineGen" metalize position={[5.4, 0, -5.5]} scale={1.6} />
      <KitModel name="machineBarrel" metalize position={[5.6, 0, 5.4]} scale={1.5} />
      <KitModel name="barrelLarge" position={[-8.1, 0, -3.4]} />
      <KitModel name="crate" position={[-8.0, 0, 3.2]} />
      <KitModel name="chest" position={[-0.8, 0, -5.7]} />
      <KitModel name="accessPoint" position={[7.6, 0, -2.4]} />
      <KitModel name="fan" position={[0.2, 3.55, 3.4]} sit={false} />
      <hemisphereLight args={['#eef2f6', '#2a3138', 0.42]} />
      <ambientLight intensity={0.16} color="#d5dbe3" />
      <spotLight color="#ffffff" intensity={2.6} position={[-5.4, 3.8, 2.1]} angle={0.52} penumbra={0.4} distance={18} />
      <pointLight color="#f4f6f8" intensity={1.8} distance={16} position={[-5.2, 2.6, 0.4]} />
      <pointLight color="#eef2f6" intensity={1.5} distance={14} position={[2.2, 2.7, 0.2]} />
      <pointLight color={accent} intensity={0.5} distance={12} position={[7.2, 2.4, 0]} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.38} scale={24} blur={2.1} far={8} color="#000000" />
    </group>
  );
}
