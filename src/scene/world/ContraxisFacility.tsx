'use client';

import { useEffect } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
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

function HallBackdrop() {
  const { scene, gl } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    const prevBg = scene.background;
    scene.fog = null;
    scene.background = new THREE.Color('#14181E');
    gl.setClearColor('#14181E', 1);
    gl.toneMappingExposure = 1.22;
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      gl.setClearColor('#07080A', 1);
      gl.toneMappingExposure = 1.12;
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
  return <KitModel name={name} position={position} rotation={rotation} />;
}

/** Sealed MegaKit facility. Customer→Revenue stays populated. No Kenney box shell. */
export function ContraxisFacility({ accent }: { accent: string }) {
  return (
    <group>
      <HallBackdrop />
      {FLOOR.map(([x, z]) => (
        <KitModel key={`fl-${x}-${z}`} name={Math.abs(x + z) % 8 === 0 ? 'floorDark' : 'floorMetal'} position={[x, 0, z]} />
      ))}

      {SOUTH_X.map((x) => (
        <group key={`ns-${x}`}>
          <Wall name="wallAstra" position={[x, 0, -6.15]} rotation={[0, Math.PI / 2, 0]} />
          <Wall name="wallAstra" position={[x, 0, 6.15]} rotation={[0, -Math.PI / 2, 0]} />
          <KitModel name="topCables" position={[x, 3.05, -6.15]} rotation={[0, Math.PI / 2, 0]} sit={false} />
          <KitModel name="topWindow" position={[x, 3.05, 6.15]} rotation={[0, -Math.PI / 2, 0]} sit={false} />
        </group>
      ))}
      {EAST_Z.map((z) => (
        <group key={`ew-${z}`}>
          <Wall name="wallAstra" position={[-10.15, 0, z]} />
          <Wall name="wallAstra" position={[10.15, 0, z]} rotation={[0, Math.PI, 0]} />
          <KitModel name="topAstra" position={[-10.15, 3.05, z]} sit={false} />
          <KitModel name="topPlastic" position={[10.15, 3.05, z]} rotation={[0, Math.PI, 0]} sit={false} />
        </group>
      ))}

      <Wall name="wallAstraOuter" position={[-10.15, 0, -6.15]} rotation={[0, Math.PI / 2, 0]} />
      <Wall name="wallAstraOuter" position={[10.15, 0, -6.15]} rotation={[0, Math.PI, 0]} />
      <Wall name="wallAstraOuter" position={[-10.15, 0, 6.15]} />
      <Wall name="wallAstraOuter" position={[10.15, 0, 6.15]} rotation={[0, -Math.PI / 2, 0]} />

      <KitModel name="doorFrame" position={[-10.05, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <KitModel name="doorHeavy" position={[-10.0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <KitModel name="doorFrame" position={[10.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <KitModel name="doorMetal" position={[10.0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

      {([-6.1, 6.1] as const).map((x) =>
        DIVIDER_Z.map((z) => (
          <KitModel
            key={`div-${x}-${z}`}
            name="shortPlates"
            position={[x, 0, z]}
            rotation={[0, x > 0 ? Math.PI : 0, 0]}
          />
        )),
      )}
      {([-2.1, 2.1] as const).map((x) =>
        DIVIDER_Z.map((z) => (
          <KitModel
            key={`div2-${x}-${z}`}
            name="shortAccent"
            position={[x, 0, z]}
            rotation={[0, x > 0 ? Math.PI : 0, 0]}
          />
        )),
      )}

      {([-8, -4, 0, 4, 8] as const).map((x) => (
        <group key={`col-${x}`}>
          <KitModel name="columnPipes" position={[x, 0, -5.55]} scale={0.62} />
          <KitModel name="columnSupport" position={[x, 0, 5.55]} scale={0.68} />
          <KitModel name="lightWide" position={[x, 3.15, 0]} sit={false} />
        </group>
      ))}

      <KitModel name="columnAstra" position={[-8.6, 0, -5.4]} scale={0.7} />
      <KitModel name="columnRound" position={[8.6, 0, 5.4]} scale={0.7} />
      <KitModel name="windowWide" position={[0, 0, -5.9]} rotation={[0, Math.PI / 2, 0]} />
      <KitModel name="pipeHolder" position={[-4.6, 0, -5.55]} scale={1.05} />
      <KitModel name="pipeHolder" position={[4.8, 0, 5.55]} scale={1.05} rotation={[0, Math.PI, 0]} />
      <KitModel name="cable3" position={[-2.2, 0, -5.7]} rotation={[0, 0.2, 0]} />
      <KitModel name="cable1" position={[2.4, 0, 5.7]} rotation={[0, Math.PI, 0]} />
      <KitModel name="vent" position={[-9.4, 2.35, 3.2]} rotation={[0, Math.PI / 2, 0]} sit={false} />
      <KitModel name="vent" position={[9.4, 2.35, -3.2]} rotation={[0, -Math.PI / 2, 0]} sit={false} />
      <KitModel name="machineGen" metalize position={[8.2, 0, -5.35]} scale={1.45} />
      <KitModel name="machineBarrel" metalize position={[8.3, 0, 5.25]} scale={1.35} />
      <KitModel name="barrelLarge" position={[-9.1, 0, -3.6]} />
      <KitModel name="crate" position={[-9.0, 0, 3.4]} />
      <KitModel name="chest" position={[-0.8, 0, -5.55]} />
      <KitModel name="accessPoint" position={[8.8, 0, -2.2]} />
      <KitModel name="fan" position={[0.2, 3.2, 3.2]} sit={false} />
      <KitModel name="decalLogo" position={[-9.6, 1.6, 2.4]} rotation={[0, Math.PI / 2, 0]} sit={false} scale={1.4} />

      <hemisphereLight args={['#eef2f6', '#2a3138', 0.4]} />
      <ambientLight intensity={0.18} color="#d5dbe3" />
      <spotLight color="#ffffff" intensity={2.4} position={[-5.4, 3.6, 2.1]} angle={0.52} penumbra={0.4} distance={18} />
      <pointLight color="#f4f6f8" intensity={1.7} distance={16} position={[-5.2, 2.6, 0.4]} />
      <pointLight color="#eef2f6" intensity={1.45} distance={14} position={[2.2, 2.7, 0.2]} />
      <pointLight color={accent} intensity={0.48} distance={12} position={[7.2, 2.4, 0]} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.4} scale={28} blur={2.1} far={8} color="#000000" />
    </group>
  );
}
