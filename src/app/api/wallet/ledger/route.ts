import { NextResponse } from 'next/server';
import { getLedger } from '@/lib/walletClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ledger = await getLedger();
  return NextResponse.json(ledger, { headers: { 'Cache-Control': 'no-store' } });
}
