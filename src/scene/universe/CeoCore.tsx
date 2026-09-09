'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { requestCeoOpen } from '@/lib/ceoBridge';
import { CEO_CLOSE_CAM } from '@/scene/lib/cameraPaths';
import { KitModel } from '@/scene/kit/KitModel';
import type { KitName } from '@/scene/kit/catalog';
import { GraphitePlate } from '@/scene/materials/GraphitePlate';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

const HEX = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2);
const TRI = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2);
const COOL = '#C5CED6';
const FACE = -Math.PI / 2;

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
  scale?: number | [number, number, number];
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

function Armor({ y, r, name }: { y: number; r: number; name: KitName }) {
  return (
    <>
      {HEX.map((a) => (
        <Kit
          key={`${name}-${y}-${a.toFixed(3)}`}
          name={name}
          r={r}
          a={a}
          y={y}
          scale={[0.5, 1, 0.5]}
          yaw={FACE}
        />
      ))}
    </>
  );
}

function Slits({ radius, y, count, height }: { radius: number; y: number; count: number; height: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / 6;
        return (
          <mesh key={`${y}-${i}`} position={[Math.sin(a) * radius, y, Math.cos(a) * radius]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.045, height, 0.08]} />
            <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

function Dish({ a, y, r }: { a: number; y: number; r: number }) {
  return (
    <group position={[Math.sin(a) * r, y, Math.cos(a) * r]} rotation={[0.62, a, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <sphereGeometry args={[0.4, 20, 12, 0, Math.PI]} />
        <GraphitePlate repeat={[0.85, 0.85]} grade="#C8CED6" />
      </mesh>
      <mesh position={[0, 0.06, 0.02]}>
        <cylinderGeometry args={[0.045, 0.06, 0.2, 10]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
    </group>
  );
}

function IntelligenceCore() {
  const ring = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += dt * 0.028;
  });

  return (
    <group scale={1.1}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.05, 2.22, 0.4, 48]} />
        <GraphitePlate repeat={[1.35, 0.35]} grade="#D0D5DC" />
      </mesh>
      <mesh position={[0, 2.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.12, 1.2, 4.05, 40]} />
        <GraphitePlate repeat={[0.85, 1.05]} grade="#8A9098" />
      </mesh>
      <mesh position={[0, 4.55, 0]} castShadow>
        <cylinderGeometry args={[1.22, 1.48, 0.22, 32]} />
        <GraphitePlate repeat={[1.1, 0.25]} grade="#D4D8DE" />
      </mesh>

      <Armor y={0.42} r={1.74} name="shortPlates" />
      <Armor y={1.42} r={1.7} name="shortMetal" />
      <Armor y={2.42} r={1.74} name="shortPlates" />
      <Armor y={3.42} r={1.66} name="shortAccent" />
      <Armor y={4.42} r={1.52} name="shortMetal2" />

      {HEX.map((a, i) => (
        <Kit
          key={`rib-${a}`}
          name={i % 2 === 0 ? 'columnPipes' : 'columnRound'}
          r={1.88}
          a={a + Math.PI / 6}
          y={0.42}
          scale={0.48}
        />
      ))}

      <Slits radius={1.7} y={1.55} count={6} height={0.7} />
      <Slits radius={1.68} y={2.85} count={6} height={0.85} />
      <Slits radius={1.58} y={3.95} count={6} height={0.45} />

      <group ref={ring}>
        <KitModel name="railRoundBig" position={[0, 1.48, 0]} scale={0.92} grade={COOL} />
        <KitModel name="railRoundBig" position={[0, 3.38, 0]} scale={0.86} grade={COOL} />
      </group>
      <KitModel name="railRoundSmall" position={[0, 4.48, 0]} scale={1.22} grade={COOL} />
      <KitModel name="columnHollow" position={[0, 4.48, 0]} scale={0.58} grade={COOL} />

      {HEX.map((a) => (
        <Kit key={`pc-${a}`} name="computer" r={1.98} a={a} y={0.48} yaw={Math.PI} scale={0.62} />
      ))}
      {TRI.map((a) => (
        <Kit key={`ap-${a}`} name="accessPoint" r={1.78} a={a + 0.52} y={2.55} sit={false} />
      ))}
      {TRI.map((a) => (
        <Kit key={`cb-${a}`} name="cable3" r={1.95} a={a + 0.2} y={0.48} yaw={1.1} scale={0.85} />
      ))}
      {TRI.map((a) => (
        <Dish key={`ds-${a}`} a={a + 0.35} y={5.05} r={0.82} />
      ))}
      {HEX.filter((_, i) => i % 2 === 0).map((a) => (
        <Kit key={`vt-${a}`} name="ventWide" r={1.42} a={a + 0.2} y={4.55} sit={false} yaw={FACE} scale={0.55} />
      ))}

      <KitModel name="decalLogo" position={[0, 2.65, 1.78]} sit={false} scale={0.72} grade="#D8DCE0" />
      <KitModel name="decalLogo" position={[0, 2.65, -1.78]} rotation={[0, Math.PI, 0]} sit={false} scale={0.72} grade="#D8DCE0" />
      <KitModel name="fan" position={[0.72, 4.85, 0.22]} sit={false} grade={COOL} />
      <KitModel name="fan" position={[-0.68, 4.85, -0.18]} sit={false} grade={COOL} />
      <KitModel name="lightWide" position={[0, 5.55, 0]} sit={false} grade={COOL} />
      <KitModel name="lightSmall" position={[0, 5.85, 0]} sit={false} scale={0.8} grade="#D0D6DC" />

      <mesh position={[0, 5.95, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.38, 10]} />
        <meshStandardMaterial color="#3D8BFF" emissive="#3D8BFF" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>

      <pointLight color="#F2F4F8" intensity={1.35} distance={18} position={[3.2, 7.1, 4.4]} />
      <pointLight color="#3D8BFF" intensity={0.48} distance={11} position={[0, 2.7, 0]} />
      <pointLight color="#D4DAE2" intensity={0.62} distance={10} position={[-2.4, 5.4, -2.2]} />
    </group>
  );
}

/** Faceted MegaKit armor over a riveted plate core. Not a grey gyro. */
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
      <FloatingLabel id="ceo-core" priority={4} maxDist={48} fadeFrom={32} position={[0, 6.55, 0]}>
        <WorldName primary>AWAD</WorldName>
      </FloatingLabel>
    </group>
  );
}
