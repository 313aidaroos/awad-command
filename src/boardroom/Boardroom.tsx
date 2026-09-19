"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, MessageSquare, Send, Users } from "lucide-react";
import Image from "next/image";
import { projects } from "@/projects/registry";
import {
  boardroomAgents,
  boardroomRoles,
  resolveBoardroomParticipants,
  type BoardroomScope,
} from "@/boardroom/roster";
import "./boardroom.css";

type CouncilResponse = {
  summary: string;
  councils: Array<{ name: string; response: string; represented: number }>;
  decisions: string[];
  questions: string[];
};
type Turn = {
  id: string;
  message: string;
  participant_count: number;
  response: CouncilResponse | null;
  status: string;
};

export function Boardroom() {
  const [scopeKind, setScopeKind] = useState<BoardroomScope["kind"]>("all");
  const [scopeValue, setScopeValue] = useState("");
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const lock = useRef(false);

  const scope: BoardroomScope =
    scopeKind === "all"
      ? { kind: "all" }
      : { kind: scopeKind, value: scopeValue };
  const participants = useMemo(
    () =>
      resolveBoardroomParticipants(
        scopeKind === "all"
          ? { kind: "all" }
          : { kind: scopeKind, value: scopeValue },
      ),
    [scopeKind, scopeValue],
  );
  const visibleAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((agent) =>
      `${agent.name} ${agent.role} ${agent.projectName}`
        .toLowerCase()
        .includes(q),
    );
  }, [participants, search]);

  useEffect(() => {
    if (scopeKind === "business" && !scopeValue)
      setScopeValue(projects[0].slug);
    if (scopeKind === "role" && !scopeValue) setScopeValue(boardroomRoles[0]);
  }, [scopeKind, scopeValue]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/boardroom", { cache: "no-store", signal: controller.signal })
      .then(async (result) => {
        const data = await result.json();
        if (!result.ok) throw new Error(data.error);
        setTurns(data.turns ?? []);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, []);

  async function addressCouncil() {
    if (lock.current || !message.trim() || !participants.length) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    const address = message.trim();
    try {
      const result = await fetch("/api/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, message: address, scope }),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      setTurns((current) => [
        ...current,
        {
          id,
          message: address,
          participant_count: participants.length,
          response: data.response,
          status: "replied",
        },
      ]);
      setMessage("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The council could not respond.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="boardroom">
      <header className="boardroom-heading">
        <div>
          <small>AWAD COMMAND / PRIVATE EXECUTIVE COUNCIL</small>
          <h1>THE BOARDROOM</h1>
          <p>
            You command the table. Cixy facilitates every invited specialist.
          </p>
        </div>
        <div className="boardroom-count">
          <Users size={19} />
          <strong>{participants.length}</strong>
          <span>agents invited</span>
        </div>
      </header>

      <div className={`boardroom-scene ${busy ? "is-speaking" : ""}`}>
        <Image
          src="/boardroom/boardroom-room.png"
          alt="Awad and Cixy at opposite ends of a long retro executive table with the agent council seated between them"
          fill
          priority
          sizes="100vw"
        />
        <div className="boardroom-scan" />
        <div className="boardroom-throne">
          <Crown size={15} /> AWAD · COMMANDER
        </div>
        <div className="boardroom-cixy">
          <i /> CIXY · FACILITATOR
        </div>
        <div className="boardroom-seat-rail left" aria-hidden="true">
          {participants
            .filter((_, index) => index % 2 === 0)
            .map((agent, index) => (
              <i
                key={agent.id}
                style={{ animationDelay: `${-(index % 17) * 0.17}s` }}
                title={agent.name}
              />
            ))}
        </div>
        <div className="boardroom-seat-rail right" aria-hidden="true">
          {participants
            .filter((_, index) => index % 2 === 1)
            .map((agent, index) => (
              <i
                key={agent.id}
                style={{ animationDelay: `${-(index % 19) * 0.14}s` }}
                title={agent.name}
              />
            ))}
        </div>
        <div className="boardroom-live">
          <i /> LIVE COUNCIL
        </div>
      </div>

      <div className="boardroom-layout">
        <aside className="boardroom-roster">
          <header>
            <Users size={16} />
            <h2>SEATING REGISTRY</h2>
          </header>
          <div className="boardroom-scope">
            <label>
              Address
              <select
                value={scopeKind}
                onChange={(event) => {
                  setScopeKind(event.target.value as BoardroomScope["kind"]);
                  setScopeValue("");
                }}
              >
                <option value="all">Entire boardroom</option>
                <option value="business">One business</option>
                <option value="role">One specialty</option>
              </select>
            </label>
            {scopeKind === "business" && (
              <label>
                Business
                <select
                  value={scopeValue}
                  onChange={(event) => setScopeValue(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.slug} value={project.slug}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {scopeKind === "role" && (
              <label>
                Specialty
                <select
                  value={scopeValue}
                  onChange={(event) => setScopeValue(event.target.value)}
                >
                  {boardroomRoles.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
            )}
            <input
              aria-label="Search invited agents"
              placeholder="Find an agent…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="boardroom-agent-list">
            {visibleAgents.map((agent, index) => (
              <div key={agent.id} style={{ borderColor: `${agent.accent}55` }}>
                <span style={{ background: agent.accent }}>
                  {agent.name.slice(0, 1)}
                </span>
                <p>
                  <strong>{agent.name}</strong>
                  <small>
                    {agent.projectName} · {agent.role}
                  </small>
                </p>
                <i style={{ animationDelay: `${-(index % 9) * 0.25}s` }} />
              </div>
            ))}
          </div>
          <p>
            {visibleAgents.length} shown · {boardroomAgents.length} total
            configured profiles
          </p>
        </aside>

        <main className="boardroom-console">
          <header>
            <MessageSquare size={16} />
            <h2>COUNCIL CONVERSATION</h2>
            <span>CIXY MODERATING</span>
          </header>
          <div className="boardroom-log" aria-live="polite">
            {!turns.length && (
              <div className="boardroom-empty">
                <strong>The table is ready.</strong>
                <p>
                  Ask for a plan, challenge an idea, compare business
                  priorities, or request each council’s view.
                </p>
              </div>
            )}
            {turns.map((turn) => (
              <article key={turn.id} className="boardroom-turn">
                <div className="boardroom-you">
                  <strong>AWAD</strong>
                  <span>{turn.participant_count} invited</span>
                  <p>{turn.message}</p>
                </div>
                {turn.response ? (
                  <div className="boardroom-reply">
                    <header>
                      <Image
                        src="/headquarters/cixy.png"
                        alt=""
                        width={38}
                        height={38}
                      />
                      <div>
                        <strong>CIXY</strong>
                        <small>Executive synthesis</small>
                      </div>
                    </header>
                    <p>{turn.response.summary}</p>
                    {!!turn.response.councils.length && (
                      <div className="boardroom-councils">
                        {turn.response.councils.map((council, index) => (
                          <section key={`${council.name}-${index}`}>
                            <h3>
                              {council.name}
                              <span>{council.represented} represented</span>
                            </h3>
                            <p>{council.response}</p>
                          </section>
                        ))}
                      </div>
                    )}
                    {!!turn.response.decisions.length && (
                      <section className="boardroom-actions">
                        <h3>RECOMMENDED DECISIONS</h3>
                        {turn.response.decisions.map((item) => (
                          <p key={item}>› {item}</p>
                        ))}
                      </section>
                    )}
                    {!!turn.response.questions.length && (
                      <section className="boardroom-questions">
                        <h3>NEEDS YOUR DIRECTION</h3>
                        {turn.response.questions.map((item) => (
                          <p key={item}>› {item}</p>
                        ))}
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="boardroom-pending">Council response pending…</p>
                )}
              </article>
            ))}
            {busy && (
              <div className="boardroom-thinking">
                <i />
                <i />
                <i /> Cixy is collecting the council’s views…
              </div>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void addressCouncil();
            }}
          >
            <label htmlFor="boardroom-message">
              Address {participants.length} invited agents
            </label>
            <textarea
              id="boardroom-message"
              value={message}
              maxLength={4000}
              disabled={busy}
              placeholder="Cixy, ask the entire boardroom what our three highest priorities should be…"
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void addressCouncil();
                }
              }}
            />
            <div>
              <p role="alert">{error}</p>
              <span>
                One facilitated council synthesis · no external actions
              </span>
              <button
                disabled={busy || !message.trim() || !participants.length}
              >
                {busy ? (
                  "COUNCIL THINKING…"
                ) : (
                  <>
                    <Send size={15} /> ADDRESS THE TABLE
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </section>
  );
}
