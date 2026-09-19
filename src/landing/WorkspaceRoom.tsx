"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArtLoop } from "@/art-motion/ArtLoop";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { MODULES } from "@/config/modules";
import "./workspace-room.css";
type Action = { label: string; detail: string; href: string };
type Room = {
  name: string;
  purpose: string;
  sheet: string;
  tile: number;
  actions: Action[];
};
const rooms: Record<string, Room> = {
  "/projects": {
    name: "PROJECTS OFFICE",
    purpose:
      "Choose a company, review its condition, and decide where to focus.",
    sheet: "offices",
    tile: 2,
    actions: [
      {
        label: "Enter company offices",
        detail: "Explore the teams in your business campus.",
        href: "/business-world",
      },
      {
        label: "Review company health",
        detail: "See the latest available status for each business.",
        href: "#workspace-details",
      },
      {
        label: "Plan with Cixy",
        detail: "Discuss the next project or priority.",
        href: "/command",
      },
    ],
  },
  "/agents": {
    name: "AGENT OPERATIONS",
    purpose:
      "Meet your teams and review the work recorded in your connected queue.",
    sheet: "offices",
    tile: 0,
    actions: [
      {
        label: "Meet the workforce",
        detail: "Open offices and inspect agent roles and tasks.",
        href: "/business-world",
      },
      {
        label: "Talk to Cixy",
        detail: "Coordinate priorities through your executive assistant.",
        href: "/command",
      },
      {
        label: "Check worker health",
        detail: "Inspect the services supporting your agents.",
        href: "/system",
      },
    ],
  },
  "/analytics": {
    name: "FINANCE & INTELLIGENCE",
    purpose:
      "Review available records, understand performance, and identify what needs attention.",
    sheet: "offices",
    tile: 3,
    actions: [
      {
        label: "Open financial dashboard",
        detail: "Recorded revenue, expenses and net P/L.",
        href: "/command#hq-finances",
      },
      {
        label: "Review available metrics",
        detail: "Inspect the connected summary below.",
        href: "#workspace-details",
      },
      {
        label: "Visit the trading floor",
        detail: "Explore the exchange and its connection status.",
        href: "/crypto-floor",
      },
    ],
  },
  "/news": {
    name: "THE NEWSROOM",
    purpose:
      "Read the latest world and crypto headlines, then bring useful context to Cixy.",
    sheet: "offices",
    tile: 6,
    actions: [
      {
        label: "Read current headlines",
        detail: "BBC World and CoinDesk feeds below.",
        href: "#workspace-details",
      },
      {
        label: "Discuss the news",
        detail: "Open Cixy to assess what matters to your businesses.",
        href: "/command",
      },
      {
        label: "View market candles",
        detail: "Historical market data in Headquarters.",
        href: "/command#hq-finances",
      },
    ],
  },
  "/strategy": {
    name: "STRATEGY OFFICE",
    purpose:
      "Turn an idea into a decision, choose priorities, and review your next move.",
    sheet: "offices",
    tile: 7,
    actions: [
      {
        label: "Plan with Cixy",
        detail: "Work through goals and trade-offs in conversation.",
        href: "/command",
      },
      {
        label: "Choose a business",
        detail: "Inspect the company you want to grow.",
        href: "/projects",
      },
      {
        label: "Review your task list",
        detail: "Organize personal next steps in Headquarters.",
        href: "/command#hq-attention",
      },
    ],
  },
  "/content": {
    name: "CONTENT STUDIO",
    purpose:
      "Open your existing video tools, coordinate with Socixis, and track upcoming work.",
    sheet: "more-offices",
    tile: 4,
    actions: [
      {
        label: "Open video studio",
        detail: "Launch your existing Content Bot application.",
        href: MODULES.find((m) => m.slug === "content")!.url!,
      },
      {
        label: "Enter Socixis",
        detail: "Visit your marketing team’s office.",
        href: "/business-world?company=socixis",
      },
      {
        label: "Track content reminders",
        detail: "Device reminders; these do not publish posts.",
        href: "/command",
      },
    ],
  },
  "/books": {
    name: "PUBLISHING OFFICE",
    purpose:
      "Meet your editorial team, plan a title, and review publishing priorities.",
    sheet: "more-offices",
    tile: 5,
    actions: [
      {
        label: "Meet the publishing team",
        detail: "Inspect configured editorial agents and tasks.",
        href: "/business-world?company=books",
      },
      {
        label: "Plan a book with Cixy",
        detail: "Develop an outline or discuss the next milestone.",
        href: "/command",
      },
      {
        label: "Review publishing overview",
        detail: "Available information below.",
        href: "#workspace-details",
      },
    ],
  },
  "/automations": {
    name: "AUTOMATION CONTROL",
    purpose:
      "Review scheduler and worker status before deciding what to automate next.",
    sheet: "offices",
    tile: 0,
    actions: [
      {
        label: "Review automation status",
        detail: "See the actual scheduler state below.",
        href: "#workspace-details",
      },
      {
        label: "Inspect system health",
        detail: "Check dependencies and connections.",
        href: "/system",
      },
      {
        label: "Design a workflow",
        detail: "Discuss a proposed workflow with Cixy.",
        href: "/command",
      },
    ],
  },
  "/system": {
    name: "SYSTEMS OFFICE",
    purpose:
      "Understand service health, inspect alerts, and find the connection that needs attention.",
    sheet: "offices",
    tile: 0,
    actions: [
      {
        label: "Review health & alerts",
        detail: "Latest available service checks below.",
        href: "#workspace-details",
      },
      {
        label: "Open worker console",
        detail: "Use the existing computer controls.",
        href: "/command?panel=computer",
      },
      {
        label: "Account & access",
        detail: "Review your sign-in and owner settings.",
        href: "/settings",
      },
    ],
  },
  "/settings": {
    name: "ACCOUNT OFFICE",
    purpose:
      "Manage access and review the identity connected to your command center.",
    sheet: "more-offices",
    tile: 2,
    actions: [
      {
        label: "Sign in",
        detail: "Use the existing secure account flow.",
        href: "/login",
      },
      {
        label: "Review account details",
        detail: "Owner and support configuration below.",
        href: "#workspace-details",
      },
      {
        label: "Check connections",
        detail: "See current system health.",
        href: "/system",
      },
    ],
  },
};
export function WorkspaceRoom({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const [paused, setPaused] = useState(false);
  let room = rooms[path];
  if (path.startsWith("/projects/")) {
    const slug = path.split("/").pop(),
      mod = MODULES.find((m) => m.slug === slug);
    room = {
      name: `${mod?.name ?? "COMPANY"} OFFICE`.toUpperCase(),
      purpose:
        mod?.description ?? "Review this company and choose your next action.",
      sheet: "offices",
      tile: Math.max(
        0,
        MODULES.filter(
          (m) => m.category === "company" && /xis$/i.test(m.name),
        ).findIndex((m) => m.slug === slug),
      ),
      actions: [
        {
          label: "Enter the team office",
          detail: "Meet agents and inspect recorded work.",
          href: `/business-world?company=${slug}`,
        },
        {
          label: "Review company details",
          detail: "Site, support and available financial connections.",
          href: "#workspace-details",
        },
        {
          label: "Talk to Cixy",
          detail: "Discuss the next step for this business.",
          href: "/command",
        },
      ],
    };
  }
  if (path.startsWith("/projects/")) {
    const extra = [
      "awadbot",
      "qahwahworld",
      "recovra",
      "nursery-toons",
      "content",
      "books",
      "studios",
    ].indexOf(path.split("/").pop() ?? "");
    if (extra >= 0) room = { ...room, sheet: "more-offices", tile: extra };
  }
  if (!room) return <>{children}</>;
  return (
    <div className="workspace-room">
      <div className="workspace-breadcrumb">
        <Link href="/command">
          <ChevronLeft size={14} />
          Headquarters
        </Link>
        <label>
          CHANGE ROOM
          <select
            aria-label="Change office"
            value={rooms[path] ? path : ""}
            onChange={(e) => {
              if (e.target.value) router.push(e.target.value);
            }}
          >
            <option value="" disabled>
              Company office
            </option>
            {Object.entries(rooms).map(([href, r]) => (
              <option key={href} value={href}>
                {r.name}
              </option>
            ))}
            <option value="/business-world">BUSINESS WORLD</option>
            <option value="/crypto-floor">CRYPTO FLOOR</option>
          </select>
        </label>
      </div>
      <section className="workspace-hero">
        <div
          className="workspace-art"
          style={{
            backgroundImage: `url('/business-world/${room.sheet}.png')`,
            backgroundPosition: `${((room.tile % 4) * 100) / 3}% ${Math.floor(room.tile / 4) * 100}%`,
          }}
          aria-hidden="true"
        >
          <ArtLoop
            src={`/business-world/${room.sheet}-loop.mp4`}
            tile={room.tile}
            paused={paused}
          />
        </div>
        <div className="workspace-intro">
          <span>AWAD COMMAND / YOUR WORKSPACE</span>
          <button
            className="workspace-pause"
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume illustration" : "Pause illustration"}
          </button>
          <h1>{room.name}</h1>
          <p>{room.purpose}</p>
          <strong>WHAT WOULD YOU LIKE TO DO?</strong>
          <div className="workspace-actions">
            {room.actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                {...(a.href.startsWith("https:")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <span>
                  {a.label}
                  <ArrowUpRight size={16} />
                </span>
                <small>{a.detail}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section
        id="workspace-details"
        className="workspace-details"
        aria-label="Workspace details"
      >
        {children}
      </section>
    </div>
  );
}
