'use client';

import { RoundedBox } from '@react-three/drei';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { CEO_CLOSE_CAM } from '@/scene/lib/cameraPaths';
import { KitModel } from '@/scene/kit/KitModel';
import { GraphitePlate } from '@/scene/materials/GraphitePlate';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const QUAD = [0, 1, 2, 3].map((i) => (i / 4) * Math.PI * 2);
const TRI = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2);
const PLATE = [0.38, 0.46] as [number, number];
const FACE_R = 1.55;
const FACE_W = 3.02;
const FACE_D = 0.22;

function FacePlate({ a, y, h, grade }: { a: number; y: number; h: number; grade?: string }) {
  return (
    <RoundedBox
      args={[FACE_W, h, FACE_D]}
      radius={0.1}
      smoothness={4}
      bevelSegments={3}
      position={[Math.sin(a) * FACE_R, y, Math.cos(a) * FACE_R]}
      rotation={[0, a, 0]}
      castShadow
      receiveShadow
    >
      <GraphitePlate repeat={PLATE} grade={grade ?? '#C6CCD4'} />
    </RoundedBox>
  );
}

function Dish({ a, y, r }: { a: number; y: number; r: number }) {
  return (
    <group position={[Math.sin(a) * r, y, Math.cos(a) * r]} rotation={[0.7, a, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <sphereGeometry args={[0.32, 18, 10, 0, Math.PI]} />
        <GraphitePlate repeat={PLATE} grade="#C8CED6" />
      </mesh>
      <mesh position={[0, 0.05, 0.02]}>
        <cylinderGeometry args={[0.04, 0.05, 0.16, 10]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.85} toneMapped={false} />
      </mesh>
    </group>
  );
}

function IntelligenceCore() {
  return (
    <group scale={1.08}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.82, 1.98, 0.32, 40]} />
        <GraphitePlate repeat={PLATE} grade="#B4BAC2" />
      </mesh>

      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[1.26, 1.3, 4.55, 28]} />
        <meshStandardMaterial color="#08090C" roughness={0.94} metalness={0.18} />
      </mesh>

      {QUAD.map((a) => (
        <FacePlate key={`lo-${a}`} a={a} y={1.28} h={2.2} />
      ))}

      <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.034, 10, 56]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.05} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.58, 0.016, 8, 48]} />
        <meshStandardMaterial
          color="#3D8BFF"
          emissive="#3D8BFF"
          emissiveIntensity={0.32}
          transparent
          opacity={0.65}
          toneMapped={false}
        />
      </mesh>

      {QUAD.map((a) => (
        <group key={`hi-${a}`} scale={[0.9, 1, 0.9]}>
          <FacePlate a={a} y={3.78} h={2.05} grade="#D2D6DC" />
        </group>
      ))}

      <mesh position={[0, 4.78, 0]} castShadow>
        <cylinderGeometry args={[0.88, 1.18, 0.16, 28]} />
        <GraphitePlate repeat={PLATE} grade="#C8CED4" />
      </mesh>

      <KitModel name="decalLogo" position={[0, 1.28, FACE_R + 0.12]} sit={false} scale={0.58} grade="#D8DCE0" />
      {TRI.map((a) => (
        <Dish key={`ds-${a}`} a={a + 0.4} y={5.02} r={0.62} />
      ))}
      <KitModel name="lightWide" position={[0, 5.08, 0]} sit={false} grade="#C5CED6" />
      <mesh position={[0, 5.42, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.32, 10]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>

      <pointLight color="#F2F4F8" intensity={1.4} distance={16} position={[2.8, 6.4, 4.6]} />
      <pointLight color="#3D8BFF" intensity={0.55} distance={9} position={[0, 2.5, 0]} />
      <pointLight color="#D4DAE2" intensity={0.48} distance={9} position={[-2.2, 4.8, -1.8]} />
    </group>
  );
}

/** Two-storey beveled plates + recessed ring. MegaKit stays off the photographed face. */
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
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 6.15, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}
