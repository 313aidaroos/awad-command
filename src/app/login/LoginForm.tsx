"use client";
import { useState } from "react";
import { signInOwner, sendMagicLink } from "./actions";
export function LoginForm() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 grid gap-4 text-left"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setStatus("");
        try {
          const result = await signInOwner(email, password);
          setStatus(result.error ?? "");
          setPassword("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="text-sm">
        Owner email
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded border border-slate-600 bg-slate-950 p-3"
        />
      </label>
      <label className="text-sm">
        Password
        <input
          type="password"
          required
          maxLength={1024}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded border border-slate-600 bg-slate-950 p-3"
        />
      </label>
      <p className="text-xs text-slate-400">
        Your session stays signed in on this browser until you sign out or it
        expires.
      </p>
      <button
        type="submit"
        disabled={busy}
        className="rounded border border-amber-300/50 bg-amber-200/15 p-3 text-amber-100"
      >
        {busy ? "Signing in…" : "Enter AWAD COMMAND"}
      </button>
      <button
        type="button"
        disabled={busy}
        className="rounded border border-slate-600 p-3 text-slate-200"
        onClick={async () => {
          setBusy(true);
          try {
            const result = await sendMagicLink(email);
            setStatus(
              result.error ?? "Check your inbox for your private sign-in link.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Email me a magic link
      </button>
      <p role="alert" className="text-sm text-amber-100">
        {status}
      </p>
    </form>
  );
}
