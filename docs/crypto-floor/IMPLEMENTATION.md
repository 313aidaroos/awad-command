# Crypto Floor visual implementation

The user's later instruction narrowed the immediate work to drawing/showing the agents like CryptoFloorAwadCommand.png, plus a more colorful Home page. The attached 25-addition specification is preserved verbatim in REQUESTED-ADDITIONS.md. It remains the roadmap; this release does not claim a production trading engine.

## Delivered

- Four colored anime desks: Samurai, Neon, Orbit, Phantom.
- Sixteen original illustrated characters, four roles per desk. Names are presentation placeholders, not verified runtime identities.
- Clickable agent cards with sample decision summaries, role history, team and trade links.
- Floor, Portfolio, Teams, Trades, Patterns, News, Replay and System views; mobile tab navigation and swiping.
- Sample paper leaderboard with configurable local AWAD Score weights; insufficient metrics produce no score. Changes are preview-only and do not persist or affect policy.
- Fixed sample event replay with team/coin/trade/date/time/event filters, seek, speed, play and pause. Character reactions follow the selected event. These are illustrative bundled events, not the user's history.
- Explicit visual-preview labeling, separate paper/live values, disabled execution controls. Connection-status mode removes all sample prices, trades and balances.
- Existing app navigation, Cixy and original /command remain in place.
- Home gains coordinated cyan, violet, emerald and red accents.

## Integration boundary

No exchange API, database, secret, trading worker, account allocation, live risk setting, or real kill switch is changed. No new live-money capability is added. The floor deliberately reports unknown engine status until runtime data is connected. The app's existing mission-control health does not establish trading-engine health.

The disabled kill-switch UI explicitly says it cannot halt an external engine. Before enabling it, implement authenticated, persisted engine halt/reset with reconciliation and all tests listed in the user's specification. Do not substitute a local browser flag.

`model.ts` defines a validated snapshot/event contract for later server-side integration. `scoring.ts` computes bounded, configurable sample scores; it is not an audited financial analytics library or capital-routing policy. `sample.ts` is a fixed fixture that must never become production account data.

No Supabase migrations are included or applied in this visual release.

## Asset provenance

Built-in image generation created `public/crypto-floor/room.png` and `public/crypto-floor/agents.png` from the supplied screenshot as visual reference. They contain no financial data or credentials. Sprite positions are selected by CSS; the original generated files are preserved.

Room prompt: create a wide cinematic pixel-anime luxury crypto trading room, black steel architecture, amber ceiling lights, central blue world map, four foreground pits illuminated red/cyan/emerald/violet, distant background traders, no UI, numbers, typography or labels, 3:1 composition.

Portrait prompt: exactly sixteen distinct adult pixel-anime trader waist-up portraits, equal 4x4 grid, dark navy background, black professional clothing, red/cyan/green/violet accents by row, scout/analyst/trader/risk officer by column, varied faces/hair/glasses, no text or UI.

## Verification

TypeScript and optimized production build; full existing app suite plus tests for paper-only fixtures, sample/live separation, missing-metric score behavior, drawdown penalties, promotion evidence and deterministic replay filtering. Browser checks cover 16 agent buttons, card opening, event reaction, filtered empty history and desktop/mobile page fit.
