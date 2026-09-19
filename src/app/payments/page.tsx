"use client";
import { AppShell } from "@/landing/AppShell";
import { PaymentDesk } from "@/payments/PaymentDesk";
export default function Page() {
  return <AppShell>{() => <PaymentDesk />}</AppShell>;
}
