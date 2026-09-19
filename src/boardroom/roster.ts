import { projects } from "@/projects/registry";

export type BoardroomScope =
  | { kind: "all" }
  | { kind: "business"; value: string }
  | { kind: "role"; value: string };

export const boardroomAgents = projects.flatMap((project) =>
  project.agents.map((agent) => ({
    ...agent,
    projectName: project.name,
    accent: project.accent,
  })),
);

export const boardroomRoles = Array.from(
  new Set(boardroomAgents.map((agent) => agent.role)),
).sort();

export function resolveBoardroomParticipants(scope: BoardroomScope) {
  if (scope.kind === "business")
    return boardroomAgents.filter((agent) => agent.projectSlug === scope.value);
  if (scope.kind === "role")
    return boardroomAgents.filter((agent) => agent.role === scope.value);
  return boardroomAgents;
}
