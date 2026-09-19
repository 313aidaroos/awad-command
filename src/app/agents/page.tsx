"use client";
import { AppShell } from "@/landing/AppShell";
import { TeamDesk } from "@/workforce/TeamDesk";
export default function Page() {
  return <AppShell>{() => <TeamDesk />}</AppShell>;
}
