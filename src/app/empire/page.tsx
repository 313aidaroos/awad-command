import { Suspense } from "react";
import { CommandApp } from "@/ui/CommandApp";
import { DeckBody } from "@/ui/DeckBody";

export const dynamic = "force-dynamic";

/** The original 3D operations deck, untouched. */
export default function CommandDeckPage() {
  return (
    <>
      <Suspense fallback={null}>
        <DeckBody />
      </Suspense>
      <CommandApp />
    </>
  );
}
