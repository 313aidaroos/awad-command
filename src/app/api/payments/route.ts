import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import {
  decidePayment,
  listPaymentRequests,
  requestPayment,
  stripeSummary,
} from "@/lib/payments";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Owner sign-in required." },
      { status: 401, headers },
    );
  const [requests, stripe] = await Promise.allSettled([
    listPaymentRequests(),
    stripeSummary(),
  ]);
  return NextResponse.json(
    {
      requests: requests.status === "fulfilled" ? requests.value : [],
      requestsError:
        requests.status === "rejected" ? "Payment requests unavailable." : null,
      stripe:
        stripe.status === "fulfilled"
          ? stripe.value
          : {
              connected: false,
              notice:
                "Stripe could not be read. Check the account key and read permissions.",
            },
    },
    { headers },
  );
}
export async function POST(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Owner sign-in required." },
      { status: 401, headers },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  try {
    const b = await request.json();
    if (b.action === "create")
      return NextResponse.json(await requestPayment(b), { headers });
    if (
      b.action === "decide" &&
      (b.decision === "approved" || b.decision === "declined")
    )
      return NextResponse.json(await decidePayment(b.id, b.decision), {
        headers,
      });
    return NextResponse.json(
      { error: "Unknown action." },
      { status: 400, headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not save this payment request. Check the details and refresh before retrying.",
      },
      { status: 400, headers },
    );
  }
}
