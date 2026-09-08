'use client';

import { ContactShadows } from '@react-three/drei';
import { Brushed, Graphite } from '@/scene/kit/materials';
import { Column, FramedPanel, Slit } from '@/scene/kit/parts';
import { useCommandStore } from '@/store/useCommandStore';

const BAY_XS = [-14, -10, -6, -2, 2, 6, 10, 14];

/** Sealed Contraxis hall — floor, colonnade, glass bays, ceiling beams. Human-scale. */
export function ContraxisFacility({ accent }: { accent: string }) {
  const level = useCommandStore((s) => s.quality.level);
  const cols = level === 'low' ? BAY_XS.filter((_, i) => i % 2 === 0) : BAY_XS;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[36, 14]} />
        <Graphite roughness={0.62} metalness={0.32} />
      </mesh>
      {[-12, -4, 4, 12].map((x) => (
        <mesh key={`seam-${x}`} position={[x, 0.01, 0]}>
          <boxGeometry args={[0.04, 0.02, 12.4]} />
          <Brushed roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[32, 0.04, 1.6]} />
        <meshStandardMaterial color="#14181E" metalness={0.28} roughness={0.7} />
      </mesh>
      {cols.map((x) => (
        <group key={x}>
          <group position={[x, 0, -4.6]}>
            <Column height={5.2} width={0.34} />
          </group>
          <group position={[x, 0, 4.6]}>
            <Column height={5.2} width={0.34} />
          </group>
          <mesh position={[x, 5.15, 0]}>
            <boxGeometry args={[0.28, 0.16, 9.4]} />
            <Graphite roughness={0.38} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.28, 0]}>
        <boxGeometry args={[32.4, 0.1, 9.8]} />
        <Graphite roughness={0.48} />
      </mesh>
      {[-3.2, 0, 3.2].map((z) => (
        <mesh key={z} position={[0, 5.22, z]}>
          <boxGeometry args={[30, 0.04, 0.12]} />
          <Brushed roughness={0.3} />
        </mesh>
      ))}
      {BAY_XS.filter((_, i) => i % 2 === 0).map((x) => (
        <Slit key={`ceil-${x}`} position={[x, 5.2, 0]} size={[1.6, 0.04, 0.18]} accent="#E6E8EC" intensity={0.55} />
      ))}
      <group position={[-17.6, 2.5, 0]}>
        <FramedPanel width={9.2} height={4.8} accent={accent} thickness={0.08} />
      </group>
      <group position={[17.6, 2.5, 0]}>
        <FramedPanel width={9.2} height={4.8} accent={accent} thickness={0.08} />
      </group>
      <group position={[0, 2.5, -6.7]}>
        <FramedPanel width={34} height={4.8} accent={accent} thickness={0.06} />
      </group>
      <group position={[0, 2.5, 6.7]}>
        <FramedPanel width={34} height={4.8} accent={accent} thickness={0.06} />
      </group>
      <mesh position={[-17.9, 2.6, 0]}>
        <boxGeometry args={[0.22, 5.4, 13.2]} />
        <Graphite roughness={0.46} />
      </mesh>
      <mesh position={[17.9, 2.6, 0]}>
        <boxGeometry args={[0.22, 5.4, 13.2]} />
        <Graphite roughness={0.46} />
      </mesh>
      <mesh position={[0, 2.6, -6.95]}>
        <boxGeometry args={[36.2, 5.4, 0.18]} />
        <Graphite roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.6, 6.95]}>
        <boxGeometry args={[36.2, 5.4, 0.18]} />
        <Graphite roughness={0.5} />
      </mesh>
      {BAY_XS.slice(0, -1).map((x, i) => (
        <group key={`alcove-${x}`}>
          <mesh position={[(x + BAY_XS[i + 1]!) / 2, 2.2, -3.35]}>
            <boxGeometry args={[0.1, 4.2, 2.4]} />
            <Graphite roughness={0.42} />
          </mesh>
          <mesh position={[(x + BAY_XS[i + 1]!) / 2, 2.2, 3.35]}>
            <boxGeometry args={[0.1, 4.2, 2.4]} />
            <Graphite roughness={0.42} />
          </mesh>
        </group>
      ))}
      {BAY_XS.map((x) => (
        <Slit key={`bay-slit-${x}`} position={[x, 2.4, -4.55]} size={[1.4, 0.04, 0.03]} accent={accent} intensity={0.65} />
      ))}
      <pointLight color="#f7f8fb" intensity={2.1} distance={24} position={[-10, 4.4, 0]} />
      <pointLight color="#f2f4f8" intensity={1.85} distance={22} position={[-2, 4.2, 1]} />
      <pointLight color="#eef1f5" intensity={1.7} distance={22} position={[6, 4.1, -1]} />
      <pointLight color={accent} intensity={0.45} distance={16} position={[13, 3.4, 0]} />
      <ContactShadows position={[0, -0.05, 0]} opacity={0.48} scale={48} blur={2.2} far={10} color="#000000" />
    </group>
  );
}
