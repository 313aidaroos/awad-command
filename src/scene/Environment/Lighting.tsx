'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#d7dce4', '#1a1d22', 0.55]} />
      <ambientLight intensity={0.22} color="#b7bec8" />
      <directionalLight color="#f4f6f8" intensity={2.15} position={[-8, 18, 14]} />
      <directionalLight color="#9aa4b2" intensity={0.55} position={[12, 6, -8]} />
      <directionalLight color="#3D8BFF" intensity={0.12} position={[6, 2, -14]} />
    </>
  );
}
