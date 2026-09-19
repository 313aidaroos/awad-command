"use client";
import { useState } from "react";
import { AppShell } from "@/landing/AppShell";
import { saveOwnerPassword } from "./actions";
import { signOutOwner } from "@/app/login/actions";
export default function Page() {
  const [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <AppShell>
      {() => (
        <section className="mx-auto max-w-lg space-y-5 rounded-xl border border-amber-200/30 bg-slate-950 p-6">
          <h1 className="font-serif text-2xl text-amber-100">Owner access</h1>
          <p>
            You are the only authorized account. There is no public signup or
            guest access.
          </p>
          <p>
            Set your password here privately. Do not put it in chat. Your
            existing browser session stays signed in.
          </p>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (password !== repeat) {
                setNotice("Passwords must match.");
                return;
              }
              setBusy(true);
              try {
                const r = await saveOwnerPassword(password);
                setNotice(
                  r.error ??
                    "Password saved. You can now use it at the private login screen.",
                );
                if (r.saved) {
                  setPassword("");
                  setRepeat("");
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              New password
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3"
              />
            </label>
            <label>
              Repeat password
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3"
              />
            </label>
            <button
              disabled={busy}
              className="rounded border border-amber-200 p-3"
            >
              {busy ? "Saving…" : "Save owner password"}
            </button>
            <p role="status">{notice}</p>
          </form>
          <button onClick={() => signOutOwner()} className="text-amber-200">
            Sign out of this browser
          </button>
        </section>
      )}
    </AppShell>
  );
}
