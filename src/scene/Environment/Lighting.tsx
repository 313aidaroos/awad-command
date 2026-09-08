'use client';

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.12} color="#d7dbe4" />
      <directionalLight color="#eef2ff" intensity={0.82} position={[-10, 14, 9]} />
      <directionalLight color="#3D8BFF" intensity={0.16} position={[12, -5, -8]} />
      <directionalLight color="#c5ccd6" intensity={0.22} position={[2, -9, 14]} />
      <pointLight color="#dfe6f2" intensity={1.1} distance={28} position={[0, 0.4, 0]} />
    </>
  );
}
