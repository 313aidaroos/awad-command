'use client';

import { Brushed, Graphite } from '@/scene/kit/materials';
import { FramedPanel, Slit } from '@/scene/kit/parts';

const BAYS = [-10.5, -6.5, -2.5, 1.5, 5.5, 10.5] as const;

/** Ceiling coffers, floor lane, bay practicals — hall dress, not more empty boxes. */
export function ContraxisDress({ accent }: { accent: string }) {
  return (
    <group>
      {[-3.1, -1.05, 1.05, 3.1].map((z) => (
        <mesh key={`beam-${z}`} position={[0, 5.08, z]}>
          <boxGeometry args={[30.5, 0.1, 0.18]} />
          <Graphite roughness={0.34} />
        </mesh>
      ))}
      {BAYS.map((x) => (
        <group key={`well-${x}`}>
          <mesh position={[x, 5.14, 0]}>
            <boxGeometry args={[1.8, 0.04, 4.4]} />
            <meshStandardMaterial color="#C8CED6" emissive="#E8EDF3" emissiveIntensity={0.28} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[29.5, 0.03, 2.05]} />
        <Graphite roughness={0.28} metalness={0.88} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[28.2, 0.012, 0.05]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.48} />
      </mesh>
      {BAYS.map((x) => (
        <mesh key={`hash-${x}`} position={[x, 0.035, 0]}>
          <boxGeometry args={[0.045, 0.012, 1.85]} />
          <Brushed roughness={0.2} />
        </mesh>
      ))}
      {[-4.2, 4.2].map((z) =>
        [-10, -2, 6].map((x) => (
          <group key={`${x}:${z}`} position={[x, 0, z]}>
            <mesh position={[0, 1.05, 0]}>
              <boxGeometry args={[3.4, 2.1, 1.85]} />
              <Graphite roughness={0.4} />
            </mesh>
            <group position={[0, 1.15, z > 0 ? -0.94 : 0.94]}>
              <FramedPanel width={2.9} height={1.75} accent={accent} thickness={0.045} />
            </group>
            <mesh position={[0, 0.78, z > 0 ? -0.2 : 0.2]}>
              <boxGeometry args={[2.05, 0.07, 0.85]} />
              <Brushed roughness={0.24} />
            </mesh>
            <pointLight
              color="#efe6d6"
              intensity={0.55}
              distance={5.5}
              position={[0, 1.85, z > 0 ? -0.15 : 0.15]}
            />
            <Slit position={[0, 2.02, z > 0 ? -0.9 : 0.9]} size={[0.9, 0.025, 0.025]} accent={accent} intensity={0.5} />
          </group>
        )),
      )}
    </group>
  );
}
