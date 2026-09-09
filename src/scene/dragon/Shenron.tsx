'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';

function shenronCurve() {
  const pts: THREE.Vector3[] = [];
  const n = 88;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = -0.55 + t * Math.PI * 2 * 2.2;
    const r = 6.1 + Math.sin(t * Math.PI * 3.1) * 1.25 + t * 0.9;
    const y = 3.4 + t * 13.8;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const tip = pts[pts.length - 1]!;
  pts.push(tip.clone().add(new THREE.Vector3(2.4, 0.8, 4.8)));
  pts.push(tip.clone().add(new THREE.Vector3(4.2, 0.35, 9.1)));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.32);
}

function Head({ origin, tangent, glow }: { origin: THREE.Vector3; tangent: THREE.Vector3; glow: number }) {
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent.clone().normalize());
    return q;
  }, [tangent]);

  return (
    <group position={origin} quaternion={quat}>
      <mesh>
        <sphereGeometry args={[0.72, 16, 12]} />
        <meshPhysicalMaterial color="#1F8A3A" roughness={0.42} metalness={0.12} clearcoat={0.28} />
      </mesh>
      <mesh position={[0, 0.05, 0.85]}>
        <coneGeometry args={[0.42, 1.15, 10]} />
        <meshPhysicalMaterial color="#248B3C" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.12, 0.7]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.55, 0.16, 0.7]} />
        <meshStandardMaterial color="#C9A24A" roughness={0.45} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh position={[s * 0.28, 0.22, 0.55]}>
            <sphereGeometry args={[0.11, 10, 8]} />
            <meshStandardMaterial color="#FF2A1A" emissive="#FF2A1A" emissiveIntensity={1.4 * glow} toneMapped={false} />
          </mesh>
          <mesh position={[s * 0.22, 0.62, -0.05]} rotation={[0.4, 0, s * 0.35]}>
            <coneGeometry args={[0.07, 0.7, 6]} />
            <meshStandardMaterial color="#6B4423" roughness={0.7} />
          </mesh>
          <mesh position={[s * 0.55, -0.05, 0.35]} rotation={[0.2, s * 0.8, 0]}>
            <cylinderGeometry args={[0.025, 0.018, 2.4, 6]} />
            <meshStandardMaterial color="#D8C07A" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Shenron() {
  const level = useCommandStore((s) => s.quality.level);
  const mode = useCommandStore((s) => s.shenronMode);
  const curve = useMemo(() => shenronCurve(), []);
  const tubular = level === 'low' ? 64 : level === 'medium' ? 96 : 128;
  const head = useMemo(() => {
    const origin = curve.getPoint(1);
    const tangent = curve.getTangent(1);
    return { origin, tangent };
  }, [curve]);
  const plates = useMemo(() => {
    const n = level === 'low' ? 10 : 18;
    return Array.from({ length: n }, (_, i) => {
      const t = 0.08 + (i / n) * 0.82;
      return { p: curve.getPoint(t), n: curve.getTangent(t) };
    });
  }, [curve, level]);
  const glow = mode ? 1.55 : 1;

  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[curve, tubular, 0.58, 10, false]} />
        <meshPhysicalMaterial
          color="#1C7A36"
          roughness={0.38}
          metalness={0.08}
          clearcoat={0.22}
          emissive="#0B3D18"
          emissiveIntensity={mode ? 0.35 : 0.08}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, tubular, 0.32, 8, false]} />
        <meshStandardMaterial color="#D2B056" roughness={0.48} metalness={0.2} />
      </mesh>
      {plates.map((plate, i) => (
        <mesh key={i} position={plate.p} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), plate.n)}>
          <coneGeometry args={[0.16, 0.42, 5]} />
          <meshStandardMaterial color="#16662C" roughness={0.5} />
        </mesh>
      ))}
      <Head origin={head.origin} tangent={head.tangent} glow={glow} />
    </group>
  );
}
