'use client';

import { useEffect } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INTERIOR_EXPOSURE, UNIVERSE_EXPOSURE } from '@/scene/lib/exposure';
import { KitModel } from '@/scene/kit/KitModel';
import type { KitName } from '@/scene/kit/catalog';

const FLOOR: Array<[number, number]> = [];
for (let x = -10; x <= 10; x += 4) {
  for (let z = -6; z <= 6; z += 4) {
    FLOOR.push([x, z]);
  }
}

const SOUTH_X = [-8, -4, 0, 4, 8] as const;
const EAST_Z = [-4, 0, 4] as const;
const DIVIDER_Z = [-4.15, 4.15] as const;
const GRAPHITE = '#8A909A';
const WALL = '#B4B8BE';

function HallBackdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color('#12161C');
    gl.setClearColor('#12161C', 1);
    gl.toneMappingExposure = INTERIOR_EXPOSURE;
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#07080A', 1);
      gl.toneMappingExposure = UNIVERSE_EXPOSURE;
    };
  }, [gl, scene]);
  return null;
}

function Wall({
  name,
  position,
  rotation,
}: {
  name: KitName;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return <KitModel name={name} position={position} rotation={rotation} grade={WALL} />;
}

/** Sealed MegaKit facility. Customer→Revenue stays populated. Controlled practicals. */
export function ContraxisFacility({ accent }: { accent: string }) {
  return (
    <group>
      <HallBackdrop />
      {FLOOR.map(([x, z]) => (
        <KitModel key={`fl-${x}-${z}`} name="floorDark" position={[x, 0, z]} grade={GRAPHITE} />
      ))}

      {SOUTH_X.map((x) => (
        <group key={`ns-${x}`}>
          <Wall name="wallAstra" position={[x, 0, -6.15]} rotation={[0, Math.PI / 2, 0]} />
          <Wall name="wallAstra" position={[x, 0, 6.15]} rotation={[0, -Math.PI / 2, 0]} />
          <KitModel name="topCables" position={[x, 3.05, -6.15]} rotation={[0, Math.PI / 2, 0]} sit={false} grade={GRAPHITE} />
          <KitModel name="topWindow" position={[x, 3.05, 6.15]} rotation={[0, -Math.PI / 2, 0]} sit={false} grade={WALL} />
        </group>
      ))}
      {EAST_Z.map((z) => (
        <group key={`ew-${z}`}>
          <Wall name="wallAstra" position={[-10.15, 0, z]} />
          <Wall name="wallAstra" position={[10.15, 0, z]} rotation={[0, Math.PI, 0]} />
          <KitModel name="topAstra" position={[-10.15, 3.05, z]} sit={false} grade={WALL} />
          <KitModel name="topPlastic" position={[10.15, 3.05, z]} rotation={[0, Math.PI, 0]} sit={false} grade={GRAPHITE} />
        </group>
      ))}

      <Wall name="wallAstraOuter" position={[-10.15, 0, -6.15]} rotation={[0, Math.PI / 2, 0]} />
      <Wall name="wallAstraOuter" position={[10.15, 0, -6.15]} rotation={[0, Math.PI, 0]} />
      <Wall name="wallAstraOuter" position={[-10.15, 0, 6.15]} />
      <Wall name="wallAstraOuter" position={[10.15, 0, 6.15]} rotation={[0, -Math.PI / 2, 0]} />

      <KitModel name="doorFrame" position={[-10.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} grade={GRAPHITE} />
      <KitModel name="doorHeavy" position={[-10.0, 0, 0]} rotation={[0, Math.PI / 2, 0]} grade={GRAPHITE} />
      <KitModel name="doorFrame" position={[10.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]} grade={GRAPHITE} />
      <KitModel name="doorMetal" position={[10.0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} grade={GRAPHITE} />

      {([-6.1, 6.1] as const).map((x) =>
        DIVIDER_Z.map((z) => (
          <KitModel
            key={`div-${x}-${z}`}
            name="shortPlates"
            position={[x, 0, z]}
            rotation={[0, x > 0 ? Math.PI : 0, 0]}
            grade={GRAPHITE}
          />
        )),
      )}

      <KitModel name="lightWide" position={[-5.2, 3.1, 0]} sit={false} grade={GRAPHITE} />
      <KitModel name="lightWide" position={[2.2, 3.1, 0]} sit={false} grade={GRAPHITE} />
      <KitModel name="lightWide" position={[7.2, 3.1, 0]} sit={false} grade={GRAPHITE} />
      <KitModel name="windowWide" position={[0, 0, -5.9]} rotation={[0, Math.PI / 2, 0]} grade={WALL} />
      <KitModel name="cable3" position={[-2.2, 0, -5.7]} rotation={[0, 0.2, 0]} grade={GRAPHITE} />
      <KitModel name="cable1" position={[2.4, 0, 5.7]} rotation={[0, Math.PI, 0]} grade={GRAPHITE} />
      <KitModel name="vent" position={[-9.4, 2.35, 3.2]} rotation={[0, Math.PI / 2, 0]} sit={false} grade={GRAPHITE} />
      <KitModel name="vent" position={[9.4, 2.35, -3.2]} rotation={[0, -Math.PI / 2, 0]} sit={false} grade={GRAPHITE} />
      <KitModel name="crate" position={[-9.0, 0, 3.4]} grade={GRAPHITE} />
      <KitModel name="chest" position={[-0.8, 0, -5.55]} grade={GRAPHITE} />
      <KitModel name="barrelLarge" position={[-9.1, 0, -3.6]} grade={GRAPHITE} />
      <KitModel name="accessPoint" position={[8.8, 0, -2.2]} grade={WALL} />
      <KitModel name="decalLogo" position={[-9.6, 1.6, 2.4]} rotation={[0, Math.PI / 2, 0]} sit={false} scale={1.4} />

      <pointLight color="#D7DCE4" intensity={0.85} distance={13} position={[-5.2, 2.5, 0.6]} />
      <pointLight color="#C9D0DA" intensity={0.65} distance={12} position={[2.2, 2.4, 0.2]} />
      <pointLight color={accent} intensity={0.28} distance={10} position={[7.2, 2.2, 0]} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.48} scale={28} blur={2.4} far={7} color="#000000" />
    </group>
  );
}
