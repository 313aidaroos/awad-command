'use client';

import { Monument } from '@/scene/universe/parts';

export function IcosaKind() {
  return <Monument size={[0.92, 0.92, 0.92]} />;
}

export function FoliosKind() {
  return <Monument size={[0.38, 1.55, 1.12]} />;
}

export function ReelKind() {
  return <Monument size={[1.28, 0.48, 0.82]} />;
}

export function VesselKind() {
  return <Monument size={[0.7, 1.28, 0.7]} />;
}

export function SoftKind() {
  return <Monument size={[0.88, 1.05, 0.62]} />;
}
