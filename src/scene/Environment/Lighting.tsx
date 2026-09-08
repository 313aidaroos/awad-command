'use client';

/** Dark void, one key, a weak fill, a whisper of accent. No wash. */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#6E747C', '#07080A', 0.16]} />
      <ambientLight intensity={0.05} color="#8A909A" />
      <directionalLight
        color="#C9D0DA"
        intensity={0.52}
        position={[-7, 11, 6]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight color="#8A909A" intensity={0.16} position={[9, 5, -8]} />
      <directionalLight color="#3D8BFF" intensity={0.07} position={[6, 2, -5]} />
    </>
  );
}
