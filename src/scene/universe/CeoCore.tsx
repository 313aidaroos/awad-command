'use client';

import { requestCeoOpen } from '@/lib/ceoBridge';
import { CEO_CLOSE_CAM } from '@/scene/lib/cameraPaths';
import { KitModel } from '@/scene/kit/KitModel';
import { BrushedMetal } from '@/scene/materials/BrushedMetal';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

function IntelligenceCore() {
  return (
    <group scale={1.08}>
      <mesh position={[0, 2.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.12, 1.7, 4.76, 64]} />
        <BrushedMetal />
      </mesh>

      <mesh position={[0, 2.38, 0]}>
        <cylinderGeometry args={[1.16, 1.2, 0.4, 48]} />
        <meshStandardMaterial color="#08090C" roughness={0.96} metalness={0.12} />
      </mesh>

      <mesh position={[0, 2.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.26, 0.028, 12, 64]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.72} toneMapped={false} />
      </mesh>

      <group position={[0, 4.86, 0.1]} rotation={[0.52, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <sphereGeometry args={[0.5, 32, 16, 0, Math.PI]} />
          <BrushedMetal grade="#D0D5DC" />
        </mesh>
      </group>

      <KitModel name="decalLogo" position={[0, 1.42, 1.54]} sit={false} scale={0.5} grade="#D8DCE0" />

      <pointLight color="#F4F6F8" intensity={1.35} distance={16} position={[2.6, 6.1, 4.8]} />
      <pointLight color="#3D8BFF" intensity={0.38} distance={7} position={[0, 2.38, 0]} />
      <pointLight color="#D4DAE2" intensity={0.36} distance={8} position={[-2.0, 4.5, -1.6]} />
    </group>
  );
}

/** One tapered brushed volume, mid well + one ring. Not stacked boxes. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

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
      <IntelligenceCore />
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 5.7, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}
