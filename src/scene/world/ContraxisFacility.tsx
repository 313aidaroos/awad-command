'use client';

import { useEffect } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FloorMetal, Graphite } from '@/scene/kit/materials';
import { Column, FramedPanel } from '@/scene/kit/parts';
import { ContraxisDress } from '@/scene/world/ContraxisDress';

function HallBackdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color('#1A1F26');
    gl.setClearColor('#1A1F26', 1);
    gl.toneMappingExposure = 1.4;
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#12151A', 1);
      gl.toneMappingExposure = 1.38;
    };
  }, [gl, scene]);
  return null;
}

/** Sealed Contraxis nave — PBR enclosure + dressed bays on the Customer→Revenue spine. */
export function ContraxisFacility({ accent }: { accent: string }) {
  return (
    <group>
      <HallBackdrop />
      <mesh>
        <boxGeometry args={[40, 9.2, 18]} />
        <meshStandardMaterial color="#252B32" side={THREE.BackSide} metalness={0.28} roughness={0.78} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 14]} />
        <FloorMetal roughness={0.48} />
      </mesh>
      {[-12, -4, 4, 12].map((x) => (
        <group key={x}>
          <group position={[x, 0, -4.55]}>
            <Column height={5.05} width={0.3} />
          </group>
          <group position={[x, 0, 4.55]}>
            <Column height={5.05} width={0.3} />
          </group>
          <mesh position={[x, 5.02, 0]}>
            <boxGeometry args={[0.24, 0.12, 9.2]} />
            <Graphite roughness={0.34} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[32.2, 0.12, 9.6]} />
        <Graphite roughness={0.4} />
      </mesh>
      <ContraxisDress accent={accent} />
      <group position={[-17.55, 2.45, 0]}>
        <FramedPanel width={9} height={4.6} accent={accent} thickness={0.08} />
      </group>
      <group position={[17.55, 2.45, 0]}>
        <FramedPanel width={9} height={4.6} accent={accent} thickness={0.08} />
      </group>
      <mesh position={[-17.95, 2.55, 0]}>
        <boxGeometry args={[0.2, 5.2, 13]} />
        <Graphite roughness={0.42} />
      </mesh>
      <mesh position={[17.95, 2.55, 0]}>
        <boxGeometry args={[0.2, 5.2, 13]} />
        <Graphite roughness={0.42} />
      </mesh>
      <mesh position={[0, 2.55, -6.95]}>
        <boxGeometry args={[36.2, 5.2, 0.2]} />
        <Graphite roughness={0.46} />
      </mesh>
      <mesh position={[0, 2.55, 6.95]}>
        <boxGeometry args={[36.2, 5.2, 0.2]} />
        <Graphite roughness={0.46} />
      </mesh>
      <hemisphereLight args={['#e8edf3', '#2a3038', 0.55]} />
      <ambientLight intensity={0.22} color="#d5dbe3" />
      <pointLight color="#f2f4f7" intensity={2.15} distance={24} position={[-9, 3.1, 0.4]} />
      <pointLight color="#e6ebf2" intensity={1.55} distance={20} position={[2, 3.3, 0.2]} />
      <pointLight color={accent} intensity={0.55} distance={14} position={[13.5, 2.8, 0]} />
      <ContactShadows position={[0, -0.02, 0]} opacity={0.26} scale={40} blur={2.8} far={10} color="#000000" />
    </group>
  );
}
