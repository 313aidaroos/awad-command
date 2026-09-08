'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#c5ccd6', '#07080A', 0.22]} />
      <ambientLight intensity={0.055} color="#9aa3b0" />
      <directionalLight color="#f3f5f8" intensity={1.85} position={[-7, 22, 12]} />
      <directionalLight color="#8b93a3" intensity={0.32} position={[14, 5, -12]} />
      <directionalLight color="#3D8BFF" intensity={0.16} position={[6, 1, -16]} />
      <pointLight color="#eef2f8" intensity={0.55} distance={18} position={[0, 0.6, 0]} />
    </>
  );
}
