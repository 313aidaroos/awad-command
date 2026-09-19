"use client";
import { AppShell } from "@/landing/AppShell";
import { Boardroom } from "@/boardroom/Boardroom";
export default function Page() {
  return <AppShell>{() => <Boardroom />}</AppShell>;
}
