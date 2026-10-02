"use client";
import { Wallet } from "lucide-react";
import { Box, useBoxLayout } from "./RoomBox";
import {
  SUBSCRIPTIONS_MONTHLY_TOTAL,
  SUBSCRIPTIONS_UPDATED,
  activeSubscriptions,
  subscriptionFlags,
} from "./subscriptions-data";

/**
 * Subscriptions box for the Headquarters dashboard (work column).
 *
 * Responsive content: when the box is Square or size S it renders a
 * compact layout (monthly total + top attention items only); at
 * Rectangle / M / L it expands to the full layout (attention list +
 * full subscription list). Content never clips — square boxes scroll
 * internally via .room-box--square .room-box-body.
 */
export function SubscriptionsBox() {
  const [layout] = useBoxLayout("hq-subscriptions");
  const compact = layout.shape === "square" || layout.size === "s";
  const flags = compact ? subscriptionFlags.slice(0, 3) : subscriptionFlags;

  return (
    <Box
      id="hq-subscriptions"
      title="SUBSCRIPTIONS"
      icon={<Wallet size={17} />}
      className="room-subscriptions"
    >
      <div className="room-subs-total">
        <small>MONTHLY TOTAL</small>
        <strong>{SUBSCRIPTIONS_MONTHLY_TOTAL}</strong>
      </div>

      <div className="room-subs-flags">
        {flags.map((f) => (
          <div key={f.service} className={`room-subs-flag ${f.severity}`}>
            <i aria-hidden />
            <span>
              <b>{f.service}</b> — {f.detail}
            </span>
          </div>
        ))}
      </div>

      {!compact && (
        <ul className="room-subs-list">
          {activeSubscriptions.map((s) => (
            <li key={s.name}>
              <span>{s.name}</span>
              <small>{s.renewal}</small>
              <b className={s.price === "paid" ? "paid" : ""}>{s.price}</b>
            </li>
          ))}
        </ul>
      )}

      <p className="room-note">
        {compact
          ? "Compact view — switch to Rectangle or M/L for the full list."
          : `Inbox audit ${SUBSCRIPTIONS_UPDATED} · some dates estimated.`}
      </p>
    </Box>
  );
}
