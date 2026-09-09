'use client';

import { ContactShadows } from '@react-three/drei';
import { KitModel } from '@/scene/kit/KitModel';
import { PLAZA_ORBIT_R, plazaOrbit } from '@/scene/universe/identities';

const ORBIT_MARKS = Array.from({ length: 7 }, (_, i) => plazaOrbit(i));

/** Authored circular deck: Poly Haven metal plate baked onto real ring UVs. */
export function PlazaDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial color="#07080A" metalness={0.12} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <cylinderGeometry args={[4.35, 4.35, 0.1, 56]} />
        <meshPhysicalMaterial color="#101318" metalness={0.78} roughness={0.42} envMapIntensity={0.22} />
      </mesh>
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <cylinderGeometry args={[2.35, 2.55, 0.08, 48]} />
        <meshPhysicalMaterial color="#0C0F14" metalness={0.74} roughness={0.46} envMapIntensity={0.18} />
      </mesh>
      <KitModel name="plazaDeck" grade="#5C6168" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.44, 0]}>
        <torusGeometry args={[PLAZA_ORBIT_R, 0.028, 8, 72]} />
        <meshStandardMaterial color="#16191E" metalness={0.7} roughness={0.38} />
      </mesh>
      {ORBIT_MARKS.map(([x, , z]) => (
        <mesh key={`orbit-${x}-${z}`} position={[x, 0.46, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.07, 12]} />
          <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.42} toneMapped={false} />
        </mesh>
      ))}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.58} scale={28} blur={2.4} far={6} color="#000000" />
    </group>
  );
}
