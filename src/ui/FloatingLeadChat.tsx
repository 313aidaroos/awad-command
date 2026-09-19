"use client";
import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Minus } from "lucide-react";
import { ALL_LEADS, getLeadBySlug } from "@/config/orbLeads";
import { LeadMessagePanel } from "./LeadMessagePanel";
import { MODULES } from "@/config/modules";
import "./lead-chat.css";
export function FloatingLeadChat({
  companySlug,
}: {
  companySlug?: string | null;
}) {
  const path = usePathname();
  const company =
    companySlug ??
    (path.startsWith("/projects/") ? path.split("/")[2] : undefined);
  return <LeadChat key={company ?? path} company={company} />;
}
function LeadChat({ company }: { company?: string }) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(company ?? "");
  const launcher = useRef<HTMLButtonElement>(null);
  const lead = getLeadBySlug(selected);
  const title =
    lead?.leadName ??
    (company
      ? `${MODULES.find((m) => m.slug === company)?.name ?? company} lead`
      : "Business leads");
  return (
    <div
      className="floating-lead-chat"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          launcher.current?.focus();
        }
      }}
    >
      {open && (
        <section
          id="floating-lead-conversation"
          role="region"
          aria-label="Business lead chat"
          className="lead-chat-window"
        >
          <header>
            <div>
              <small>AWAD COMMAND / DIRECT MESSAGE</small>
              <h2>{title}</h2>
            </div>
            <button
              aria-label="Minimize lead chat"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
            >
              <Minus size={18} />
            </button>
          </header>
          <label className="lead-chat-selector">
            Speak to
            <select
              aria-label="Choose business lead"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose a lead…</option>
              {company && !getLeadBySlug(company) && (
                <option value={company}>{title} — not configured</option>
              )}
              {ALL_LEADS.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.leadName}
                  {l.comingSoon ? " · pending setup" : ""}
                </option>
              ))}
            </select>
          </label>
          {lead ? (
            <>
              <p className="lead-chat-note">
                {lead.comingSoon
                  ? "This lead is marked pending setup. Check delivery status after sending."
                  : "Replies appear here when received from your lead."}
              </p>
              <LeadMessagePanel key={lead.slug} slug={lead.slug} />
            </>
          ) : (
            <p className="lead-chat-empty">
              {company
                ? "This office does not have a configured lead yet. Select another lead above to contact an existing team."
                : "Choose the business lead you want to text."}
            </p>
          )}
        </section>
      )}
      <button
        ref={launcher}
        className="lead-chat-launcher"
        aria-expanded={open}
        aria-controls="floating-lead-conversation"
        onClick={() => setOpen((v) => !v)}
      >
        <MessageSquare size={17} />
        {open
          ? "Minimize chat"
          : lead
            ? `Text ${lead.leadName}`
            : "Text a business lead"}
      </button>
    </div>
  );
}
