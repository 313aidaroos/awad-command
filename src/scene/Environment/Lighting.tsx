'use client';

/** Key + rim so metals get a hard highlight without adding geometry. */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#f2f4f7', '#1c2026', 0.42]} />
      <ambientLight intensity={0.16} color="#d7dde5" />
      <directionalLight color="#ffffff" intensity={2.85} position={[-5.5, 9.5, 7.5]} />
      <directionalLight color="#d5dbe4" intensity={0.7} position={[7, 3.2, -6]} />
      <spotLight color="#ffffff" intensity={3.1} position={[-2.2, 6.2, 8.4]} angle={0.36} penumbra={0.5} distance={24} />
      <pointLight color="#f7f8fa" intensity={1.05} distance={16} position={[-1.6, 3.8, 5.2]} />
    </>
  );
}
