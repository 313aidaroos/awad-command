import { schedule as contraxisDemo } from '@/projects/contraxis/demo';
import { contraxis } from '@/projects/contraxis';
import { schedule as socixisDemo } from '@/projects/socixis/demo';
import { socixis } from '@/projects/socixis';
import { schedule as awadbotDemo } from '@/projects/awadbot/demo';
import { awadbot } from '@/projects/awadbot';
import { apixis } from '@/projects/apixis';
import { lyrixis } from '@/projects/lyrixis';
import { halaxis } from '@/projects/halaxis';
import { rawixis } from '@/projects/rawixis';
import { publishing } from '@/projects/publishing';
import { studios } from '@/projects/studios';
import { nurseryToons } from '@/projects/nursery-toons';
import { qahwahworld } from '@/projects/qahwahworld';
import { genericDemo } from '@/projects/genericDemo';
import type { Emit } from '@/projects/demoShared';
import type { ProjectDefinition } from '@/types/project';

export const projects: ProjectDefinition[] = [
  contraxis,
  socixis,
  lyrixis,
  halaxis,
  rawixis,
  awadbot,
  apixis,
  nurseryToons,
  qahwahworld,
  publishing,
  studios,
];

export type DemoScheduler = (emit: Emit, project: ProjectDefinition) => () => void;

export const demoRunners: Record<string, DemoScheduler> = {
  contraxis: contraxisDemo,
  socixis: socixisDemo,
  awadbot: awadbotDemo,
  apixis: genericDemo('deployment.completed', 'Completed deployment', 11000),
  lyrixis: genericDemo('agent.task.completed', 'Lyric draft parked', 16000),
  halaxis: genericDemo('lead.created', 'Logged a venture lead', 14000),
  rawixis: genericDemo('system.error', 'Supplier check failed', 9000),
  publishing: genericDemo('content.published', 'Adjusted ad bids', 12000),
  studios: genericDemo('agent.task.completed', 'Scene 4 draft complete', 13000),
  'nursery-toons': genericDemo('agent.status.changed', 'Storyboard waiting on studio', 18000),
  qahwahworld: genericDemo('agent.status.changed', 'Café world still warming up', 19000),
};

export function getProject(slug: string): ProjectDefinition | undefined {
  return projects.find((project) => project.slug === slug);
}

export function listProjectSlugs(): string[] {
  return projects.map((project) => project.slug);
}
