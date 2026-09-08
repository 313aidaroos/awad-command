import type { ProjectStatus } from '@/types/project';

export const STATUS_COLOR: Record<ProjectStatus, string> = {
  operational: '#3D8BFF',
  active: '#6FE3B4',
  idle: '#5B616B',
  attention: '#F2C14E',
  warning: '#F2994A',
  error: '#E5533D',
  offline: '#3A3E45',
};
