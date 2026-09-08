'use client';

export function CommandDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.55, 0]}>
        <circleGeometry args={[4.4, 48]} />
        <meshStandardMaterial color="#252A32" metalness={0.4} roughness={0.58} />
      </mesh>
      <mesh position={[0, -2.38, 0]}>
        <cylinderGeometry args={[2.55, 2.85, 0.28, 48]} />
        <meshStandardMaterial color="#323842" metalness={0.48} roughness={0.44} />
      </mesh>
    </group>
  );
}
