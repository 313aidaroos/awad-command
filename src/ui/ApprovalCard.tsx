'use client';

import { useState } from 'react';
import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

export function ApprovalCard() {
  const allApprovals = useCommandStore((s) => s.approvals);
  const approvals = allApprovals.filter((a) => a.status === 'pending');
  const resolve = useCommandStore((s) => s.resolveApproval);
  const close = useCommandStore((s) => s.closePanel);
  const open = useCommandStore((s) => s.contextPanel === 'approval');
  const [confirm, setConfirm] = useState('');
  if (!open || approvals.length === 0) return null;
  const item = approvals[0];
  const needsConfirm = item.kind === 'financial';
  const canApprove = !needsConfirm || confirm.toLowerCase() === 'confirm';
  return (
    <Glass className="fixed right-4 bottom-28 z-30 w-[320px] p-4">
      <div className="text-[10px] tracking-[0.14em] text-[var(--muted)]">Needs approval · record only</div>
      <h3 className="mt-1 text-sm">{item.title}</h3>
      <p className="mt-2 text-xs text-[var(--muted)]">{item.description}</p>
      <p className="mt-2 text-[11px]">
        Risk <span className="text-[var(--s-attention)]">{item.risk}</span> · {item.kind}
      </p>
      {needsConfirm ? (
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder='Type “confirm”'
          className="mt-3 w-full rounded-lg border border-[var(--line)] bg-black/30 px-2 py-1.5 text-xs"
        />
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!canApprove}
          onClick={() => {
            resolve(item.id, 'approved');
            close();
          }}
          className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-[11px] disabled:opacity-40"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => {
            resolve(item.id, 'denied');
            close();
          }}
          className="rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-[var(--muted)]"
        >
          Deny
        </button>
      </div>
    </Glass>
  );
}
