'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#e8edf3', '#1c2026', 0.7]} />
      <ambientLight intensity={0.32} color="#dfe4eb" />
      <directionalLight color="#f4f6f8" intensity={1.65} position={[-10, 14, 8]} />
      <directionalLight color="#d8dee6" intensity={0.7} position={[8, 5, -10]} />
    </>
  );
}
