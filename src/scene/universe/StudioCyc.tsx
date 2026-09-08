'use client';

/** Soft studio cyc — stays mounted so an interior cut never reveals a void. */
export function StudioCyc() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <circleGeometry args={[48, 80]} />
        <meshStandardMaterial color="#101318" metalness={0.18} roughness={0.9} />
      </mesh>
      <mesh position={[0, 9, -30]}>
        <cylinderGeometry args={[40, 40, 24, 48, 1, true, Math.PI * 0.12, Math.PI * 0.76]} />
        <meshStandardMaterial color="#171B21" metalness={0.24} roughness={0.78} side={2} />
      </mesh>
    </group>
  );
}
