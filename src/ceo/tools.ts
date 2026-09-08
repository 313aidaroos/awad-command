export const ceoTools = [
  {
    name: 'navigate',
    description: 'Fly the camera to a project, agent, or mode. Never executes business actions.',
  },
  {
    name: 'open_panel',
    description: 'Open a HUD panel: agent, analytics, briefing, approval, computer, lead.',
  },
  {
    name: 'propose_approval',
    description: 'Create a record-only approval card. Does not spend, publish, delete, or trade.',
  },
] as const;

export interface ProposeApprovalArgs {
  title: string;
  description: string;
  kind: 'deploy' | 'campaign' | 'financial' | 'other';
  risk: 'low' | 'medium' | 'high';
}
