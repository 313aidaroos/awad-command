'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#e4e8f0', '#12151a', 0.38]} />
      <ambientLight intensity={0.14} color="#d7dbe4" />
      <directionalLight
        color="#f7f8fb"
        intensity={1.55}
        position={[-6, 14, 8]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight color="#f4f6fa" intensity={0.85} position={[10, 6, -10]} />
      <directionalLight color="#3D8BFF" intensity={0.18} position={[8, 2, -6]} />
    </>
  );
}
