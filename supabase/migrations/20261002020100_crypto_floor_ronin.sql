-- Crypto Floor: RONIN, the fifth desk — the higher-risk team that invents its own strategies (custom-v1).
-- Apply AFTER the code that knows custom-v1 is deployed (older code would not recognize the strategy).
-- Paper only (live_enabled false). Starts with the "Volume ignition" seed spec (strategy/custom-v1.ts
-- RONIN_SEED_SPEC); the team replaces it through tests + the evidence gate. Day-loss pause at −5%.

insert into public.crypto_floor_desks (id, name, strategy, enabled, capital_usd, params, spec, risk, live_enabled)
values (
  'ronin', 'RONIN', 'custom-v1', true, 25000, '{}'::jsonb,
  '{"name":"Volume ignition","thesis":"Strong 3-hour moves on heavy volume tend to continue for a few hours in crypto; ride them with a trailing stop and cut losers fast.","universe":["BTC/USD","ETH/USD","SOL/USD","XRP/USD","DOGE/USD","AVAX/USD","LINK/USD","LTC/USD"],"entry":{"all":[{"ind":{"kind":"return","hours":3},"op":">","value":1.5},{"ind":{"kind":"volumeRatio","hours":24},"op":">","value":1.5},{"ind":{"kind":"rsi","period":14},"op":"<","value":78}]},"exit":{"takeProfitPct":6,"stopLossPct":-4,"trailingStopPct":2.5,"maxHoldHours":48},"sizing":{"positionSizePct":8,"maxOpenPositions":4,"minEntryIntervalHours":6}}'::jsonb,
  '{"dayLossPct":-5}'::jsonb,
  false
)
on conflict (id) do nothing;

insert into public.crypto_floor_param_changes (desk, version, source, reason, before, after)
select 'ronin', 1, 'migration', 'RONIN desk created (higher risk, own strategies, paper only)', null,
       jsonb_build_object('spec', d.spec, 'risk', d.risk)
from public.crypto_floor_desks d
where d.id = 'ronin'
  and not exists (select 1 from public.crypto_floor_param_changes c where c.desk = 'ronin' and c.source = 'migration');
