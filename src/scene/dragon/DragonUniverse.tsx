'use client';

import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { DragonBalls } from '@/scene/dragon/DragonBalls';
import { DragonSky } from '@/scene/dragon/DragonSky';
import { PalaceIsland } from '@/scene/dragon/PalaceIsland';
import { RealmIsland } from '@/scene/dragon/RealmIsland';
import { Shenron } from '@/scene/dragon/Shenron';
import { REALM_ISLANDS } from '@/scene/dragon/islands';
import { showExterior } from '@/scene/lib/cameraPaths';
import { useCommandStore } from '@/store/useCommandStore';

function OutdoorFilm() {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    const prev = gl.toneMappingExposure;
    gl.toneMappingExposure = 1.05;
    gl.setClearColor('#6E8BB8', 1);
    return () => {
      gl.toneMappingExposure = prev;
    };
  }, [gl]);
  return null;
}

function DragonSun() {
  return (
    <>
      <hemisphereLight args={['#FFD9A0', '#2A2018', 0.55]} />
      <ambientLight intensity={0.22} color="#E8C9A0" />
      <directionalLight
        color="#FFC878"
        intensity={1.35}
        position={[38, 28, 22]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight color="#8EB4FF" intensity={0.22} position={[-20, 12, -16]} />
    </>
  );
}

export function DragonUniverse() {
  const enterPhase = useCommandStore((s) => s.enterPhase);
  if (!showExterior(enterPhase)) return null;
  return (
    <group>
      <OutdoorFilm />
      <DragonSun />
      <DragonSky />
      <PalaceIsland />
      <Shenron />
      <DragonBalls />
      {REALM_ISLANDS.map((def) => (
        <RealmIsland key={def.slug} def={def} />
      ))}
    </group>
  );
}
