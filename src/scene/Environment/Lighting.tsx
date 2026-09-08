'use client';

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight color="#eef2ff" intensity={0.6} position={[-6, 8, 5]} />
      <directionalLight color="#3D8BFF" intensity={0.3} position={[4, -3, -8]} />
    </>
  );
}
