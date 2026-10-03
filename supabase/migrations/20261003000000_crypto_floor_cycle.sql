-- Crypto Floor: CYCLE, the sixth desk (2026-10-03, Awad's idea: prices move in a ~3-week cycle).
-- Strategy cycle-straddle-v1: every Monday (regular session) one long ATM straddle (call + put, same strike, ~4 weeks)
-- on SPY, QQQ and stocks whose 1-year daily bars show a real ~15-trading-day cycle. Each leg sells at +50%; the rest at
-- −50% combined or on trading day 15. Max $500 debit per straddle (code constant), max 4 open, long premium only.
-- PAPER ONLY: live_enabled false (the code also refuses real money for a desk without crypto).
-- Apply AFTER the code that knows cycle-straddle-v1 is deployed (older code would not recognize the strategy).
-- risk: none → the default desk daily loss cap (−4%) applies. Undo: delete the 'cycle' row and its migration row below.

insert into public.crypto_floor_desks (id, name, strategy, enabled, capital_usd, params, risk, live_enabled)
values ('cycle', 'CYCLE', 'cycle-straddle-v1', true, 25000, '{}'::jsonb, '{}'::jsonb, false)
on conflict (id) do nothing;

insert into public.crypto_floor_param_changes (desk, version, source, reason, before, after)
select 'cycle', 1, 'migration', 'CYCLE desk created (weekly long straddles on a ~3-week cycle, paper only)', null,
       jsonb_build_object('strategy', d.strategy, 'params', d.params)
from public.crypto_floor_desks d
where d.id = 'cycle'
  and not exists (select 1 from public.crypto_floor_param_changes c where c.desk = 'cycle' and c.source = 'migration');
