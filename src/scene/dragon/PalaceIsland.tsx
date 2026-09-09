'use client';

import { requestCeoOpen } from '@/lib/ceoBridge';
import { CEO_CLOSE_CAM } from '@/scene/lib/cameraPaths';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

function Waterfall({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 1.6, z]} rotation={[0.05, 0, 0]}>
      <planeGeometry args={[0.55, 3.4]} />
      <meshStandardMaterial color="#9FD4FF" transparent opacity={0.38} emissive="#6AB4FF" emissiveIntensity={0.2} side={2} />
    </mesh>
  );
}

export function PalaceIsland() {
  const flyTo = useCommandStore((s) => s.flyTo);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ ...CEO_CLOSE_CAM });
        requestCeoOpen();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'grab';
      }}
    >
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <cylinderGeometry args={[7.6, 8.4, 2.2, 28]} />
        <meshStandardMaterial color="#5A8A4A" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.55, 0]} receiveShadow>
        <cylinderGeometry args={[5.4, 6.2, 1.1, 24]} />
        <meshStandardMaterial color="#6B9A52" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[4.4, 4.8, 0.7, 20]} />
        <meshStandardMaterial color="#8A8E86" roughness={0.7} />
      </mesh>

      <mesh position={[0, 2.7, 0]} castShadow>
        <cylinderGeometry args={[2.7, 3.05, 2.2, 8]} />
        <meshStandardMaterial color="#F3F1EA" roughness={0.55} />
      </mesh>
      <mesh position={[0, 4.15, 0]} castShadow>
        <cylinderGeometry args={[2.15, 2.45, 1.7, 8]} />
        <meshStandardMaterial color="#EFEDE6" roughness={0.52} />
      </mesh>
      <mesh position={[0, 5.45, 0]} castShadow>
        <cylinderGeometry args={[1.45, 1.75, 1.3, 8]} />
        <meshStandardMaterial color="#F7F4EC" roughness={0.5} />
      </mesh>
      <mesh position={[0, 6.55, 0]} castShadow>
        <sphereGeometry args={[1.55, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#E8B84A" metalness={0.55} roughness={0.28} emissive="#C48420" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 3.4, 2.85]}>
        <boxGeometry args={[0.7, 0.7, 0.08]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {([-2.6, 2.6] as const).map((x) => (
        <mesh key={x} position={[x, 2.55, 2.1]} castShadow>
          <boxGeometry args={[0.85, 1.6, 0.85]} />
          <meshStandardMaterial color="#E8B24A" roughness={0.4} />
        </mesh>
      ))}
      <Waterfall x={-3.8} z={4.6} />
      <Waterfall x={3.4} z={4.2} />

      <pointLight color="#FFD27A" intensity={1.1} distance={28} position={[6, 10, 8]} />
      <pointLight color="#3D8BFF" intensity={0.25} distance={16} position={[0, 8, 0]} />

      <FloatingLabel id="ceo-core" priority={4} maxDist={90} fadeFrom={70} position={[0, 9.1, 0]}>
        <WorldName primary>
          AWAD PALACE
          <div style={{ fontSize: 9, letterSpacing: '0.16em', opacity: 0.85, marginTop: 2 }}>CEO · STRATEGY · EMPIRE</div>
        </WorldName>
      </FloatingLabel>
    </group>
  );
}
