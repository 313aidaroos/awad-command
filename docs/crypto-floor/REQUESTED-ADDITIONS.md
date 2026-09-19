You are improving the existing **AWAD COMMAND — Room: THE CRYPTO FLOOR** specification.

IMPORTANT: **Do not remove, rewrite, simplify, or replace the existing vision, architecture, teams, order flow, guardrails, promotion rules, visual direction, or build phases. ONLY ADD the improvements below and integrate them cleanly into the existing project.**

The goal is to turn THE CRYPTO FLOOR into a production-grade autonomous crypto trading system with a highly visual anime-style trading-floor interface inside AWAD COMMAND.

## ADD 1 — RISK-ADJUSTED TEAM SCORING

Do not rank teams purely by total profit.

Create an **AWAD SCORE** for every team.

The score should consider:

- Net return after fees
- Net return after simulated/live slippage
- Maximum drawdown
- Sharpe-style risk-adjusted return
- Sortino-style downside-risk return
- Win rate
- Profit factor
- Average winning trade
- Average losing trade
- Consistency
- Number of trades
- Benchmark performance versus BTC
- Strategy uptime
- Guardrail violations
- Excessive turnover
- Fee efficiency

Make all scoring weights configurable.

Example leaderboard:

| Team | P&L | Drawdown | Win Rate | BTC Alpha | Profit Factor | AWAD Score | Mode |
|---|---:|---:|---:|---:|---:|---:|---|
| Samurai | +8.2% | 3.1% | 57% | +3.2% | 1.72 | 91 | Paper |
| Neon | +10.4% | 11.8% | 54% | +5.4% | 1.34 | 78 | Paper |
| Orbit | +5.9% | 1.9% | 61% | +0.9% | 1.91 | 88 | Live |

Promotion should depend primarily on sustainable risk-adjusted performance rather than raw profit.

---

## ADD 2 — TEAM LIFECYCLE

Every team must have one of these statuses:

- PAPER LEAGUE
- LIVE CANDIDATE
- LIVE TEAM
- CHAMPION
- DEMOTED
- FROZEN

Because starting capital is under $1,000, do NOT automatically split live capital across every team.

Initially:

- All teams compete in paper trading.
- Qualified teams become Live Candidates.
- Only one team should receive the first allocation of live capital.
- Additional teams can receive live allocations later once the system has sufficient capital and evidence.

The transition system must be automated but configurable.

Example:

Paper League  
↓  
Meets promotion requirements  
↓  
Live Candidate  
↓  
Highest qualified AWAD Score  
↓  
Live Team  
↓  
Sustained excellence  
↓  
Champion

If loss or risk limits are exceeded:

Live Team  
↓  
Demoted  
↓  
Paper League

---

## ADD 3 — IMMUTABLE EVENT SYSTEM

Build the entire trading floor around an event-driven architecture.

Every important action creates an immutable event.

Required event types include:

SIGNAL_DETECTED  
PATTERN_DETECTED  
NEWS_DETECTED  
THESIS_CREATED  
ORDER_PROPOSED  
RISK_APPROVED  
RISK_REJECTED  
AI_VETOED  
GUARDRAIL_REJECTED  
ORDER_SUBMITTED  
ORDER_ACCEPTED  
ORDER_PARTIALLY_FILLED  
ORDER_FILLED  
ORDER_CANCELLED  
ORDER_FAILED  
STOP_TRIGGERED  
TARGET_TRIGGERED  
TEAM_PROMOTED  
TEAM_DEMOTED  
TEAM_FROZEN  
TEAM_UNFROZEN  
ENGINE_STARTED  
ENGINE_STOPPED  
ENGINE_OFFLINE  
MARKET_DATA_STALE  
EXCHANGE_DISCONNECTED  
EXCHANGE_RECONNECTED  
KILL_SWITCH_TRIGGERED  
KILL_SWITCH_RESET  
RISK_LIMIT_CHANGED  
CONFIG_CHANGED  
DAILY_SUMMARY_CREATED

Create an `events` table.

Suggested fields:

- id
- timestamp
- team_id
- agent_id
- event_type
- symbol
- trade_id
- order_id
- severity
- title
- description
- structured_payload JSONB
- paper_or_live
- correlation_id
- source
- created_at

The UI, analytics, replay system, notifications, and character animations should all react to these events.

---

## ADD 4 — AGENT MEMORY

Every agent should have access to:

### Shared Memory
Things every team can see:

- Market conditions
- Current prices
- Patterns
- News
- Market regime
- Recent volatility
- Major market events

### Team Memory
Each team's own historical knowledge:

- Previous trades
- Previous setups
- Similar historical signals
- Strategy performance
- Failed setups
- Successful setups
- Current open positions
- Current team thesis

### Agent Memory
Individual role history:

Scout remembers signals discovered.

Analyst remembers past theses and their outcomes.

Trader remembers execution quality, slippage, sizing, and fills.

Risk Officer remembers rejected trades, drawdowns, and risk events.

Historical memory should be searchable.

Example:

“Last 14 BTC breakout setups similar to this one:
9 profitable
5 unprofitable
Average return +1.7%
Largest drawdown -2.1%
Failures were concentrated during low-volume periods.”

AI may use this information for context.

AI must NOT autonomously rewrite strategy code because of historical memory.

---

## ADD 5 — STRICT AI RESPONSIBILITIES

Create a strong architectural separation:

### CODE CALCULATES

Use deterministic code for:

- Prices
- Volume
- RSI
- MACD
- Moving averages
- ATR
- Volatility
- Breakouts
- Trend detection
- Volume anomalies
- Position sizing boundaries
- Risk exposure
- Drawdown
- Fees
- Slippage
- Benchmark returns
- P&L
- Portfolio exposure
- Stop levels
- Daily loss limits
- Trade limits

### AI INTERPRETS

AI can:

- Interpret signals
- Explain market conditions
- Summarize news
- Create trade theses
- Compare supporting and conflicting evidence
- Rank detected opportunities
- Explain why a trade was rejected
- Generate daily summaries
- Explain team performance
- Identify lessons from historical trades

### CODE PROTECTS

AI must NEVER be able to:

- Disable a guardrail
- Increase its own risk limits
- Bypass the Risk Officer
- Bypass the AI veto layer
- Override the kill switch
- Change account-wide capital limits
- Remove coin restrictions
- Turn on leverage
- Enable withdrawals

Hard guardrails always have final authority.

---

## ADD 6 — FAIL-SAFE BEHAVIOR

Create explicit behavior for failures.

If Alpaca disconnects:

- Stop new order creation.
- Preserve existing state.
- Attempt reconnection.
- Reconcile all open orders before resuming.

If Supabase goes offline:

- Do not lose events.
- Queue events locally.
- Sync when connection returns.

If the AI provider fails:

- Do not allow AI-dependent trades to proceed.
- Deterministic risk protections remain running.

If market price data becomes stale:

- Mark `MARKET_DATA_STALE`.
- Block new entries.
- Continue monitoring existing exposure.

If an order's state is uncertain:

- Query exchange state.
- Reconcile existing order.
- Never submit another order until state is known.

If the engine crashes:

- Restart safely.
- Load current positions.
- Load open orders.
- Reconcile exchange state.
- Resume only after state verification.

If the engine accidentally starts twice:

- Detect duplicate execution workers.
- Only one execution leader may submit orders.

Use distributed locks or another safe leader-election mechanism.

---

## ADD 7 — IDEMPOTENT ORDER EXECUTION

Every trade and order must have a unique internal identifier.

Example:

AWAD-TREND-BTC-20260918-000184

Required IDs:

- signal_id
- thesis_id
- trade_id
- order_id
- correlation_id

Any retry must check whether that action has already occurred.

Never allow duplicate order submission because of:

- API timeout
- Server restart
- Network retry
- Duplicate signal
- Queue retry
- Worker restart

The system must always prefer:

CHECK EXISTING STATE → RECONCILE → THEN ACT

Never blindly retry financial actions.

---

## ADD 8 — SECURITY ARCHITECTURE

Add a dedicated security layer.

Requirements:

- Never commit API keys to GitHub.
- Store secrets in secure environment variables or a secrets manager.
- Encrypt sensitive credentials.
- Separate paper and live credentials.
- Live exchange credentials accessible only by the execution service.
- Never expose exchange credentials to the browser.
- Never put private API keys into an AI prompt.
- API keys should not permit withdrawals whenever the exchange allows restricted permissions.
- Log all config changes.
- Log risk-limit changes.
- Log live/paper mode changes.
- Log kill-switch events.
- Log authentication events.
- Require elevated confirmation for dangerous administrative changes.
- Use role-based access control.
- Rate-limit sensitive endpoints.
- Validate all server-side inputs.
- Implement audit trails.

The CEO AI can recommend a risk-setting change but CANNOT execute major risk-policy changes without Awad approving them.

---

## ADD 9 — THE PHYSICAL TRADING FLOOR

Make the floor visually meaningful rather than decorative.

Each competing team gets its own trading desk/pit.

Example teams:

### SAMURAI DESK
Trend / Momentum

### NEON DESK
Mean Reversion

### ORBIT DESK
Swing Trading

### PHANTOM DESK
News / Event Driven

Each desk contains four agents:

Scout  
Analyst  
Trader  
Risk Officer

The center of the room contains the giant market wall.

Top market ticker:

BTC  
ETH  
SOL  
Market sentiment  
Floor P&L  
Live capital  
Paper capital  
Today P&L

Each team area should visually display:

- Team name
- Strategy
- Mode
- Current P&L
- Current AWAD Score
- Open trades
- Risk level
- Rank

---

## ADD 10 — INTERACTIVE AGENT CARDS

Every character should be clickable/tappable.

Opening an agent should show:

Name  
Team  
Role  
Current activity  
Current thought  
Confidence level  
Supporting evidence  
Conflicting evidence  
Latest action  
Last 5 decisions  
Performance contribution  
Current trade involvement

Example:

HIRO  
Analyst  
Team Samurai

Current thought:

“BTC breakout remains valid above resistance.”

Confidence:

71%

Supporting evidence:

4

Conflicting evidence:

1

Last action:

Recommended BTC entry.

Buttons:

VIEW REASONING  
VIEW HISTORY  
VIEW TEAM  
VIEW ACTIVE TRADE

Do not expose hidden chain-of-thought. Store and display concise decision summaries, structured rationale, evidence, inputs, and resulting actions instead.

---

## ADD 11 — CHARACTER EVENT ANIMATIONS

Agents should respond visually to real system events.

Examples:

SIGNAL_DETECTED:
Scout reacts and approaches Analyst.

THESIS_CREATED:
Analyst begins working at screen.

ORDER_PROPOSED:
Trader becomes active.

RISK_APPROVED:
Risk Officer signals approval.

RISK_REJECTED:
Risk Officer visually stops the Trader.

ORDER_FILLED:
Team reacts.

PROFIT_TARGET_HIT:
Short celebration.

STOP_TRIGGERED:
Team visibly reacts to loss.

PATTERN_DETECTED:
Relevant agents gather around Pattern Board.

TEAM_PROMOTED:
Major team celebration.

TEAM_DEMOTED:
Team environment visually changes.

ENGINE_OFFLINE:
Trading floor enters emergency state.

KILL_SWITCH_TRIGGERED:
Entire room turns into stopped/frozen status.

Animations should reflect actual backend events, not randomly generated animations.

---

## ADD 12 — REPLAY MODE

Build a complete historical replay system.

Allow Awad to select:

Date  
Time  
Team  
Trade  
Coin  
Event

Example:

September 18, 2026  
2:12 PM

Replay the exact sequence:

Scout detects signal  
↓  
Analyst creates thesis  
↓  
Trader proposes order  
↓  
Risk Officer approves  
↓  
AI veto approves  
↓  
Guardrails approve  
↓  
Order submitted  
↓  
Order fills  
↓  
Price changes  
↓  
Position closes

The floor should replay character reactions and wall-screen updates.

Controls:

PLAY  
PAUSE  
1X  
2X  
5X  
10X  
NEXT EVENT  
PREVIOUS EVENT

Replay must use stored historical events and market data.

Do not regenerate history with AI.

---

## ADD 13 — TRADE DETAIL TIMELINE

Every trade gets its own detailed page.

Show:

Signal  
Pattern  
News context  
Market conditions  
Analyst thesis  
Entry thesis  
Risk assessment  
Order size  
Expected fees  
Actual fees  
Expected slippage  
Actual slippage  
Entry  
Stop  
Target  
Exit  
P&L  
Maximum favorable excursion  
Maximum adverse excursion  
Benchmark performance  
AI veto result  
Risk Officer decision  
Guardrail result

Then create an event timeline.

Example:

10:42:01 Signal detected  
10:42:04 Analyst thesis created  
10:42:08 Trader proposed order  
10:42:09 Risk approved  
10:42:11 AI veto approved  
10:42:12 Guardrails approved  
10:42:14 Order submitted  
10:42:16 Order filled  
11:14:42 Target hit

---

## ADD 14 — MARKET REGIME ENGINE

Strategies should understand the market environment.

Create deterministic market-regime classifications such as:

TRENDING_UP  
TRENDING_DOWN  
RANGE_BOUND  
HIGH_VOLATILITY  
LOW_VOLATILITY  
RISK_OFF  
BREAKOUT_ENVIRONMENT  
NEWS_SHOCK

Regime detection should use calculations.

AI can explain the regime but should not invent it.

Track strategy performance by regime.

Example:

Samurai Team:

Trending markets: +12.4%  
Range-bound markets: -2.2%

Neon Team:

Trending markets: +1.8%  
Range-bound markets: +9.7%

This helps determine which team should receive opportunities under different conditions.

---

## ADD 15 — STRATEGY ROUTER

Eventually allow the system to assign capital based partly on market regime.

Example:

Trending market:
favor Momentum Team.

Range-bound:
favor Mean-Reversion Team.

Major news event:
News Team receives increased attention.

This does NOT mean immediately moving all capital automatically.

Capital-routing rules must respect:

- team status
- risk limits
- max allocation
- account-level exposure
- live qualification
- available cash

Make this feature configurable and initially conservative.

---

## ADD 16 — DAILY CEO REPORT

Create a beautiful daily summary inside AWAD COMMAND.

It should include:

THE CRYPTO FLOOR — DAILY BRIEF

Portfolio value  
Daily P&L  
Daily return  
Paper P&L  
Live P&L  
Best team  
Largest drawdown  
Best trade  
Worst trade  
Fees paid  
Slippage  
BTC benchmark  
Major patterns detected  
Major news events  
Risk events  
Guardrail triggers  
Team promotions  
Team demotions  
Engine uptime

Then provide a concise CEO AI explanation:

“What happened today?”

“Why?”

“What deserves attention?”

“What changed versus yesterday?”

“What should be watched tomorrow?”

The CEO AI may make suggestions but must not independently change trading risk settings.

---

## ADD 17 — SYSTEM HEALTH PANEL

Add a control-room panel showing:

Agent engine: ONLINE/OFFLINE  
Alpaca: CONNECTED/DISCONNECTED  
Supabase: CONNECTED/DISCONNECTED  
Market data: LIVE/STALE  
News feed: ONLINE/OFFLINE  
AI provider: ONLINE/OFFLINE  
Last successful trade cycle  
Last heartbeat  
Queue depth  
Open orders  
API latency  
System uptime  
Execution worker status

Use green/yellow/red status indicators.

On mobile, make emergency information immediately visible.

---

## ADD 18 — MASTER KILL SWITCH

The existing kill switch must be prominent and server-side.

When pressed:

- Block every new order.
- Cancel pending orders where safe and intended.
- Preserve existing position data.
- Prevent the engine from restarting trading automatically.
- Require explicit authenticated reset.

Show:

TRADING HALTED

Reason  
Timestamp  
Triggered by  
Affected teams

Never make kill-switch behavior dependent on the AI system.

---

## ADD 19 — MOBILE-FIRST CONTROLS

Awad primarily operates AWAD COMMAND from his phone.

The Crypto Floor must have a simplified phone interface.

Mobile home should immediately show:

Total balance  
Today's P&L  
Live teams  
Open positions  
AWAD Score leaders  
System health  
Risk status  
Kill switch

Allow swiping between:

FLOOR  
PORTFOLIO  
TEAMS  
TRADES  
PATTERNS  
NEWS  
REPLAY  
SYSTEM

The 3D floor should gracefully reduce quality or switch to a performant 2.5D representation on lower-powered devices.

Trading control must NEVER depend on the 3D scene functioning.

---

## ADD 20 — PAPER/LIVE VISUAL SEPARATION

Make it nearly impossible to confuse simulated trading with real money.

Every team, trade, order, portfolio card, and agent should visibly show:

PAPER

or

LIVE

Use separate visual treatments throughout the interface.

A live order confirmation in system logs must explicitly contain:

LIVE MONEY

Paper and live balances must never be combined without clear labeling.

---

## ADD 21 — DATABASE EXPANSION

In addition to the existing tables, consider:

teams  
agents  
strategies  
signals  
theses  
trade_proposals  
risk_decisions  
ai_veto_decisions  
guardrail_decisions  
orders  
fills  
positions  
trades  
events  
team_stats  
portfolio_snapshots  
market_snapshots  
market_regimes  
patterns  
news  
agent_memories  
team_memories  
daily_reports  
system_health  
risk_limits  
config_history  
promotion_history  
notifications

Use proper foreign keys.

Use timestamps everywhere.

Use immutable financial-event records where appropriate.

---

## ADD 22 — OBSERVABILITY

Implement structured logs.

Track:

Signal generation latency  
AI response latency  
Risk evaluation latency  
Order submission latency  
Exchange response latency  
Fill latency  
Supabase latency  
Market-data latency  
Error rate  
Failed orders  
Retries  
Duplicate prevention  
Agent uptime

Make errors traceable through `correlation_id`.

Every trade should be traceable from original signal through final exit.

---

## ADD 23 — TESTING BEFORE LIVE MONEY

Live mode must remain disabled until tests exist for:

Order idempotency  
Risk limits  
Daily loss freeze  
Per-team capital cap  
Trade-size limits  
Max-trade limits  
Coin whitelist  
Kill switch  
Paper/live key separation  
Exchange disconnect  
Market-data staleness  
Partial fills  
Duplicate workers  
API timeouts  
Server reboot  
Database outage  
AI outage  
Order reconciliation

Create automated tests.

Add a simulated exchange adapter where useful.

Never use actual money merely to test basic execution logic.

---

## ADD 24 — LIVE CAPITAL ROLLOUT

When a team qualifies:

Do not immediately give it all available live capital.

Use staged allocation.

Example:

Stage 1:
small live allocation

Stage 2:
increase only after sufficient successful live trading

Stage 3:
larger allocation

Stage 4:
Champion allocation

Every stage must have:

Minimum duration  
Maximum drawdown  
Minimum trade count  
Profit requirement  
Risk-compliance requirement

A team can move backward automatically.

---

## ADD 25 — CORE SYSTEM PRINCIPLE

Add this prominently to developer documentation:

**THE CRYPTO FLOOR IS NOT AN AI THAT HAPPENS TO TRADE.**

It is:

A deterministic trading, execution, accounting, safety, and event system

with

AI agents used for interpretation, analysis, explanation, competition, and decision support

wrapped inside

a visual interactive trading-floor experience inside AWAD COMMAND.

The priority order is:

1. CAPITAL SAFETY
2. EXECUTION CORRECTNESS
3. DATA INTEGRITY
4. RISK CONTROL
5. OBSERVABILITY
6. STRATEGY PERFORMANCE
7. AI INTELLIGENCE
8. VISUAL EXPERIENCE

The anime floor is the interface.

The event engine is the nervous system.

Supabase is the shared operational memory.

The trading engine is the machinery.

Hard-coded risk controls are the brakes.

AWAD COMMAND is the command center.

Awad remains the ultimate administrator.

Build all of these additions so they extend the existing THE CRYPTO FLOOR specification without removing or weakening anything already defined.