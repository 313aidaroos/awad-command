/** Daily brief email (text + HTML) from a ReviewSummary. Pure. Every number comes from the ledger. */
import type { ReviewSummary } from "./review";

const usd = (n: number | null | undefined, sign = false) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const s = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Math.abs(n));
  return `${n < 0 ? "−" : sign ? "+" : ""}${s}`;
};
const pct = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function reportSubject(s: ReviewSummary): string {
  const f = s.floor;
  const pnl = f.pnl24h === null ? "first day" : `${usd(f.pnl24h, true)} (${pct(f.pnl24hPct)})`;
  return `Crypto Floor ${s.day} · ${pnl} · ${f.trades24h} closed trade${f.trades24h === 1 ? "" : "s"} · robot ${s.robot.status.toLowerCase()} ${Math.round(s.robot.uptimePct)}%`.slice(0, 240);
}

export function reportText(s: ReviewSummary): string {
  const lines: string[] = [];
  lines.push(`THE CRYPTO FLOOR — DAILY BRIEF (${s.day}, paper money)`);
  lines.push("");
  lines.push(`Robot: ${s.robot.status} · ${s.robot.ticks24h} ticks in 24h (${Math.round(s.robot.uptimePct)}% uptime) · last tick ${s.robot.lastTickAt ?? "never"}`);
  if (s.killSwitch.halted) lines.push(`KILL SWITCH ON: ${s.killSwitch.reason ?? "no reason given"}`);
  lines.push(`Floor equity ${usd(s.floor.equity)} on ${usd(s.floor.capital)} paper capital · 24h ${usd(s.floor.pnl24h, true)} (${pct(s.floor.pnl24hPct)})`);
  lines.push(`Closed trades 24h: ${s.floor.trades24h} · win rate ${s.floor.winRate24h === null ? "—" : `${Math.round(s.floor.winRate24h * 100)}%`} · realized ${usd(s.floor.realized24h, true)} · open positions ${s.floor.openPositions}`);
  if (s.watching.length) {
    lines.push(`Watching: ${s.watching.map((w) => `${w.symbol.split("/")[0]} ${w.price ? usd(w.price) : "—"} (24h ${pct(w.ret24h)})`).join(" · ")}`);
  }
  if (s.aiNote) {
    lines.push("");
    lines.push("Floor manager's note:");
    lines.push(s.aiNote);
  }
  lines.push("");
  lines.push("DESKS");
  for (const d of s.desks) {
    lines.push(`- ${d.name} (${d.label}, v${d.version}${d.enabled ? "" : ", OFF"}${d.pausedUntil ? `, paused until ${d.pausedUntil}` : ""}): equity ${usd(d.equity)} · 24h ${usd(d.pnl24h, true)} · trades 24h ${d.stats24h.trades} · 7d ${d.stats7d.trades} trades, win ${d.stats7d.winRate === null ? "—" : `${Math.round(d.stats7d.winRate * 100)}%`}, expectancy ${usd(d.stats7d.expectancy, true)}`);
    for (const p of d.open) lines.push(`    open ${p.symbol} ${p.qty.toPrecision(6)} @ ${usd(p.entry)} → ${usd(p.price)} (${pct(p.pnlPct)})`);
    if (d.tuning) lines.push(`    LEARNED: ${d.tuning.reason}`);
  }
  if (s.trades24h.length) {
    lines.push("");
    lines.push("CLOSED TRADES (24h)");
    for (const t of s.trades24h.slice(0, 15)) {
      lines.push(`- ${t.desk.toUpperCase()} ${t.symbol}: ${usd(t.entryPrice)} → ${usd(t.exitPrice)} = ${usd(t.pnl, true)} (${pct(t.pnlPct)})${t.exitReason ? ` · ${t.exitReason}` : ""}`);
    }
  }
  const rm = s.realMoney;
  lines.push("");
  lines.push("REAL MONEY (COINBASE)");
  lines.push(
    rm.enabledDesks.length
      ? `- ON for ${rm.enabledDesks.map((d) => d.toUpperCase()).join(", ")} · real P&L ${usd(rm.pnl, true)} · ${rm.trades24h} closed real trades in 24h · limits $${rm.limits.maxTotalUsd} total / $${rm.limits.maxTradeUsd} per buy / −$${rm.limits.dayLossUsd} per day`
      : `- OFF for every team (all trading is Alpaca paper)${rm.connected ? ` · Coinbase connected${rm.totalUsd !== null ? `, balance ${usd(rm.totalUsd)}` : ""}` : " · Coinbase not connected"}`,
  );
  if (rm.note) lines.push(`- ${rm.note}`);
  if (s.experiments.length) {
    lines.push("");
    lines.push("STRATEGY TESTS (shadow books, simulated fills)");
    for (const e of s.experiments) {
      lines.push(`- ${e.name} [${e.desk}/${e.strategy}, ${e.status}]: ${e.trades} trades, return ${pct(e.returnPct)} vs desk ${pct(e.deskReturnPct)} — ${e.recommendation}`);
    }
  }
  if (s.issues.length) {
    lines.push("");
    lines.push("NEEDS ATTENTION");
    for (const i of s.issues) lines.push(`- ${i}`);
  }
  lines.push("");
  lines.push(`Open the floor: ${s.siteUrl}/crypto-floor`);
  lines.push("Paper trading only. Live trading is off.");
  return lines.join("\n");
}

export function reportHtml(s: ReviewSummary): string {
  const cell = "padding:6px 8px;border-bottom:1px solid #1f3446;text-align:left;font-size:13px";
  const color = (n: number | null | undefined) => (n === null || n === undefined ? "#8ca8bc" : n >= 0 ? "#21eaaa" : "#ff5470");
  const deskRows = s.desks
    .map(
      (d) => `<tr>
<td style="${cell}"><b>${esc(d.name)}</b><br><span style="color:#8ca8bc">${esc(d.label)} · v${d.version}${d.enabled ? "" : " · OFF"}${d.pausedUntil ? " · paused" : ""}</span></td>
<td style="${cell}">${usd(d.equity)}</td>
<td style="${cell};color:${color(d.pnl24h)}">${usd(d.pnl24h, true)}</td>
<td style="${cell}">${d.stats24h.trades} / ${d.stats7d.trades}</td>
<td style="${cell}">${d.stats7d.winRate === null ? "—" : `${Math.round(d.stats7d.winRate * 100)}%`}</td>
<td style="${cell}">${d.open.map((p) => `${esc(p.symbol)} <span style="color:${color(p.pnlPct)}">${pct(p.pnlPct)}</span>`).join("<br>") || "—"}</td>
</tr>${d.tuning ? `<tr><td colspan="6" style="${cell};color:#42d5ff">↻ ${esc(d.name)} learned: ${esc(d.tuning.reason)}</td></tr>` : ""}`,
    )
    .join("");
  const trades = s.trades24h
    .slice(0, 15)
    .map(
      (t) => `<tr><td style="${cell}">${esc(t.desk.toUpperCase())}</td><td style="${cell}">${esc(t.symbol)}</td><td style="${cell}">${usd(t.entryPrice)} → ${usd(t.exitPrice)}</td><td style="${cell};color:${color(t.pnl)}">${usd(t.pnl, true)} (${pct(t.pnlPct)})</td><td style="${cell};color:#8ca8bc">${esc(t.exitReason ?? "")}</td></tr>`,
    )
    .join("");
  const exps = s.experiments
    .map((e) => `<li><b>${esc(e.name)}</b> (${esc(e.desk)}/${esc(e.strategy)}, ${esc(e.status)}): ${e.trades} trades, ${pct(e.returnPct)} vs desk ${pct(e.deskReturnPct)} — ${esc(e.recommendation)}</li>`)
    .join("");
  const issues = s.issues.map((i) => `<li>${esc(i)}</li>`).join("");
  const watching = s.watching
    .map((w) => `${esc(w.symbol.split("/")[0])} <b>${w.price ? usd(w.price) : "—"}</b> <span style="color:${color(w.ret24h)}">${pct(w.ret24h)}</span>`)
    .join(" &nbsp;·&nbsp; ");
  return `<!doctype html><html><body style="margin:0;background:#030910;color:#e6f3ff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
<div style="max-width:720px;margin:0 auto;padding:20px">
<div style="font-size:11px;letter-spacing:2px;color:#42d5ff">AWAD COMMAND · THE CRYPTO FLOOR · PAPER</div>
<h1 style="margin:6px 0 2px;font-size:22px">Daily brief — ${esc(s.day)}</h1>
<p style="margin:0 0 14px;color:#8ca8bc">Robot ${esc(s.robot.status)} · ${s.robot.ticks24h} ticks / 24h (${Math.round(s.robot.uptimePct)}% uptime) · last tick ${esc(s.robot.lastTickAt ?? "never")}</p>
${s.killSwitch.halted ? `<p style="background:#3a0d16;border:1px solid #ff5470;padding:10px;border-radius:6px"><b>KILL SWITCH ON</b> — ${esc(s.killSwitch.reason ?? "")}</p>` : ""}
<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><tr>
<td style="${cell}"><span style="color:#8ca8bc">Floor equity</span><br><b style="font-size:18px">${usd(s.floor.equity)}</b></td>
<td style="${cell}"><span style="color:#8ca8bc">24h P&amp;L</span><br><b style="font-size:18px;color:${color(s.floor.pnl24h)}">${usd(s.floor.pnl24h, true)}</b> <span style="color:#8ca8bc">${pct(s.floor.pnl24hPct)}</span></td>
<td style="${cell}"><span style="color:#8ca8bc">Closed trades</span><br><b style="font-size:18px">${s.floor.trades24h}</b> <span style="color:#8ca8bc">win ${s.floor.winRate24h === null ? "—" : `${Math.round(s.floor.winRate24h * 100)}%`}</span></td>
<td style="${cell}"><span style="color:#8ca8bc">Open</span><br><b style="font-size:18px">${s.floor.openPositions}</b></td>
</tr></table>
${watching ? `<p style="color:#8ca8bc;margin:0 0 14px">Watching: ${watching}</p>` : ""}
${s.aiNote ? `<div style="border-left:3px solid #42d5ff;padding:8px 12px;margin:0 0 16px;background:#081622"><div style="font-size:11px;color:#42d5ff;letter-spacing:1px">FLOOR MANAGER'S NOTE</div><p style="margin:6px 0 0;white-space:pre-wrap">${esc(s.aiNote)}</p></div>` : ""}
<h2 style="font-size:15px;margin:18px 0 6px">Desks</h2>
<table style="width:100%;border-collapse:collapse"><tr><th style="${cell}">Desk</th><th style="${cell}">Equity</th><th style="${cell}">24h</th><th style="${cell}">Trades 24h/7d</th><th style="${cell}">Win 7d</th><th style="${cell}">Open</th></tr>${deskRows}</table>
${trades ? `<h2 style="font-size:15px;margin:18px 0 6px">Closed trades (24h)</h2><table style="width:100%;border-collapse:collapse">${trades}</table>` : `<p style="color:#8ca8bc">No closed trades in the last 24h.</p>`}
<h2 style="font-size:15px;margin:18px 0 6px">Real money (Coinbase)</h2>
<p style="margin:0;color:${s.realMoney.enabledDesks.length ? "#ff9aa9" : "#8ca8bc"}">${
    s.realMoney.enabledDesks.length
      ? `ON for <b>${esc(s.realMoney.enabledDesks.map((d) => d.toUpperCase()).join(", "))}</b> · real P&amp;L <b style="color:${color(s.realMoney.pnl)}">${usd(s.realMoney.pnl, true)}</b> · ${s.realMoney.trades24h} closed real trades in 24h · limits $${s.realMoney.limits.maxTotalUsd} total / $${s.realMoney.limits.maxTradeUsd} per buy / −$${s.realMoney.limits.dayLossUsd} per day`
      : `OFF for every team — all trading is Alpaca paper.${s.realMoney.connected ? ` Coinbase connected${s.realMoney.totalUsd !== null ? `, balance ${usd(s.realMoney.totalUsd)}` : ""}.` : " Coinbase not connected."}`
  }${s.realMoney.note ? ` ${esc(s.realMoney.note)}` : ""}</p>
${exps ? `<h2 style="font-size:15px;margin:18px 0 6px">Strategy tests (shadow books)</h2><ul style="padding-left:18px">${exps}</ul>` : ""}
${issues ? `<h2 style="font-size:15px;margin:18px 0 6px;color:#ffb547">Needs attention</h2><ul style="padding-left:18px">${issues}</ul>` : ""}
<p style="margin-top:20px"><a href="${esc(s.siteUrl)}/crypto-floor" style="background:#42d5ff;color:#03111b;padding:10px 14px;border-radius:6px;text-decoration:none;font-weight:700">Open the Crypto Floor</a></p>
<p style="color:#8ca8bc;font-size:11px;margin-top:18px">Paper trading only — no real money. Numbers come from the robot's own ledger and Alpaca paper fills.</p>
</div></body></html>`;
}
