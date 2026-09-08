'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#f2f4f8', '#2a2e34', 0.95]} />
      <ambientLight intensity={0.46} color="#e8edf3" />
      <directionalLight color="#f8f9fb" intensity={2.85} position={[-8, 16, 12]} />
      <directionalLight color="#f4f6fa" intensity={1.55} position={[12, 7, -7]} />
      <directionalLight color="#d5dbe4" intensity={0.95} position={[0, 5, 16]} />
    </>
  );
}
