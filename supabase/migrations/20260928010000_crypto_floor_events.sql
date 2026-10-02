-- Superseded (2026-10-02, Claude). Intentionally a no-op.
--
-- This file used to create crypto_floor_events with an older column set (timestamp, event_type, title,
-- structured_payload, …). The hub DB never used that shape: the live table is the robot "notebook"
-- created by 20260928020000_crypto_floor_robot_events.sql (ts, agent_role, type, payload, order_id, …),
-- extended by 20261002000000_crypto_floor_robot_v2.sql (strategy column, per-type order_id uniqueness).
--
-- Because both files used `create table if not exists`, a fresh database that ran this file first got the
-- wrong table and every robot event insert failed. Keeping it empty makes a fresh database match the hub.
select 1;
