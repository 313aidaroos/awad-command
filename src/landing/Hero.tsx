"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ArrowRight, CirclePlay, X } from "lucide-react";
import { MODULES } from "@/config/modules";
import { CommandButton } from "@/landing/primitives";
import { requestCeoOpen } from "@/lib/ceoBridge";
import { ModuleIcon } from "@/landing/ModuleIcon";
export function HeroCommandCenter({
  up,
  total,
}: {
  up: number;
  total: number;
}) {
  const tour = useRef<HTMLDialogElement>(null);
  return (
    <>
      <section className="hq-hero">
        <div className="hq-hero-copy">
          <p className="hq-eyebrow">WELCOME TO</p>
          <h1>AWAD COMMAND</h1>
          <h2>ONE VISION. ALL SYSTEMS. NO LIMITS.</h2>
          <p className="hq-description">
            Your AI-powered command center for building, managing, automating,
            and scaling companies, investments, content, agents, and operations
            — all in one place.
          </p>
          <div className="hq-hero-actions">
            <CommandButton href="/command" primary>
              ENTER COMMAND CENTER <ArrowRight size={17} />
            </CommandButton>
            <CommandButton onClick={() => tour.current?.showModal()}>
              <CirclePlay size={15} /> WATCH DEMO
            </CommandButton>
            <CommandButton href="#hq-principles">LEARN MORE</CommandButton>
          </div>
          <blockquote>
            “Discipline today builds the freedom tomorrow.”
            <br />— Awad
          </blockquote>
        </div>
        <div className="hq-room">
          <Image
            src="/hq-command-room.png"
            alt="Executive command room with a world map, monitor desk, warm lamp, books and globe"
            fill
            priority
            sizes="(max-width: 700px) 100vw, 68vw"
          />
          <div className="hq-monitor-title">
            <strong>AWAD COMMAND</strong>
            <span>GLOBAL OPERATIONS</span>
          </div>
          <div className="hq-monitor-left">
            BUILD
            <br />
            AUTOMATE
            <br />
            SCALE
            <br />
            INVEST
            <br />
            CREATE
            <br />
            GIVE BACK
          </div>
          <div className="hq-monitor-right">
            IDEAS
            <br />
            AGENTS
            <br />
            COMPANIES
            <br />
            ASSETS
            <br />
            OPPORTUNITIES
            <br />A BETTER TOMORROW
          </div>
          <div className="hq-poster">
            SAME
            <br />
            MARKETS
            <br />A BRIGHTER
            <br />
            YOU<span>—</span>
          </div>
          <p className="hq-room-status">
            FLEET {up}/{total} ·{" "}
            {total === 0
              ? "CHECKING"
              : up === total
                ? "SITES REACHABLE"
                : "REVIEW SYSTEM STATUS"}
          </p>
        </div>
      </section>
      <dialog ref={tour} className="hq-tour">
        <button
          className="hq-tour-close"
          aria-label="Close demo"
          onClick={() => tour.current?.close()}
        >
          <X size={20} />
        </button>
        <p className="hq-eyebrow">YOUR EXECUTIVE HEADQUARTERS</p>
        <h2>One vision. Every operation.</h2>
        <ol>
          <li>
            Review company reachability and connected financial sources here.
          </li>
          <li>
            Enter the original 3D Command Center to explore companies and
            agents.
          </li>
          <li>
            Ask Cixy through your existing CEO service and review its actions.
          </li>
          <li>
            Use each dedicated room for projects, analytics and the Crypto
            Floor.
          </li>
        </ol>
        <p>
          Unconnected sources remain labeled unavailable. This tour does not run
          any agent or trading actions.
        </p>
        <CommandButton
          onClick={() => {
            tour.current?.close();
            requestCeoOpen();
          }}
          primary
        >
          ASK CIXY →
        </CommandButton>
      </dialog>
    </>
  );
}
export function ModuleStrip() {
  const path = usePathname();
  return (
    <nav className="hq-module-strip" aria-label="Company modules">
      {MODULES.map((m) => (
        <Link
          key={m.id}
          href={m.route}
          title={m.description}
          className={path === m.route ? "active" : ""}
          style={{ "--module-accent": m.accent } as React.CSSProperties}
        >
          <ModuleIcon id={m.id} />
          <span>{m.name}</span>
        </Link>
      ))}
    </nav>
  );
}
