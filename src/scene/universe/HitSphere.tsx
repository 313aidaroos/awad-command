'use client';

/** Invisible but raycastable volume so entities have a stable click/hover target. */
export function HitSphere({ radius = 1.45 }: { radius?: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 16, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
