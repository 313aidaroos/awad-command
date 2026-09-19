"use client";
import type { CSSProperties } from "react";
import "./motion.css";
/** Visual actors only. These never generate operations records or trade events. */
export function SceneActivity({
  seed = 0,
  trading = false,
  paused = false,
}: {
  seed?: number;
  trading?: boolean;
  paused?: boolean;
}) {
  const colors = trading
    ? ["#ef676d", "#55d8ff", "#49e998", "#b17dff"]
    : ["#66d9ef", "#d2b279", "#a09bff", "#71d6b2"];
  return (
    <svg
      className={`scene-activity ${trading ? "scene-trading" : ""} ${paused ? "scene-paused" : ""}`}
      viewBox="0 0 400 380"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter
          id={`actor-shadow-${seed}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".6" />
        </filter>
      </defs>
      {[0, 1, 2].map((i) => (
        <g
          key={`screen-${i}`}
          transform={`translate(${90 + i * 96} ${110 + (i % 2) * 28})`}
          className="scene-monitor"
        >
          <path
            d="M0 0L35 15V37L0 22Z"
            fill="#051c2b"
            stroke={colors[i]}
            strokeWidth="1"
          />
          <g
            className="scene-code-lines"
            style={{ animationDelay: `${i * -0.8}s` }}
          >
            <path
              d="M4 7L26 16M4 12L18 18M4 17L29 27"
              stroke={colors[i]}
              strokeWidth="1.4"
            />
          </g>
          <circle
            cx="30"
            cy="30"
            r="1.5"
            fill={colors[i]}
            className="scene-light"
          />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g
          key={i}
          className={`scene-traveler traveler-${i}`}
          style={
            {
              "--phase": `${-((seed % 7) + i * 2.7)}s`,
              "--uniform": colors[i],
            } as CSSProperties
          }
        >
          <g className="scene-person" filter={`url(#actor-shadow-${seed})`}>
            <ellipse cx="0" cy="32" rx="10" ry="4" fill="#000" opacity=".35" />
            <g className="scene-leg left-leg">
              <path d="M-4 16L-5 29" stroke="#223650" strokeWidth="5" />
              <path d="M-5 29H-1" stroke="#b4bdc7" strokeWidth="3" />
            </g>
            <g className="scene-leg right-leg">
              <path d="M4 16L5 29" stroke="#293f58" strokeWidth="5" />
              <path d="M5 29H9" stroke="#b4bdc7" strokeWidth="3" />
            </g>
            <path
              d="M-8 -2Q0 -6 8 -2L9 17H-9Z"
              fill="#15263a"
              stroke="var(--uniform)"
              strokeWidth="1.4"
            />
            <path d="M-2 -2L0 10L3 -2" fill="var(--uniform)" />
            <g className="scene-arm">
              <path d="M-8 0L-12 11L-6 14" stroke="#243d52" strokeWidth="4" />
              <circle cx="-6" cy="14" r="2" fill="#dbac8a" />
            </g>
            <g className="scene-arm other-arm">
              <path d="M8 0L12 10L6 12" stroke="#243d52" strokeWidth="4" />
              <rect x="4" y="8" width="7" height="9" rx="1" fill="#67c9de" />
            </g>
            <rect x="-6" y="-17" width="12" height="15" rx="5" fill="#dcb390" />
            <path
              d="M-7 -10V-18Q0 -24 7 -17L6 -10L2 -15L-4 -13Z"
              fill="#111820"
            />
            <circle cx="3" cy="-9" r="1" fill="#15263a" />
          </g>
          <g className="scene-bubble">
            <rect
              x="-21"
              y="-44"
              width="42"
              height="19"
              rx="6"
              fill="#061522"
              stroke="var(--uniform)"
            />
            <path d="M-3 -25L0 -20L4 -25" fill="#061522" />
            <circle cx="-9" cy="-34" r="2" fill="var(--uniform)" />
            <circle cx="0" cy="-34" r="2" fill="var(--uniform)" />
            <circle cx="9" cy="-34" r="2" fill="var(--uniform)" />
          </g>
        </g>
      ))}
      <g className="scene-data-packet">
        <path
          d="M95 146L198 190L290 145"
          fill="none"
          stroke="#62dceb"
          strokeWidth="2"
          strokeDasharray="5 22"
          opacity=".7"
        />
      </g>
    </svg>
  );
}
