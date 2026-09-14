'use client';

/** Studio sweep behind the plaza — must read as a wall, not a black void. */
export function StudioCyc() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <circleGeometry args={[52, 80]} />
        <meshStandardMaterial color="#0C0E12" metalness={0.12} roughness={0.92} />
      </mesh>
      <mesh position={[0, 7.2, -22]}>
        <cylinderGeometry args={[32, 34, 18, 48, 1, true, Math.PI * 0.18, Math.PI * 0.64]} />
        <meshStandardMaterial color="#1A1E25" metalness={0.28} roughness={0.7} side={2} />
      </mesh>
      <mesh position={[0, 0.4, -18]}>
        <boxGeometry args={[28, 0.08, 6]} />
        <meshStandardMaterial color="#14181E" metalness={0.4} roughness={0.55} />
      </mesh>
    </group>
  );
}
