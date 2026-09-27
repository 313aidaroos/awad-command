# CRYPTO FLOOR — TIER 1 MINIMAL VIABLE PLAN

**Goal:** Real Alpaca paper account data in the existing UI (2-3 days)

**Current State:** Beautiful UI with sample data  
**Target State:** Same UI showing YOUR real Alpaca paper positions/cash/P&L

---

## 1. ALPACA PAPER ACCOUNT SETUP (Awad, 15 minutes)

### Steps:
1. Go to https://alpaca.markets/
2. Click "Start Paper Trading" (free, no card)
3. Sign up with email
4. Navigate to: Dashboard → Paper Account → API Keys
5. Click "Generate New Key"
6. Copy:
   - `APCA-API-KEY-ID` (e.g., `PKX...`)
   - `APCA-API-SECRET-KEY` (e.g., `abc123...`)

### Add to Vercel (awad-command project):
```bash
# In Vercel dashboard → Settings → Environment Variables
ALPACA_API_KEY=PKX...
ALPACA_SECRET_KEY=abc123...
TRADE_MODE=paper
```

### Test the account works:
```bash
curl -X GET "https://paper-api.alpaca.markets/v2/account" \
  -H "APCA-API-KEY-ID: PKX..." \
  -H "APCA-API-SECRET-KEY: abc123..."
```

Expected response: `{"id":"...","cash":"100000.00","portfolio_value":"100000.00",...}`

---

## 2. DATABASE TABLES (Supabase migration)

Create **ONE** table to start:

### Migration: `20260928000000_crypto_floor_snapshot.sql`

```sql
-- Stores the latest snapshot from Alpaca paper account
create table if not exists crypto_floor_snapshot (
  id uuid primary key default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  
  -- Account summary
  cash numeric not null,
  portfolio_value numeric not null,
  equity numeric not null,
  
  -- Positions (JSONB array)
  positions jsonb not null default '[]'::jsonb,
  
  -- Orders (JSONB array)
  orders jsonb not null default '[]'::jsonb,
  
  -- Metadata
  fetched_at timestamptz not null,
  fetch_duration_ms integer,
  error_log text
);

-- RLS: Service role only (server-side fetching)
alter table crypto_floor_snapshot enable row level security;

revoke all on crypto_floor_snapshot from anon;
revoke all on crypto_floor_snapshot from authenticated;

-- Index for latest snapshot
create index crypto_floor_snapshot_updated_at_idx 
  on crypto_floor_snapshot (updated_at desc);

-- Keep only last 1000 snapshots
create or replace function cleanup_old_snapshots()
returns trigger as $$
begin
  delete from crypto_floor_snapshot
  where id not in (
    select id from crypto_floor_snapshot
    order by updated_at desc
    limit 1000
  );
  return new;
end;
$$ language plpgsql;

create trigger cleanup_snapshots_trigger
  after insert on crypto_floor_snapshot
  execute function cleanup_old_snapshots();
```

**Why this design:**
- Single table = simple, fast
- JSONB = flexible (Alpaca schema can change without migration)
- Service role only = safe (no client reads)
- Auto-cleanup = won't grow forever
- Error logging = debug Alpaca API failures

---

## 3. API ROUTES (3 new endpoints)

### `src/app/api/crypto-floor/snapshot/route.ts`

**Purpose:** Fetch latest data from Alpaca, store in DB, return to UI

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLeadOwner } from "@/lib/auth-helpers";

const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

export async function GET(request: Request) {
  const supabase = await createClient();
  
  // Auth check BEFORE any processing
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isLeadOwner(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch from Alpaca
  const headers = {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY!,
  };

  try {
    const startTime = Date.now();
    
    // Parallel fetch: account + positions + orders
    const [accountRes, positionsRes, ordersRes] = await Promise.all([
      fetch(`${ALPACA_PAPER_URL}/v2/account`, { headers }),
      fetch(`${ALPACA_PAPER_URL}/v2/positions`, { headers }),
      fetch(`${ALPACA_PAPER_URL}/v2/orders?status=all&limit=50`, { headers }),
    ]);

    if (!accountRes.ok) {
      throw new Error(`Alpaca account fetch failed: ${accountRes.status}`);
    }

    const account = await accountRes.json();
    const positions = positionsRes.ok ? await positionsRes.json() : [];
    const orders = ordersRes.ok ? await ordersRes.json() : [];

    const duration = Date.now() - startTime;

    // Store snapshot
    const { data: snapshot, error } = await supabase
      .from("crypto_floor_snapshot")
      .insert({
        cash: parseFloat(account.cash),
        portfolio_value: parseFloat(account.portfolio_value),
        equity: parseFloat(account.equity),
        positions,
        orders,
        fetched_at: new Date().toISOString(),
        fetch_duration_ms: duration,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      snapshot,
      live: true,
      source: "alpaca_paper",
    });

  } catch (err: any) {
    // Log error to DB
    await supabase.from("crypto_floor_snapshot").insert({
      cash: 0,
      portfolio_value: 0,
      equity: 0,
      positions: [],
      orders: [],
      fetched_at: new Date().toISOString(),
      error_log: err.message,
    });

    return NextResponse.json(
      { error: err.message, live: false },
      { status: 500 }
    );
  }
}
```

### `src/app/api/crypto-floor/place-order/route.ts`

**Purpose:** Manual order placement (simple market buy/sell)

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLeadOwner } from "@/lib/auth-helpers";

const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // Auth BEFORE reading body
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isLeadOwner(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify paper mode
  if (process.env.TRADE_MODE !== "paper") {
    return NextResponse.json(
      { error: "TRADE_MODE must be paper" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { symbol, side, qty } = body;

  // Validate
  if (!symbol || !side || !qty) {
    return NextResponse.json(
      { error: "Missing: symbol, side, qty" },
      { status: 400 }
    );
  }

  if (!["buy", "sell"].includes(side)) {
    return NextResponse.json({ error: "side must be buy or sell" }, { status: 400 });
  }

  // Place order on Alpaca
  try {
    const orderRes = await fetch(`${ALPACA_PAPER_URL}/v2/orders`, {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
        "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: symbol.toUpperCase(),
        qty: parseFloat(qty),
        side,
        type: "market",
        time_in_force: "day",
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`Alpaca order failed: ${errText}`);
    }

    const order = await orderRes.json();

    return NextResponse.json({
      success: true,
      order,
      message: `${side.toUpperCase()} ${qty} ${symbol} placed`,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

### `src/app/api/crypto-floor/health/route.ts`

**Purpose:** Quick health check (is Alpaca reachable?)

```typescript
import { NextResponse } from "next/server";

const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

export async function GET() {
  try {
    const res = await fetch(`${ALPACA_PAPER_URL}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
        "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY!,
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      return NextResponse.json(
        { healthy: false, error: `HTTP ${res.status}` },
        { status: 503 }
      );
    }

    return NextResponse.json({ healthy: true, mode: "paper" });

  } catch (err: any) {
    return NextResponse.json(
      { healthy: false, error: err.message },
      { status: 503 }
    );
  }
}
```

---

## 4. UI CHANGES (wire real data)

### Update `src/crypto-floor/CryptoFloor.tsx`

**Current:** Loads sample data from `sample.ts`  
**New:** Fetch from `/api/crypto-floor/snapshot`

```typescript
// Add at top of component
const [snapshot, setSnapshot] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [isLive, setIsLive] = useState(false);

useEffect(() => {
  async function loadSnapshot() {
    try {
      const res = await fetch("/api/crypto-floor/snapshot");
      const data = await res.json();
      
      if (data.live) {
        setSnapshot(data.snapshot);
        setIsLive(true);
      } else {
        // Fallback to sample data
        setSnapshot(null);
        setIsLive(false);
      }
    } catch (err) {
      console.error("Snapshot fetch failed:", err);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }

  loadSnapshot();
  const interval = setInterval(loadSnapshot, 30000); // Refresh every 30s
  return () => clearInterval(interval);
}, []);

// Update header banner
{isLive ? (
  <div className="live-banner">
    🟢 LIVE PAPER DATA — Alpaca Account
  </div>
) : (
  <div className="sample-banner">
    📊 SAMPLE DATA — Connect Alpaca to see real positions
  </div>
)}

// Update portfolio display
{snapshot ? (
  <>
    <div>Cash: ${parseFloat(snapshot.cash).toLocaleString()}</div>
    <div>Portfolio: ${parseFloat(snapshot.portfolio_value).toLocaleString()}</div>
    <div>Positions: {snapshot.positions.length}</div>
  </>
) : (
  <div>Loading sample data...</div>
)}
```

### Add manual order button (Portfolio tab)

```typescript
<button 
  onClick={async () => {
    const symbol = prompt("Symbol (e.g. BTC/USD):");
    const side = confirm("Buy?") ? "buy" : "sell";
    const qty = prompt("Quantity:");
    
    const res = await fetch("/api/crypto-floor/place-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, side, qty }),
    });
    
    const result = await res.json();
    alert(result.message || result.error);
  }}
  disabled={!isLive}
>
  Place Manual Order
</button>
```

---

## 5. WHAT TESTERS WILL SEE (first working screen)

### Before (current):
1. Login → /crypto-floor
2. See beautiful UI with 4 desks, 16 agents
3. All metrics are SAMPLE DATA (P&L: +$1,234, positions: 3 fake coins)
4. "This is just a preview, right?"

### After TIER 1:
1. Login → /crypto-floor
2. Banner: **🟢 LIVE PAPER DATA — Alpaca Account**
3. Portfolio shows:
   - Cash: $100,000.00 (your real Alpaca paper balance)
   - Portfolio Value: $100,000.00
   - Positions: 0 (empty account to start)
4. Click "Place Manual Order"
   - Symbol: BTC/USD
   - Side: Buy
   - Qty: 0.001
   - Submit → "BUY 0.001 BTC/USD placed"
5. Refresh → see position appear:
   - BTC/USD: 0.001 @ $67,234.50
   - P&L: -$0.02 (broker spread)
6. Other tabs still show sample data (will be wired in TIER 2)

**Key experience:** "Wait, this is MY actual Alpaca account? I can see my real balance!"

---

## 6. TESTING CHECKLIST (before Awad sees it)

### Pre-deploy tests:
- [ ] Health check: `curl https://awad-command.vercel.app/api/crypto-floor/health` → `{"healthy":true}`
- [ ] Snapshot fetch returns real Alpaca data (verify cash = $100k for new account)
- [ ] Manual order placement works (place 0.001 BTC/USD buy, see it in Alpaca dashboard)
- [ ] Error handling: temporarily break ALPACA_API_KEY → UI shows "SAMPLE DATA" fallback
- [ ] Auth: logout → try to access /api/crypto-floor/snapshot → 401
- [ ] Mobile: 390px viewport → portfolio stats readable, order button tappable
- [ ] Console: zero red errors on load

### Security checks:
- [ ] ALPACA_API_KEY never in NEXT_PUBLIC_* (server-only)
- [ ] isLeadOwner() enforced on all 3 routes
- [ ] TRADE_MODE=paper verified before order placement
- [ ] Database: crypto_floor_snapshot has RLS enabled, anon/authenticated revoked

---

## 7. DEPLOYMENT SEQUENCE

### Step 1: Database migration
```bash
cd ~/src/awad-command
# Copy migration SQL from section 2 above
nano supabase/migrations/20260928000000_crypto_floor_snapshot.sql
git add supabase/migrations/
git commit -m "feat(crypto-floor): add snapshot table for Alpaca data"
```

### Step 2: Run migration on Supabase
```bash
# In Supabase dashboard → SQL Editor
# Paste migration SQL → Run
# Verify: Tables → crypto_floor_snapshot exists
```

### Step 3: Add API routes
```bash
mkdir -p src/app/api/crypto-floor/{snapshot,place-order,health}
# Create route.ts files from section 3 above
git add src/app/api/crypto-floor/
git commit -m "feat(crypto-floor): add Alpaca integration API routes"
```

### Step 4: Update UI
```bash
# Edit src/crypto-floor/CryptoFloor.tsx per section 4
git add src/crypto-floor/
git commit -m "feat(crypto-floor): wire real Alpaca data to UI"
```

### Step 5: Deploy
```bash
git pull --rebase  # Safety: fetch any Codex/Claude changes first
git push origin master
```

### Step 6: Verify Vercel deployment
```bash
# Wait for Vercel build to complete
# Check: Vercel dashboard → awad-command → Deployments → READY (not ERROR)
curl https://awad-command.vercel.app/api/crypto-floor/health
# Expected: {"healthy":true,"mode":"paper"}
```

---

## 8. ESTIMATED TIME

- **Awad's part:** 15 minutes (Alpaca signup + add keys to Vercel)
- **Migration:** 10 minutes (write SQL + run in Supabase)
- **API routes:** 2 hours (3 files, testing)
- **UI wiring:** 1 hour (fetch logic + manual order button)
- **Testing:** 1 hour (checklist above)
- **Deployment:** 30 minutes (commit + push + verify READY)

**Total: 5 hours active work** (can spread over 2-3 days)

---

## 9. RISKS & MITIGATIONS

### Risk 1: Alpaca API rate limits
- **Limit:** 200 requests/minute (paper account)
- **Mitigation:** Fetch every 30s (120 fetches/hour = well under limit)

### Risk 2: Alpaca API timeout
- **Symptom:** UI shows "Loading..." forever
- **Mitigation:** 5s timeout in health check, fallback to sample data on error

### Risk 3: Accidentally placing live orders
- **Catastrophic if:** TRADE_MODE != paper OR wrong API keys
- **Mitigation:** 
  - guard.ts already refuses non-paper hosts
  - Explicit TRADE_MODE check in place-order route
  - Manual orders require 2 prompts (symbol + qty)
  - Start with 0.001 BTC test (~$67)

### Risk 4: Database fills with snapshots
- **Symptom:** Table grows to 10K+ rows
- **Mitigation:** Auto-cleanup trigger (keep last 1000)

### Risk 5: Another agent (Codex/Claude) pushes conflicting code
- **Symptom:** Merge conflict on push
- **Mitigation:** `git pull --rebase` before every commit (per addendum)

---

## 10. SUCCESS CRITERIA

**TIER 1 is complete when:**
1. ✅ Awad logs into /crypto-floor
2. ✅ Banner says "LIVE PAPER DATA"
3. ✅ Portfolio shows his real Alpaca balance ($100,000.00)
4. ✅ He clicks "Place Manual Order" → buys 0.001 BTC
5. ✅ UI refreshes → position appears with real price
6. ✅ He opens Alpaca dashboard → sees same order there
7. ✅ He refreshes Command → P&L updates (real-time)

**Then:** System is ready for TIER 2 (automated Scout signals)

---

## APPROVAL NEEDED FROM AWAD

Before writing any code:
- [ ] Approve this plan
- [ ] Provide Alpaca paper API keys (or delegate to me to set up)
- [ ] Confirm: start with manual orders only (no automation yet)
- [ ] Confirm: 30-second refresh rate is acceptable

Once approved, I will execute this plan and report:
- Commits made
- Live URL with health check passing
- Screenshot of first working screen
- Any blockers encountered

---

**END OF TIER 1 PLAN**
