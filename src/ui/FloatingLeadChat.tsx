"use client";
import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, Minus } from "lucide-react";
import { ALL_LEADS, getLeadBySlug } from "@/config/orbLeads";
import { projects } from "@/projects/registry";
import { OfficeChat } from "./OfficeChat";
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
  const [channel, setChannel] = useState("office");
  const [agentChoice, setAgentChoice] = useState("");
  const project = projects.find(
    (p) => p.slug === (selected === "books" ? "publishing" : selected),
  );
  const agent =
    project?.agents.find((a) => a.id === agentChoice) ??
    project?.agents.find((a) => a.role === "Lead") ??
    project?.agents[0];
  const lead = getLeadBySlug(selected);
  const title =
    (channel === "office" && project
      ? `${project.name} office`
      : lead?.leadName) ??
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
            Chat connection
            <select
              aria-label="Chat connection"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="office">Direct office AI</option>
              <option value="hub">External lead hub</option>
            </select>
          </label>
          <label className="lead-chat-selector">
            Speak to
            <select
              aria-label="Choose business lead"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Choose a lead…</option>
              {channel === "hub" && company && !getLeadBySlug(company) && (
                <option value={company}>{title} — not configured</option>
              )}
              {(channel === "office"
                ? projects.map((p) => ({
                    slug: p.slug,
                    leadName: p.name,
                    comingSoon: false,
                  }))
                : ALL_LEADS
              ).map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.leadName}
                  {l.comingSoon ? " · pending setup" : ""}
                </option>
              ))}
            </select>
          </label>
          {channel === "office" && agent ? (
            <>
              <label className="lead-chat-selector">
                Agent
                <select
                  aria-label="Choose office agent"
                  value={agent.id}
                  onChange={(e) => setAgentChoice(e.target.value)}
                >
                  {project!.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.role}
                    </option>
                  ))}
                </select>
              </label>
              <OfficeChat key={agent.id} agentId={agent.id} />
            </>
          ) : channel === "hub" && lead ? (
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
