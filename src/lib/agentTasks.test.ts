import { describe, expect, it } from "vitest";
import {
  formatTaskCreateStatus,
  persistApprovalResolution,
  persistCeoTask,
  resolveAgentRef,
  type AgentTaskStore,
} from "@/lib/agentTasks";

function memoryStore(opts: { failInsert?: string } = {}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    projects: [],
    agents: [],
    approvals: [],
    agent_tasks: [],
    events: [],
  };
  const store: AgentTaskStore = {
    from(table) {
      const rows = () => {
        tables[table] ??= [];
        return tables[table];
      };
      return {
        async upsert(row, options) {
          const key = table === "projects" ? "slug" : "id";
          const list = rows();
          const idx = list.findIndex((item) => item[key] === row[key]);
          if (idx >= 0) {
            if (!options?.ignoreDuplicates)
              list[idx] = { ...list[idx], ...row };
          } else list.push({ ...row });
          return { error: null };
        },
        async insert(row) {
          if (opts.failInsert === table)
            return { data: null, error: { message: `${table} blocked` } };
          const record = { id: crypto.randomUUID(), ...row };
          rows().push(record);
          return { data: record, error: null };
        },
        update(row) {
          return {
            async eq(column, value) {
              for (const item of rows()) {
                if (item[column] === value) Object.assign(item, row);
              }
              return { error: null };
            },
          };
        },
        select() {
          return {
            eq(column, value) {
              const matches = rows().filter((item) => item[column] === value);
              return {
                async maybeSingle() {
                  return { data: matches[0] ?? null, error: null };
                },
                async limit() {
                  return { data: matches, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  return { store, tables };
}

describe("resolveAgentRef", () => {
  it("maps contraxis.analytics to the analytics agent", () => {
    const agent = resolveAgentRef("contraxis.analytics");
    expect(agent?.id).toBe("contraxis.analytics-agent");
    expect(agent?.projectSlug).toBe("contraxis");
  });
});

describe("persistCeoTask", () => {
  it("keeps saved specialization, memory, and running status when assigning another task", async () => {
    const { store, tables } = memoryStore();
    tables.agents.push({
      id: "contraxis.sales-agent",
      role: "Sales",
      objective: "My custom outreach brief",
      status: "working",
      memory: { note: "Keep this" },
    });
    await persistCeoTask(
      {
        agentId: "contraxis.sales-agent",
        instruction: "Research prospects",
        title: "Research",
        requiresApproval: false,
        risk: "low",
      },
      { supabase: store },
    );
    expect(tables.agents[0]).toEqual({
      id: "contraxis.sales-agent",
      role: "Sales",
      objective: "My custom outreach brief",
      status: "working",
      memory: { note: "Keep this" },
    });
  });

  it("returns a demo local task when the service client is missing", async () => {
    const result = await persistCeoTask(
      {
        agentId: "contraxis.analytics",
        title: "Summarise leads",
        instruction: "Summarise today's leads and conversion",
        requiresApproval: false,
        risk: "low",
      },
      { supabase: null },
    );
    expect(result.ok).toBe(true);
    expect(result.demo).toBe(true);
    expect(result.status).toBe("queued");
    expect(result.agentId).toBe("contraxis.analytics-agent");
    expect(formatTaskCreateStatus(result)).toMatch(/DEMO/);
  });

  it("writes pending approval + waiting_approval task when required", async () => {
    const { store, tables } = memoryStore();
    const result = await persistCeoTask(
      {
        agentId: "contraxis.development-agent",
        title: "Deploy landing",
        instruction: "Deploy the new Contraxis landing page",
        requiresApproval: true,
        risk: "medium",
        kind: "deploy",
      },
      { supabase: store },
    );
    expect(result.ok).toBe(true);
    expect(result.demo).toBe(false);
    expect(result.status).toBe("waiting_approval");
    expect(tables.approvals[0]?.status).toBe("pending");
    expect(tables.agent_tasks[0]?.status).toBe("waiting_approval");
    expect(tables.agent_tasks[0]?.approval_id).toBe(tables.approvals[0]?.id);
    expect(tables.approvals[0]?.project_slug).toBe("contraxis");
    expect(tables.approvals[0]?.action).toMatch(/create_task/);
  });

  it("queues immediately when approval is not required", async () => {
    const { store, tables } = memoryStore();
    const result = await persistCeoTask(
      {
        agentId: "contraxis.analytics-agent",
        title: "Summarise leads",
        instruction: "Summarise today's leads",
        requiresApproval: false,
        risk: "low",
      },
      { supabase: store },
    );
    expect(result.status).toBe("queued");
    expect(tables.approvals).toHaveLength(0);
    expect(tables.agent_tasks[0]?.source).toBe("ceo");
    expect(tables.agent_tasks[0]?.capabilities).toEqual([]);
  });

  it("tags computer work and waits for approval", async () => {
    const { store, tables } = memoryStore();
    const result = await persistCeoTask(
      {
        agentId: "contraxis.analytics-agent",
        title: "Screenshot Contraxis",
        instruction: "Screenshot Contraxis on mobile and desktop",
        requiresApproval: false,
        risk: "low",
      },
      { supabase: store },
    );
    expect(result.ok).toBe(true);
    expect(result.capabilities).toEqual(["computer"]);
    expect(result.status).toBe("waiting_approval");
    expect(tables.agent_tasks[0]?.capabilities).toEqual(["computer"]);
    expect(tables.approvals).toHaveLength(1);
  });

  it("does not invent a task for an unknown agent", async () => {
    const result = await persistCeoTask(
      {
        agentId: "ghost.agent",
        title: "Nope",
        instruction: "Nope",
        requiresApproval: false,
        risk: "low",
      },
      { supabase: null },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unknown agent/);
  });
});

describe("persistApprovalResolution", () => {
  it("updates both approval and task rows on approve", async () => {
    const { store, tables } = memoryStore();
    const created = await persistCeoTask(
      {
        agentId: "contraxis.analytics-agent",
        title: "Need eyes",
        instruction: "Read-only summary after approve",
        requiresApproval: true,
        risk: "low",
      },
      { supabase: store },
    );
    const resolved = await persistApprovalResolution(
      created.approvalId!,
      "approved",
      { supabase: store },
    );
    expect(resolved.ok).toBe(true);
    expect(resolved.demo).toBe(false);
    expect(tables.approvals[0]?.status).toBe("approved");
    expect(tables.agent_tasks[0]?.status).toBe("queued");
    expect(resolved.taskId).toBe(created.taskId);
  });

  it("cancels the task on deny", async () => {
    const { store, tables } = memoryStore();
    const created = await persistCeoTask(
      {
        agentId: "contraxis.analytics-agent",
        title: "Need eyes",
        instruction: "stop",
        requiresApproval: true,
        risk: "low",
      },
      { supabase: store },
    );
    await persistApprovalResolution(created.approvalId!, "denied", {
      supabase: store,
    });
    expect(tables.approvals[0]?.status).toBe("denied");
    expect(tables.agent_tasks[0]?.status).toBe("cancelled");
  });

  it("keeps a demo no-op when the service client is missing", async () => {
    const resolved = await persistApprovalResolution("apr_1", "approved", {
      supabase: null,
    });
    expect(resolved).toMatchObject({
      ok: true,
      demo: true,
      decision: "approved",
    });
  });
});
