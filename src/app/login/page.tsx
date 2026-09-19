import { LoginForm } from "./LoginForm";
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#060f18] px-6 text-slate-200">
      <div className="w-full max-w-md rounded-xl border border-amber-200/30 bg-[#0d1b28] p-8 shadow-2xl">
        <p className="text-center text-xs tracking-[.35em] text-amber-200">
          PRIVATE ACCESS
        </p>
        <h1 className="mt-4 text-center font-serif text-3xl text-amber-100">
          AWAD COMMAND
        </h1>
        <p className="mt-3 text-center text-sm text-slate-400">
          Owner access only.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
