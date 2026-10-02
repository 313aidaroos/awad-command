# JUNOAI_NOTES.md — awad-command

Handoff notes from JunoAI (Awad's AI assistant) for anyone working in this repo.

## 2026-10-02 — HQ subscriptions boxes + customizable box shapes/sizes (branch `junoai/hq-subscriptions-boxes`)

**What this was:** Awad asked for his subscriptions dashboard (~$280/mo, from an Oct 2 inbox audit) as boxes inside the Headquarters dashboard, with per-box shape (Square | Rectangle) and size (S | M | L) controls.

**Key files:**
- `src/headquarters/RoomBox.tsx` — the shared `Box` component now lives here (moved out of `Headquarters.tsx`). Exports `Box`, `useBoxLayout(id)`, `BoxCustomizeContext`, `BOX_LAYOUT_KEY` (`"hq-box-layout"`), `CIXY_BOX_ID` (`"hq-cixy"`).
- `src/headquarters/SubscriptionsBox.tsx` — the subscriptions box (work column, after tasks). Renders **compact** (total + top 3 attention flags) when Square or size S, **full** (attention list + 13 subscriptions) when Rectangle or M/L.
- `src/headquarters/subscriptions-data.ts` — static snapshot of the Oct 2, 2026 audit. To go live later, keep the exported names/shapes and swap the constants for a `/api/subscriptions` fetch.
- `src/headquarters/NewsDesk.tsx` — converted to the shared `Box` (was its own `<section className="room-box">`).

**How customization works:**
- "CUSTOMIZE" toggle in the HQ header (next to refresh) turns edit mode on/off. Edit chrome (gear button per box header → Shape/Size popover) only shows while ON; OFF renders clean.
- Prefs persist per box id in `localStorage["hq-box-layout"]`. Box ids: `hq-attention` (tasks), `hq-subscriptions`, `hq-schedule`, `hq-news-desk`, `hq-crypto-news`, `hq-finances`, `hq-market`, `hq-content`.
- CSS: `.room-box--square` (aspect-ratio 1/1, body scrolls internally), `.room-box--rect`, `.room-box--size-s/m/l` (min-height 200/340/500px).

**CIXY EXCLUSION (owner's hard rule):** `#hq-cixy` (CeoConsole column) is NOT a `Box`, gets no controls in either mode, and `headquarters.css` has guard rules stripping shape/size classes if ever applied. She always stays square.

**Verify after merge:** `pnpm typecheck`, `pnpm lint`. The branch was typechecked/linted before the PR was opened.
