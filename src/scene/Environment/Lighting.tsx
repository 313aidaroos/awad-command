'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#e8ebf0', '#1a1d22', 0.42]} />
      <ambientLight intensity={0.18} color="#dfe3ea" />
      <directionalLight
        color="#f7f8fb"
        intensity={1.35}
        position={[-10, 16, 12]}
        castShadow={false}
      />
      <directionalLight color="#f4f6fa" intensity={0.55} position={[14, 6, -10]} />
      <directionalLight color="#3D8BFF" intensity={0.08} position={[8, 2, -6]} />
    </>
  );
}
