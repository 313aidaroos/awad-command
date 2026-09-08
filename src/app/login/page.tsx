import { isAuthConfigured } from '@/lib/env';
import { LoginForm } from '@/app/login/LoginForm';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  if (!isAuthConfigured()) redirect('/');
  return (
    <main className="grid h-dvh place-items-center bg-[var(--void)] px-6">
      <div className="glass w-[min(420px,100%)] p-6 text-center">
        <h1 className="text-sm font-light tracking-[0.32em]">AWAD COMMAND</h1>
        <p className="mt-3 text-xs text-[var(--muted)]">Private deck. Magic link for the allowed email only.</p>
        <LoginForm />
      </div>
    </main>
  );
}
