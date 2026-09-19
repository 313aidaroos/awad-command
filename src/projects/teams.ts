import { makeAgents } from "@/projects/factory";
import type { ProjectDefinition } from "@/types/project";

export const BUSINESS_TEAM_SIZE = 12;
export const CORE_TEAM = [
  {
    name: "Business Lead",
    role: "Lead",
    objective:
      "Coordinate this business, prioritize tasks, and report progress to Awad.",
  },
  {
    name: "Customer Service Agent",
    role: "Support",
    objective:
      "Triage customer requests, prepare helpful replies, and escalate unresolved issues. Sending needs a connected support channel.",
  },
  {
    name: "Bug Fixing Agent",
    role: "Engineering",
    objective:
      "Investigate bugs, reproduce failures, prepare fixes, and verify regressions. Repository writes require a connected coding integration.",
  },
  {
    name: "Marketing Agent",
    role: "Marketing",
    objective:
      "Plan campaigns, audiences, creative, and conversion measurement. Coordinate the Meta and Google Ads specialists.",
  },
  {
    name: "Meta Ads Agent",
    role: "Meta Ads",
    objective:
      "Prepare Facebook and Instagram campaigns, creative, audiences, budgets, and performance reports. Paid launch requires a connected ad account, executable ad tools, and owner approval.",
  },
  {
    name: "Google Ads Agent",
    role: "Google Ads",
    objective:
      "Prepare Google Ads campaigns, keywords, negative keywords, copy, budgets, and conversion tracking. Paid launch requires a connected ad account, executable ad tools, and owner approval.",
  },
] as const;
const SPECIALISTS = [
  {
    name: "Operations Agent",
    role: "Ops",
    objective: "Track deadlines, handoffs, and blockers.",
  },
  {
    name: "Analytics Agent",
    role: "Analytics",
    objective: "Measure business performance using verified data.",
  },
  {
    name: "QA Agent",
    role: "QA",
    objective: "Reproduce bugs and verify releases with evidence.",
  },
  {
    name: "Content Agent",
    role: "Content",
    objective: "Prepare campaign creative and editorial drafts.",
  },
  {
    name: "Research Agent",
    role: "Research",
    objective: "Research customers, competitors, and opportunities.",
  },
  {
    name: "Sales Agent",
    role: "Sales",
    objective: "Qualify opportunities and prepare sales follow-ups.",
  },
  {
    name: "Product Agent",
    role: "Product",
    objective: "Turn customer feedback into product priorities.",
  },
  {
    name: "Finance Agent",
    role: "Finance",
    objective:
      "Reconcile reported costs and flag budget issues; never spend without approval.",
  },
] as const;

/** Preserve existing identities and flow references; only fill missing team positions. */
export function completeBusinessTeam(
  project: Pick<ProjectDefinition, "slug" | "name" | "agents">,
) {
  const agents = [...project.agents];
  for (const member of [...CORE_TEAM, ...SPECIALISTS]) {
    if (agents.some((a) => a.role.toLowerCase() === member.role.toLowerCase()))
      continue;
    if (
      agents.length >= BUSINESS_TEAM_SIZE &&
      !CORE_TEAM.some((r) => r.role === member.role)
    )
      break;
    agents.push(
      ...makeAgents(project.slug, [
        {
          ...member,
          objective: `${project.name}: ${member.objective}`,
          tools: ["supabase.query", "http.fetch"],
        },
      ]),
    );
  }
  // Cover all business functions even when specialist titles differ by industry.
  const areas = [
    ["Leadership & operations", "Lead"],
    ["Customer service", "Support"],
    ["Bugs & reliability", "Engineering"],
    ["Marketing & growth", "Marketing"],
    ["Facebook & Instagram ads", "Meta Ads"],
    ["Google Ads", "Google Ads"],
    ["Sales & partnerships", "Sales"],
    ["Finance & reporting", "Analytics"],
    ["Product & delivery", "Product"],
    ["Content & creative", "Content"],
    ["Quality & compliance", "QA"],
    ["Research & planning", "Research"],
  ];
  return agents.map((agent, index) => {
    const responsibilities = areas
      .filter(([, role], areaIndex) => {
        const preferred = agents.find((a) => a.role === role);
        return preferred
          ? preferred.id === agent.id
          : areaIndex % agents.length === index;
      })
      .map(([area]) => area);
    const objective =
      project.slug === "contraxis" && agent.role === "Sales"
        ? "Find relevant contractor companies for Contraxis. Verify public business contact details and service areas, check existing members and prior outreach, prepare personalized platform invitations, send only through the connected company email tool within the owner’s approved outreach scope, and track delivery, replies, follow-ups, bounces, and opt-outs. Never guess email addresses or contact opted-out companies. Report missing email or search connections explicitly."
        : agent.objective;
    return { ...agent, objective, responsibilities };
  });
}
