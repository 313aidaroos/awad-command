"use client";
import { AppShell } from "@/landing/AppShell";
import { Boardroom } from "@/boardroom/Boardroom";

export default function PreviewBoardroom() {
  return (
    <AppShell>
      {() => (
        <>
          <p className="mb-3 text-center text-xs tracking-[.2em] text-amber-200">
            PREVIEW · BOARDROOM LOOK IS LOCKED
          </p>
          <Boardroom />
        </>
      )}
    </AppShell>
  );
}
