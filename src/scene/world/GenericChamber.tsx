'use client';

import { Brushed, Graphite } from '@/scene/kit/materials';
import { Column, FramedPanel } from '@/scene/kit/parts';

/** Smaller sealed chamber for non-Contraxis worlds — same kit language. */
export function GenericChamber({ accent }: { accent: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} receiveShadow>
        <planeGeometry args={[22, 16]} />
        <Graphite roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, -1.12, 0]}>
        <boxGeometry args={[10, 0.04, 1.2]} />
        <meshStandardMaterial color="#14181E" roughness={0.72} metalness={0.22} />
      </mesh>
      {[-6, -2, 2, 6].flatMap((x) =>
        ([-4.6, 4.6] as const).map((z) => (
          <group key={`${x}:${z}`} position={[x, -1.15, z]}>
            <Column height={4.4} width={0.26} />
          </group>
        )),
      )}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[20.4, 0.1, 14.4]} />
        <Graphite roughness={0.48} />
      </mesh>
      <group position={[0, 1.1, -7.15]}>
        <FramedPanel width={19.6} height={4.2} accent={accent} thickness={0.05} />
      </group>
      <group position={[0, 1.1, 7.15]}>
        <FramedPanel width={19.6} height={4.2} accent={accent} thickness={0.05} />
      </group>
      <mesh position={[-10.1, 1.05, 0]}>
        <boxGeometry args={[0.18, 4.4, 14.6]} />
        <Graphite roughness={0.48} />
      </mesh>
      <mesh position={[10.1, 1.05, 0]}>
        <boxGeometry args={[0.18, 4.4, 14.6]} />
        <Graphite roughness={0.48} />
      </mesh>
      <mesh position={[0, 3.14, 0]}>
        <boxGeometry args={[4, 0.04, 0.16]} />
        <Brushed roughness={0.28} />
      </mesh>
      <hemisphereLight args={['#f4f6fa', '#2a3038', 0.5]} />
      <pointLight color="#eef1f5" intensity={2.2} distance={18} position={[-3, 2.4, 2]} />
      <pointLight color="#e4e8f0" intensity={1.6} distance={16} position={[4, 2.1, -2]} />
    </group>
  );
}
