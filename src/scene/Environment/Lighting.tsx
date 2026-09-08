'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#eef1f6', '#2a2e34', 0.7]} />
      <ambientLight intensity={0.28} color="#e4e8ee" />
      <directionalLight color="#f8f9fb" intensity={2.55} position={[-9, 18, 14]} />
      <directionalLight color="#f4f6fa" intensity={1.45} position={[14, 8, -8]} />
      <directionalLight color="#cfd6e0" intensity={0.75} position={[0, 6, 18]} />
    </>
  );
}
