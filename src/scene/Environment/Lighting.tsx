'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#e6ebf2', '#1a1e24', 0.55]} />
      <ambientLight intensity={0.24} color="#d5dbe3" />
      <directionalLight color="#f6f7f9" intensity={2.15} position={[-7, 11, 6]} />
      <directionalLight color="#c5ccd6" intensity={0.55} position={[9, 4, -8]} />
    </>
  );
}
