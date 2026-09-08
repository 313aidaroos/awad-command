'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#cfd4dc', '#12151a', 0.42]} />
      <ambientLight intensity={0.16} color="#aeb6c0" />
      <directionalLight color="#f4f6f8" intensity={1.85} position={[-6, 14, 12]} />
      <directionalLight color="#8a929e" intensity={0.38} position={[10, 5, -8]} />
    </>
  );
}
