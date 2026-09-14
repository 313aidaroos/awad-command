'use client';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#d5dae2', '#12151a', 0.58]} />
      <ambientLight intensity={0.24} color="#b4bcc6" />
      <directionalLight color="#f4f6f8" intensity={2.05} position={[-6, 14, 12]} />
      <directionalLight color="#c5cad3" intensity={0.55} position={[4, 8, 6]} />
      <directionalLight color="#8a929e" intensity={0.32} position={[10, 5, -8]} />
    </>
  );
}
