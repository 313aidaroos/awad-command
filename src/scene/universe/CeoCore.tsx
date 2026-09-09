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
const COOL = '#C5CED6';

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
      grade={COOL}
    />
  );
}

function EmissiveSlits({ radius, y, count, height }: { radius: number; y: number; count: number; height: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (y * 0.12);
        return (
          <mesh key={`${y}-${a}`} position={[Math.sin(a) * radius, y, Math.cos(a) * radius]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.05, height, 0.1]} />
            <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.35} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

function IntelligenceCore() {
  const ring = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.03;
  });

  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.15, 2.32, 0.44, 56]} />
        <GraphitePlate repeat={[3.4, 0.55]} grade="#E6E8EC" />
      </mesh>
      <mesh position={[0, 0.48, 0]} receiveShadow>
        <cylinderGeometry args={[2.02, 2.1, 0.1, 56]} />
        <GraphitePlate repeat={[4.2, 0.22]} grade="#F2F4F7" />
      </mesh>

      <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.82, 1.96, 4.15, 56]} />
        <GraphitePlate repeat={[2.8, 3.6]} grade="#D8DCE4" />
      </mesh>
      <mesh position={[0, 4.72, 0]} castShadow>
        <cylinderGeometry args={[1.55, 1.82, 0.28, 48]} />
        <GraphitePlate repeat={[2.4, 0.3]} grade="#E6E8EC" />
      </mesh>
      <EmissiveSlits radius={1.85} y={1.45} count={12} height={0.55} />
      <EmissiveSlits radius={1.83} y={2.55} count={12} height={0.85} />
      <EmissiveSlits radius={1.78} y={3.75} count={12} height={0.48} />

      {HEX.map((a) => (
        <Kit key={`pp-${a}`} name="columnPipes" r={1.98} a={a} y={0.5} scale={0.72} />
      ))}
      {QUAD.map((a) => (
        <Kit key={`rd-${a}`} name="columnRound" r={1.55} a={a + 0.4} y={0.5} scale={0.55} />
      ))}
      {TRI.map((a) => (
        <Kit key={`as-${a}`} name="columnAstra" r={1.88} a={a + 0.28} y={0.5} scale={1.05} />
      ))}

      <group ref={ring}>
        <KitModel name="railRoundBig" position={[0, 1.55, 0]} scale={1.08} grade={COOL} />
        <KitModel name="railRoundBig" position={[0, 3.55, 0]} scale={1.02} grade={COOL} />
      </group>
      <KitModel name="railRoundSmall" position={[0, 4.72, 0]} scale={1.42} grade={COOL} />
      <KitModel name="columnHollow" position={[0, 4.72, 0]} scale={0.72} grade={COOL} />

      {HEX.map((a) => (
        <Kit key={`pc-${a}`} name="computer" r={2.08} a={a} y={0.52} yaw={Math.PI} scale={0.92} />
      ))}
      {TRI.map((a) => (
        <Kit key={`ap-${a}`} name="accessPoint" r={1.86} a={a + 0.5} y={2.85} sit={false} />
      ))}
      {QUAD.map((a) => (
        <Kit key={`vt-${a}`} name="ventWide" r={1.84} a={a + 0.18} y={4.12} sit={false} yaw={Math.PI / 2} />
      ))}
      {TRI.map((a) => (
        <Kit key={`cb-${a}`} name="cable3" r={1.92} a={a + 0.12} y={1.35} yaw={1.15} />
      ))}
      {QUAD.map((a) => (
        <Kit key={`lt-${a}`} name="lightSmall" r={1.35} a={a + 0.35} y={5.15} sit={false} />
      ))}
      <KitModel name="fan" position={[0.95, 4.22, 0.15]} sit={false} grade={COOL} />
      <KitModel name="fan" position={[-0.88, 4.22, -0.28]} sit={false} grade={COOL} />
      <KitModel name="decalLogo" position={[0, 2.85, 1.86]} sit={false} scale={0.9} grade={COOL} />
      <KitModel name="decalLogo" position={[0, 2.85, -1.86]} rotation={[0, Math.PI, 0]} sit={false} scale={0.9} grade={COOL} />
      <KitModel name="lightWide" position={[0, 5.55, 0]} sit={false} grade={COOL} />

      <mesh position={[0, 5.72, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.58, 0.42, 24]} />
        <GraphitePlate repeat={[1.5, 0.4]} grade="#E6E8EC" />
      </mesh>
      <mesh position={[0, 6.05, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.42, 12]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.45} toneMapped={false} />
      </mesh>

      <pointLight color="#F0F3F7" intensity={1.15} distance={16} position={[3.4, 6.8, 4.1]} />
      <pointLight color="#3D8BFF" intensity={0.42} distance={10} position={[0, 2.8, 0]} />
      <pointLight color="#D7DCE4" intensity={0.55} distance={9} position={[-2.6, 5.2, -2.0]} />
    </group>
  );
}

/** One plated drum + MegaKit greebles. Authored maps, not a grey gyro. */
export function CeoCore() {
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);

  if (focused) return null;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        flyTo({ position: [5.8, 3.8, 8.4], lookAt: [0, 2.8, 0], duration: 1.05, phase: 'universe' });
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
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 6.35, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}
