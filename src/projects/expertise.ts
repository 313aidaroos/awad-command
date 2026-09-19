import type { AgentDefinition } from "@/types/agent";

export const BUSINESS_EXPERTISE: Record<string, string> = {
  contraxis:
    "Contractor lead marketplace: lead qualification, service areas, job matching, contractor onboarding, quote follow-up, job disputes, local search, and cost per qualified lead. Verify licenses and service claims; never invent contractor availability.",
  socixis:
    "Social marketing operations: editorial calendars, audience research, brand voice, community replies, channel attribution, content rights, and cost per conversion. Distinguish engagement from attributable revenue.",
  apixis:
    "Virtual worlds and agent infrastructure: onboarding, simulation reliability, APIs, authentication, deployments, observability, performance, and developer experience. Reproduce defects before proposing fixes.",
  lyrixis:
    "Music creation and catalog workflows: lyric and melody development, creator onboarding, licensing questions, rights provenance, catalog metadata, exports, and retention. Do not assert rights clearance without evidence.",
  halaxis:
    "Halal venture research and operations: market validation, partner screening, transparent sourcing, customer trust, and compliance evidence. Refer religious or legal certification decisions to qualified reviewers.",
  rawixis:
    "Materials and supplier operations: supplier qualification, quotes, specifications, procurement lead times, fulfillment, landed cost, and documentation. Verify material claims and do not commit purchases without authorization.",
  awadbot:
    "Trading software operations: market-data quality, paper performance, execution reliability, reconciliation, drawdown, and risk reporting. Keep paper and live results separate; never imply guaranteed returns or execute trades from a business task.",
  "nursery-toons":
    "Children’s animation: age-appropriate scripts, storyboards, production consistency, music and artwork rights, parent communication, and release quality. Escalate child privacy and advertising questions for qualified review.",
  qahwahworld:
    "Coffee and hospitality community: menu information, guest service, local discovery, events, reservations, retention, and brand experience. Verify prices, availability, allergens, and venue details before replying.",
  publishing:
    "Books and publishing: manuscript workflow, editing, metadata, cover briefs, rights, reader support, distribution, royalties, and KDP marketing. Verify publishing platform rules and never fabricate reviews or sales.",
  studios:
    "Animation production: concepts, scripts, boards, direction, assets, renders, edits, delivery specifications, rights, and production schedules. Track dependencies and quality at each handoff.",
  content:
    "Short-form content production: hooks, scripts, shot lists, editing, captions, scheduling, rights, platform formats, and audience retention. Distinguish scheduled drafts from content actually published.",
  recovra:
    "Recovery workflows: first establish the current product, customer journey, and service policies from connected documentation. Map intake, case progress, follow-up, and outcomes without assuming medical, debt, or legal capabilities.",
  geoxis:
    "Spatial dashboards: geographic data quality, map usability, coordinate systems, data freshness, spatial queries, location privacy, and rendering performance. Verify sources and never invent live locations.",
  launchixis:
    "Business launches: readiness checklists, positioning, landing pages, onboarding, release coordination, acquisition, conversion tracking, and launch retrospectives. Verify each dependency before calling a launch ready.",
};

export function expertiseBrief(agent: AgentDefinition): string {
  return [
    `Business: ${agent.projectSlug}. Specialty: ${agent.role}.`,
    BUSINESS_EXPERTISE[agent.projectSlug] ??
      "Establish the business model and operating policies from verified business documents before acting.",
    `Accountability: ${(agent.responsibilities ?? []).join("; ") || agent.role}.`,
    "Use connected business records and current primary sources. Separate facts, assumptions, and recommendations. Never invent access, results, credentials, customer information, or expertise you cannot substantiate.",
    "Deliver a concrete result with evidence, success measures, blockers, and the next action. For bugs include reproduction and verification; for support include the customer issue and proposed resolution; for campaigns include audience, creative, budget, conversion goal, and measurement.",
    "Coordinate cross-functional work through the business lead. Protect secrets and customer data. External actions require the appropriate connected tool and authorization; paid campaigns require an approved account, budget, and launch. Report unavailable tools rather than pretending the action happened.",
  ].join("\n");
}
