"use client";
import "@/headquarters/headquarters.css";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    router.prefetch("/command");
  }, [router]);
  useEffect(() => {
    if (!entering) return;
    const timer = setTimeout(
      () => router.push("/command"),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 620,
    );
    return () => clearTimeout(timer);
  }, [entering, router]);
  const enter = () => setEntering(true);
  return (
    <>
      <section className={`hq-hero ${entering ? "hq-hero-entering" : ""}`}>
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
            <CommandButton onClick={enter} primary>
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
          <div className="hq-tv-graph" aria-hidden="true">
            <span>
              HEADQUARTERS <small>CHART PREVIEW</small>
            </span>
            <svg viewBox="0 0 240 85">
              <path d="M0 20H240M0 45H240M0 70H240" stroke="#244657" />
              {Array.from({ length: 25 }, (_, i) => {
                const y = 50 - i + Math.sin(i) * 9;
                return (
                  <g key={i} stroke={i % 4 ? "#43d3af" : "#cf7389"}>
                    <path d={`M${8 + i * 9} ${y - 6}v21`} />
                    <rect
                      x={5 + i * 9}
                      y={y}
                      width="5"
                      height="9"
                      fill={i % 4 ? "#43d3af" : "#cf7389"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <button
            className="hq-tv-entry"
            aria-label="Enter headquarters through the monitor"
            onClick={enter}
          >
            Enter headquarters
          </button>
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
            Enter Cixy’s headquarters to talk, review tasks and monitor your
            operations.
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
