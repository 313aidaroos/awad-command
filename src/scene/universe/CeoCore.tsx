'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OrbCore } from '@/scene/universe/OrbCore';
import { useCommandStore } from '@/store/useCommandStore';

export function CeoCore() {
  const ico = useRef<THREE.Mesh>(null);
  const focused = useCommandStore((s) => s.focusedProject);
  const flyTo = useCommandStore((s) => s.flyTo);
  const openPanel = useCommandStore((s) => s.openPanel);

  useFrame((_, dt) => {
    if (!ico.current) return;
    ico.current.rotation.y += dt * 0.15;
    ico.current.rotation.x += dt * 0.07;
  });

  if (focused) return null;

  return (
    <group>
      <OrbCore
        accent="#dfe4ee"
        status="operational"
        activity={0.5}
        hovered={false}
        radius={0.7}
        onClick={() => {
          flyTo({ position: [0, 2.5, 7], lookAt: [0, 0, 0], duration: 1.1 });
          openPanel('none');
        }}
      />
      <mesh ref={ico}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.1} />
      </mesh>
      <Html center distanceFactor={12} position={[0, 1.35, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-center whitespace-nowrap">
          <div className="text-[11px] tracking-[0.22em] font-light text-[rgba(230,232,236,0.88)]">AWAD</div>
          <div className="font-num text-[9.5px] text-[var(--muted)] mt-0.5">CEO · 59 agents</div>
        </div>
      </Html>
    </group>
  );
}
