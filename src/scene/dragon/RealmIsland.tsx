'use client';

import { islandCam, type RealmDef, type RealmKind } from '@/scene/dragon/islands';
import { pointerGate } from '@/scene/lib/pointer';
import { FloatingLabel } from '@/scene/ui/FloatingLabel';
import { WorldName } from '@/scene/ui/WorldName';
import { useCommandStore } from '@/store/useCommandStore';

function Rock({ color, r = 2.6 }: { color: string; r?: number }) {
  return (
    <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r * 1.18, 1.1, 10]} />
      <meshStandardMaterial color={color} roughness={0.88} />
    </mesh>
  );
}

function Buildings({ color, n, h }: { color: string; n: number; h: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const rad = 0.55 + (i % 3) * 0.28;
        const ht = h * (0.55 + (i % 4) * 0.22);
        return (
          <mesh key={i} position={[Math.cos(a) * rad, ht / 2, Math.sin(a) * rad]} castShadow>
            <boxGeometry args={[0.32, ht, 0.32]} />
            <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} />
          </mesh>
        );
      })}
    </>
  );
}

function RealmMesh({ kind }: { kind: RealmKind }) {
  switch (kind) {
    case 'city':
      return (
        <>
          <Rock color="#3A5A7A" r={2.8} />
          <Buildings color="#8FD0FF" n={9} h={2.8} />
        </>
      );
    case 'social':
      return (
        <>
          <Rock color="#5A3868" />
          <mesh position={[0, 1.15, 0.2]} castShadow>
            <boxGeometry args={[1.6, 1.1, 0.18]} />
            <meshStandardMaterial color="#E48BFF" emissive="#C056E8" emissiveIntensity={0.55} toneMapped={false} />
          </mesh>
          <mesh position={[0, 1.55, 0.22]}>
            <circleGeometry args={[0.22, 12]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </>
      );
    case 'industrial':
      return (
        <>
          <Rock color="#4A453C" r={2.9} />
          <Buildings color="#8A8070" n={7} h={1.6} />
          <mesh position={[0.9, 2.1, 0]} castShadow>
            <boxGeometry args={[0.18, 2.6, 0.18]} />
            <meshStandardMaterial color="#C4B08A" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[1.55, 3.25, 0]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[1.5, 0.12, 0.12]} />
            <meshStandardMaterial color="#D2C094" metalness={0.45} roughness={0.38} />
          </mesh>
        </>
      );
    case 'dome':
      return (
        <>
          <Rock color="#8A8878" />
          <mesh position={[0, 0.7, 0]} castShadow>
            <sphereGeometry args={[1.35, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial color="#F4EFE4" roughness={0.35} metalness={0.08} />
          </mesh>
        </>
      );
    case 'music':
      return (
        <>
          <Rock color="#1A1424" />
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.cos(i) * 0.7, 1.1 + (i % 3) * 0.25, Math.sin(i) * 0.7]} castShadow>
              <coneGeometry args={[0.22, 1.6 + (i % 3) * 0.4, 5]} />
              <meshStandardMaterial color="#7B5BFF" roughness={0.35} emissive="#3B1B88" emissiveIntensity={0.25} />
            </mesh>
          ))}
        </>
      );
    case 'snow':
      return (
        <>
          <Rock color="#8AA0B0" r={2.7} />
          <mesh position={[0, 1.4, 0]} castShadow>
            <coneGeometry args={[1.5, 2.8, 7]} />
            <meshStandardMaterial color="#E8F1F6" roughness={0.72} />
          </mesh>
          <mesh position={[0.9, 0.9, -0.5]} castShadow>
            <coneGeometry args={[0.7, 1.5, 6]} />
            <meshStandardMaterial color="#D5E4EE" roughness={0.75} />
          </mesh>
        </>
      );
    case 'volcano':
      return (
        <>
          <Rock color="#3A2018" r={2.8} />
          <mesh position={[0, 1.2, 0]} castShadow>
            <coneGeometry args={[1.7, 2.4, 8]} />
            <meshStandardMaterial color="#6A2A1A" roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.15, 0]}>
            <cylinderGeometry args={[0.35, 0.55, 0.3, 10]} />
            <meshStandardMaterial color="#FF4A1A" emissive="#FF3A00" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
          <pointLight color="#FF5520" intensity={1.1} distance={10} position={[0, 2.4, 0]} />
        </>
      );
    case 'matrix':
      return (
        <>
          <Rock color="#102418" />
          <Buildings color="#22C55E" n={10} h={2.1} />
          <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.1, 16]} />
            <meshStandardMaterial color="#14532D" emissive="#16A34A" emissiveIntensity={0.2} />
          </mesh>
        </>
      );
    case 'pagoda':
      return (
        <>
          <Rock color="#3F6B38" />
          {[0, 1, 2].map((i) => (
            <group key={i} position={[0, 0.55 + i * 0.7, 0]}>
              <mesh>
                <cylinderGeometry args={[0.55 - i * 0.1, 0.62 - i * 0.1, 0.38, 8]} />
                <meshStandardMaterial color="#F3E6C8" roughness={0.55} />
              </mesh>
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.95 - i * 0.14, 0.55 - i * 0.08, 0.16, 8]} />
                <meshStandardMaterial color="#C0452A" roughness={0.5} />
              </mesh>
            </group>
          ))}
        </>
      );
    default:
      return <Rock color="#445" />;
  }
}

export function RealmIsland({ def }: { def: RealmDef }) {
  const flyTo = useCommandStore((s) => s.flyTo);
  const hoverProject = useCommandStore((s) => s.hoverProject);
  const inspecting = useCommandStore((s) => {
    const t = s.camera.target;
    return t ? Math.hypot(t.position[0], t.position[2]) < 32 : false;
  });

  return (
    <group
      position={def.position}
      onClick={(e) => {
        e.stopPropagation();
        if (pointerGate.suppressClick) return;
        flyTo(islandCam(def.position));
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hoverProject(def.slug);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverProject(undefined);
        document.body.style.cursor = 'grab';
      }}
    >
      <RealmMesh kind={def.kind} />
      {inspecting ? null : (
        <FloatingLabel id={`vessel-${def.slug}`} priority={2} maxDist={70} fadeFrom={48} position={[0, 3.6, 0]}>
          <WorldName>
            {def.title}
            <div style={{ fontSize: 8, letterSpacing: '0.14em', opacity: 0.75, marginTop: 2 }}>{def.subtitle}</div>
          </WorldName>
        </FloatingLabel>
      )}
    </group>
  );
}
