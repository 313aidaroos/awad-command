'use client';

import { useEffect } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Brushed, Graphite } from '@/scene/kit/materials';
import { Column, FramedPanel, Slit } from '@/scene/kit/parts';

const ROOMS = [-10, -2, 6] as const;

function HallBackdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color('#1C222A');
    gl.setClearColor('#1C222A', 1);
    gl.toneMappingExposure = 1.35;
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#12151A', 1);
      gl.toneMappingExposure = 1.22;
    };
  }, [gl, scene]);
  return null;
}

function SideRoom({ x, z, accent }: { x: number; z: number; accent: string }) {
  const inward = z < 0 ? 1 : -1;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[3.8, 2.3, 2.2]} />
        <meshStandardMaterial color="#323940" metalness={0.4} roughness={0.48} />
      </mesh>
      <group position={[0, 1.25, 1.12 * inward]}>
        <FramedPanel width={3.2} height={2.05} accent={accent} thickness={0.05} />
      </group>
      <mesh position={[0, 0.72, 0.15 * inward]}>
        <boxGeometry args={[2.4, 0.08, 1.05]} />
        <Brushed roughness={0.28} />
      </mesh>
      <pointLight color="#f4f6fa" intensity={1.35} distance={7} position={[0, 1.9, 0.2 * inward]} />
      <Slit position={[0, 2.22, 1.08 * inward]} size={[1.1, 0.03, 0.03]} accent={accent} intensity={0.7} />
    </group>
  );
}

/** Sealed Contraxis nave — liner + aisle + rooms so enter never reads as a void. */
export function ContraxisFacility({ accent }: { accent: string }) {
  return (
    <group>
      <HallBackdrop />
      <mesh>
        <boxGeometry args={[40, 9.2, 18]} />
        <meshStandardMaterial color="#2C333C" side={THREE.BackSide} metalness={0.22} roughness={0.84} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 14]} />
        <meshStandardMaterial color="#2A313A" metalness={0.48} roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[30, 0.05, 2.2]} />
        <meshStandardMaterial color="#323A44" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[28, 0.02, 0.07]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.62} />
      </mesh>
      {[-12, -4, 4, 12].map((x) => (
        <group key={x}>
          <group position={[x, 0, -4.55]}>
            <Column height={5.05} width={0.32} />
          </group>
          <group position={[x, 0, 4.55]}>
            <Column height={5.05} width={0.32} />
          </group>
          <mesh position={[x, 5.02, 0]}>
            <boxGeometry args={[0.26, 0.14, 9.2]} />
            <Graphite roughness={0.36} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.18, 0]}>
        <boxGeometry args={[32.2, 0.12, 9.6]} />
        <meshStandardMaterial color="#2A3038" metalness={0.5} roughness={0.42} />
      </mesh>
      {[-2.4, 2.4].map((z) => (
        <Slit key={z} position={[0, 5.1, z]} size={[26, 0.04, 0.16]} accent="#E6E8EC" intensity={0.42} />
      ))}
      {ROOMS.map((x) => (
        <group key={x}>
          <SideRoom x={x} z={-4.15} accent={accent} />
          <SideRoom x={x} z={4.15} accent={accent} />
        </group>
      ))}
      <group position={[-17.55, 2.45, 0]}>
        <FramedPanel width={9} height={4.6} accent={accent} thickness={0.08} />
      </group>
      <group position={[17.55, 2.45, 0]}>
        <FramedPanel width={9} height={4.6} accent={accent} thickness={0.08} />
      </group>
      <mesh position={[17.2, 3.55, 0]}>
        <boxGeometry args={[0.08, 0.06, 3.4]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-17.95, 2.55, 0]}>
        <boxGeometry args={[0.2, 5.2, 13]} />
        <Graphite roughness={0.46} />
      </mesh>
      <mesh position={[17.95, 2.55, 0]}>
        <boxGeometry args={[0.2, 5.2, 13]} />
        <Graphite roughness={0.46} />
      </mesh>
      <mesh position={[0, 2.55, -6.95]}>
        <boxGeometry args={[36.2, 5.2, 0.2]} />
        <Graphite roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.55, 6.95]}>
        <boxGeometry args={[36.2, 5.2, 0.2]} />
        <Graphite roughness={0.5} />
      </mesh>
      <hemisphereLight args={['#eef1f5', '#2a3038', 0.62]} />
      <ambientLight intensity={0.28} color="#d8dee6" />
      <pointLight color="#f2f4f7" intensity={2.6} distance={26} position={[-9.2, 3.2, 0.5]} />
      <pointLight color="#e8edf3" intensity={2.1} distance={22} position={[-0.5, 3.5, 0.3]} />
      <pointLight color="#dfe5ee" intensity={1.7} distance={20} position={[7.5, 3.3, -0.3]} />
      <pointLight color={accent} intensity={0.75} distance={16} position={[14, 2.9, 0]} />
      <ContactShadows position={[0, -0.02, 0]} opacity={0.28} scale={40} blur={2.6} far={10} color="#000000" />
    </group>
  );
}
