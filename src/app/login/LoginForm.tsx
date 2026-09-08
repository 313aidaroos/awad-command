'use client';

import { useState } from 'react';
import { sendMagicLink } from '@/app/login/actions';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-5 text-left"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setStatus(null);
        const result = await sendMagicLink(email);
        setStatus(result.error ?? 'Check your inbox.');
        setBusy(false);
      }}
    >
      <label className="text-[11px] tracking-[0.12em] text-[var(--muted)]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-full bg-[var(--accent)]/20 px-3 py-2 text-sm disabled:opacity-40"
      >
        {busy ? 'Sending' : 'Send magic link'}
      </button>
      {status ? <p className="mt-3 text-xs text-[var(--muted)]">{status}</p> : null}
    </form>
  );
}
