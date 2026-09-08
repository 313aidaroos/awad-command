'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#d5dbe6', '#0a0c10', 0.38]} />
      <ambientLight intensity={0.16} color="#d7dbe4" />
      <directionalLight color="#f2f4f8" intensity={1.15} position={[-9, 16, 10]} />
      <directionalLight color="#3D8BFF" intensity={0.14} position={[14, -4, -9]} />
      <directionalLight color="#c8cfd8" intensity={0.28} position={[3, -8, 12]} />
      <pointLight color="#e6ebf4" intensity={0.85} distance={26} position={[0, 0.6, 0]} />
    </>
  );
}
