export interface LabelSlot {
  id: string;
  x: number;
  y: number;
  z: number;
  dist: number;
  priority: number;
  fade: number;
  fresh: boolean;
  el: HTMLElement | null;
}

const slots = new Map<string, LabelSlot>();
let scheduled = false;

export function submitLabel(slot: Omit<LabelSlot, 'fresh'>) {
  slots.set(slot.id, { ...slot, fresh: true });
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    resolveLabels();
  });
}

export function resolveLabels() {
  const live = [...slots.values()].filter((item) => item.fresh);
  live.sort((a, b) => b.priority - a.priority || a.dist - b.dist);
  const kept: LabelSlot[] = [];
  for (const item of live) {
    let opacity = 0;
    const onScreen = item.z > 0 && item.z < 1 && Math.abs(item.x) < 0.92 && Math.abs(item.y) < 0.9;
    const nearEdge = Math.abs(item.x) > 0.74 || Math.abs(item.y) > 0.72;
    if (onScreen && item.fade > 0.04) {
      const clash = kept.some((other) => Math.hypot(other.x - item.x, (other.y - item.y) * 1.7) < 0.16);
      if (!clash && (item.priority >= 5 || !nearEdge)) {
        opacity = nearEdge && item.priority >= 5 ? item.fade * 0.85 : item.fade;
        kept.push(item);
      }
    }
    if (item.el) {
      item.el.style.opacity = opacity.toFixed(3);
      item.el.style.visibility = opacity > 0.05 ? 'visible' : 'hidden';
    }
  }
  for (const [id, item] of slots) {
    if (!item.fresh) slots.delete(id);
    else item.fresh = false;
  }
}

export function distanceFade(dist: number, start: number, end: number): number {
  if (dist >= end) return 0;
  if (dist <= start) return 1;
  return 1 - (dist - start) / (end - start);
}
