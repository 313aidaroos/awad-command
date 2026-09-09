'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { KitModel } from '@/scene/kit/KitModel';
import type { KitName } from '@/scene/kit/catalog';
import { GraphitePlate } from '@/scene/materials/GraphitePlate';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const HEX = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2);
const TRI = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2);
const QUAD = [0, 1, 2, 3].map((i) => (i / 4) * Math.PI * 2);

function Kit({
  name,
  r,
  a,
  y = 0,
  scale = 1,
  yaw = 0,
  sit = true,
}: {
  name: KitName;
  r: number;
  a: number;
  y?: number;
  scale?: number;
  yaw?: number;
  sit?: boolean;
}) {
  return (
    <KitModel
      name={name}
      position={[Math.sin(a) * r, y, Math.cos(a) * r]}
      rotation={[0, a + yaw, 0]}
      scale={scale}
      sit={sit}
    />
  );
}

function EmissiveSlits({ radius, y, count, height }: { radius: number; y: number; count: number; height: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <mesh key={a} position={[Math.sin(a) * radius, y, Math.cos(a) * radius]} rotation={[0, a, 0]} castShadow>
            <boxGeometry args={[0.045, height, 0.09]} />
            <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.15} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

function IntelligenceCore() {
  const ring = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.035;
  });

  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.28, 2.42, 0.56, 48]} />
        <GraphitePlate repeat={[3.2, 0.7]} grade="#D0D4DA" />
      </mesh>
      <mesh position={[0, 0.58, 0]} receiveShadow>
        <cylinderGeometry args={[2.12, 2.2, 0.08, 48]} />
        <GraphitePlate repeat={[4, 0.25]} grade="#E6E8EC" />
      </mesh>

      {TRI.map((a) => (
        <Kit key={`lg-${a}`} name="columnLarge" r={0.62} a={a} scale={0.7} />
      ))}
      {HEX.map((a) => (
        <Kit key={`pp-${a}`} name="columnPipes" r={1.36} a={a} y={0.55} />
      ))}
      {QUAD.map((a) => (
        <Kit key={`rd-${a}`} name="columnRound" r={1.88} a={a} y={0.55} scale={0.92} />
      ))}
      {TRI.map((a) => (
        <Kit key={`as-${a}`} name="columnAstra" r={1.72} a={a + 0.4} y={0.55} />
      ))}

      <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.68, 1.78, 3.55, 48]} />
        <GraphitePlate repeat={[2.6, 3.4]} />
      </mesh>
      <EmissiveSlits radius={1.71} y={2.15} count={10} height={0.72} />
      <EmissiveSlits radius={1.69} y={3.35} count={10} height={0.42} />

      <group ref={ring}>
        <KitModel name="railRoundBig" position={[0, 2.08, 0]} scale={1.12} />
        <KitModel name="railRoundBig" position={[0, 4.28, 0]} scale={1.02} />
      </group>
      <KitModel name="railRoundSmall" position={[0, 5.55, 0]} scale={1.35} />
      <KitModel name="columnHollow" position={[0, 5.05, 0]} scale={0.85} />

      {HEX.map((a) => (
        <Kit key={`pc-${a}`} name="computer" r={2.02} a={a} y={0.58} yaw={Math.PI} />
      ))}
      {TRI.map((a) => (
        <Kit key={`ap-${a}`} name="accessPoint" r={1.74} a={a + 0.52} y={3.15} sit={false} />
      ))}
      {QUAD.map((a) => (
        <Kit key={`vt-${a}`} name="ventWide" r={1.7} a={a + 0.2} y={4.22} sit={false} yaw={Math.PI / 2} />
      ))}
      {TRI.map((a) => (
        <Kit key={`cb-${a}`} name="cable3" r={1.82} a={a + 0.15} y={1.85} yaw={1.2} />
      ))}
      {QUAD.map((a) => (
        <Kit key={`lt-${a}`} name="lightSmall" r={1.55} a={a + 0.4} y={5.85} sit={false} />
      ))}
      <KitModel name="fan" position={[1.05, 4.38, 0.2]} sit={false} />
      <KitModel name="fan" position={[-0.95, 4.38, -0.35]} sit={false} />
      <KitModel name="decalLogo" position={[0, 3.05, 1.72]} rotation={[0, 0, 0]} sit={false} scale={0.85} />
      <KitModel name="decalLogo" position={[0, 3.05, -1.72]} rotation={[0, Math.PI, 0]} sit={false} scale={0.85} />
      <KitModel name="barrelLarge" position={[1.95, 0.56, 0.15]} />
      <KitModel name="lightWide" position={[0, 6.55, 0]} sit={false} />

      <mesh position={[0, 6.85, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.62, 0.55, 24]} />
        <GraphitePlate repeat={[1.4, 0.5]} grade="#B8BDC6" />
      </mesh>
      <mesh position={[0, 7.22, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.55, 12]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.3} toneMapped={false} />
      </mesh>

      <pointLight color="#D7DCE4" intensity={0.62} distance={14} position={[2.8, 6.4, 3.2]} />
      <pointLight color="#3D8BFF" intensity={0.28} distance={9} position={[0, 3.2, 0]} />
      <pointLight color="#C9D0DA" intensity={0.35} distance={8} position={[-2.2, 4.6, -1.4]} />
    </group>
  );
}

/** Dense MegaKit + Poly Haven plate core. Authored maps, not a grey gyro. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [6.4, 4.6, 9.6], lookAt: [0, 3.4, 0], duration: 1.05, phase: 'universe' });
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
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 7.55, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}
