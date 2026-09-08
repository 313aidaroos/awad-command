'use client';

import { Monument } from '@/scene/universe/parts';

export function LatticeKind() {
  return <Monument size={[1.58, 1.58, 1.58]} />;
}

export function CrystalKind() {
  return <Monument size={[0.72, 1.62, 0.5]} />;
}

export function RingsKind() {
  return <Monument size={[1.05, 0.42, 1.05]} />;
}

export function OctaKind() {
  return <Monument size={[0.55, 1.72, 0.55]} />;
}

export function MonolithKind() {
  return <Monument size={[0.82, 1.85, 0.48]} />;
}

export function ConstellationKind() {
  return <Monument size={[1.12, 0.62, 0.7]} />;
}
