'use client';

export function CommandDeck() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.58, 0]}>
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial color="#101318" metalness={0.22} roughness={0.78} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.56, 0]}>
        <circleGeometry args={[5.2, 48]} />
        <meshStandardMaterial color="#252A32" metalness={0.4} roughness={0.58} />
      </mesh>
      <mesh position={[0, -2.4, 0]}>
        <cylinderGeometry args={[2.55, 2.85, 0.28, 48]} />
        <meshStandardMaterial color="#3A424C" metalness={0.48} roughness={0.44} />
      </mesh>
    </group>
  );
}
