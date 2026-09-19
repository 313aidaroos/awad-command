"use client";
import { AppShell } from "@/landing/AppShell";
import { Mailroom } from "@/email/Mailroom";
export default function Page() {
  return <AppShell>{() => <Mailroom />}</AppShell>;
}
