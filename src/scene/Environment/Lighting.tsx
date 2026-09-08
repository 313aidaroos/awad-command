'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#e4e8f0', '#07080A', 0.32]} />
      <ambientLight intensity={0.12} color="#d7dbe4" />
      <directionalLight color="#f7f8fb" intensity={1.62} position={[-8, 18, 11]} />
      <directionalLight color="#f4f6fa" intensity={1.12} position={[12, 6, -14]} />
      <directionalLight color="#3D8BFF" intensity={0.26} position={[10, -3, -8]} />
      <pointLight color="#eef2f8" intensity={0.7} distance={24} position={[0, 1.2, 0]} />
    </>
  );
}
