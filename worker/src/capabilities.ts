export function parseCapabilities(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeCapabilities(caps: string[]): string[] {
  const set = new Set(caps.map((cap) => cap.trim().toLowerCase()).filter(Boolean));
  if ([...set].some((cap) => cap === 'computer' || cap.startsWith('computer.'))) {
    set.add('computer');
  }
  return [...set];
}

export function hasComputerCapability(caps: string[]): boolean {
  return normalizeCapabilities(caps).includes('computer');
}

/** Task capabilities must be a subset of the worker's capabilities. */
export function workerCanClaim(taskCaps: string[] | null | undefined, workerCaps: string[]): boolean {
  const needed = normalizeCapabilities(taskCaps ?? []);
  const have = new Set(normalizeCapabilities(workerCaps));
  return needed.every((cap) => have.has(cap));
}

export function inferTaskCapabilities(instruction: string): string[] {
  const q = instruction.toLowerCase();
  if (
    /\b(computer|screenshot|playwright|browser|chromium|kdp|xvfb|novnc)\b/.test(q) ||
    /mobile and desktop/.test(q) ||
    /screenshot every page/.test(q)
  ) {
    return ['computer'];
  }
  return [];
}

export function isReadOnlyComputerInstruction(instruction: string): boolean {
  const q = instruction.toLowerCase();
  if (/\b(purchase|buy|pay|publish|delete|send|checkout|refund)\b/.test(q)) return false;
  if (/\bnavigate\b/.test(q) && /\bhttps?:\/\//.test(q)) return false;
  return /\b(screenshot|read-only|royalty report|download this month)\b/.test(q);
}
