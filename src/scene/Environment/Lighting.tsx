'use client';

/** Key + rim so metals get a hard highlight without adding geometry. */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#f2f4f7', '#1c2026', 0.42]} />
      <ambientLight intensity={0.16} color="#d7dde5" />
      <directionalLight color="#ffffff" intensity={3.35} position={[-5.5, 9.5, 7.5]} />
      <directionalLight color="#d5dbe4" intensity={0.85} position={[7, 3.2, -6]} />
      <pointLight color="#f7f8fa" intensity={1.35} distance={16} position={[-1.6, 3.8, 5.2]} />
    </>
  );
}
