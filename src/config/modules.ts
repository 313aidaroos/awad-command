/**
 * Central module/room registry for the AWAD COMMAND landing.
 * Navigation, module strip, and project routes read from here.
 * Add a company = add one row. Nothing else to touch.
 */
export type ModuleCategory = 'core' | 'company' | 'studio' | 'system';

export interface ModuleDefinition {
  id: string;
  slug: string;
  name: string;
  short: string;
  description: string;
  route: string;
  category: ModuleCategory;
  accent: string;
  /** Slug used by fleetProbe / companyOps when this module is a probed company. */
  fleetSlug?: string;
  /** Public site, when one exists. */
  url?: string;
  glyph: string;
}

export const MODULES: ModuleDefinition[] = [
  { id: 'command', slug: 'command', name: 'Command Center', short: 'COMMAND', description: '3D operations deck', route: '/command', category: 'core', accent: '#f4b942', glyph: '◈' },
  { id: 'crypto', slug: 'crypto-floor', name: 'The Crypto Floor', short: 'CRYPTO', description: 'Autonomous paper-trading floor', route: '/crypto-floor', category: 'core', accent: '#4cd9ff', glyph: '₿' },
  { id: 'apixis', slug: 'apixis', name: 'Apixis', short: 'APIXIS', description: 'Virtual world and economy for AI agents', route: '/projects/apixis', category: 'company', accent: '#3c8dff', fleetSlug: 'apixis', url: 'https://apixis.dev', glyph: '⬢' },
  { id: 'socixis', slug: 'socixis', name: 'Socixis', short: 'SOCIXIS', description: 'AI marketing and social', route: '/projects/socixis', category: 'company', accent: '#8758ff', fleetSlug: 'socixis', url: 'https://socixis.dev', glyph: '◎' },
  { id: 'contraxis', slug: 'contraxis', name: 'Contraxis', short: 'CONTRAXIS', description: 'Homeowners and contractors matched with AI', route: '/projects/contraxis', category: 'company', accent: '#f4b942', fleetSlug: 'contraxis', url: 'https://contraxis-dev.vercel.app', glyph: '⌂' },
  { id: 'halaxis', slug: 'halaxis', name: 'Halaxis', short: 'HALAXIS', description: 'Halal and Sharia-compliant fund', route: '/projects/halaxis', category: 'company', accent: '#37e681', fleetSlug: 'halaxis', url: 'https://halaxis.vercel.app', glyph: '☾' },
  { id: 'rawixis', slug: 'rawixis', name: 'Rawixis', short: 'RAWIXIS', description: 'B2B market for critical raw materials', route: '/projects/rawixis', category: 'company', accent: '#f2994a', fleetSlug: 'rawixis', url: 'https://rawixis.vercel.app', glyph: '▲' },
  { id: 'lyrixis', slug: 'lyrixis', name: 'Lyrixis', short: 'LYRIXIS', description: 'Music metadata and catalog intelligence', route: '/projects/lyrixis', category: 'company', accent: '#ff5353', fleetSlug: 'lyrixis', url: 'https://lyrixis.vercel.app', glyph: '♪' },
  { id: 'awadbot', slug: 'awadbot', name: 'AwadBot', short: 'AWADBOT', description: 'Personal financier', route: '/projects/awadbot', category: 'company', accent: '#4cd9ff', fleetSlug: 'awadbot', url: 'https://awadbot.vercel.app', glyph: '◇' },
  { id: 'qahwahworld', slug: 'qahwahworld', name: 'Qahwahworld', short: 'QAHWAH', description: 'Specialty coffee marketplace', route: '/projects/qahwahworld', category: 'company', accent: '#f4b942', fleetSlug: 'qahwahworld', url: 'https://qahwahworld.vercel.app', glyph: '☕' },
  { id: 'recovra', slug: 'recovra', name: 'Recovra', short: 'RECOVRA', description: 'Overcharge recovery for companies', route: '/projects/recovra', category: 'company', accent: '#37e681', fleetSlug: 'recovra', url: 'https://recovra-three.vercel.app', glyph: '↺' },
  { id: 'geoxis', slug: 'geoxis', name: 'Geoxis', short: 'GEOXIS', description: 'Live 3D map of company movement', route: '/projects/geoxis', category: 'company', accent: '#3c8dff', fleetSlug: 'geoxis', url: 'https://spatial-dashboard-xi.vercel.app', glyph: '⊕' },
  { id: 'launchixis', slug: 'launchixis', name: 'Launchixis', short: 'LAUNCH', description: 'Launch ops for new family companies', route: '/projects/launchixis', category: 'company', accent: '#8758ff', fleetSlug: 'launchixis', url: 'https://launchixis.vercel.app', glyph: '⇡' },
  { id: 'nursery-toons', slug: 'nursery-toons', name: 'Nursery Toons', short: 'TOONS', description: 'Kids cartoons and nursery content', route: '/projects/nursery-toons', category: 'company', accent: '#ff5353', fleetSlug: 'nursery-toons', url: 'https://nurserytoons.vercel.app', glyph: '★' },
  { id: 'content', slug: 'content', name: 'Content Studio', short: 'CONTENT', description: 'One-minute social videos', route: '/content', category: 'studio', accent: '#8758ff', fleetSlug: 'contentbot', url: 'https://personalcontentbot.vercel.app', glyph: '▶' },
  { id: 'books', slug: 'books', name: 'Books & Media', short: 'BOOKS', description: 'KDP and publishing', route: '/books', category: 'studio', accent: '#f4b942', glyph: '▤' },
  { id: 'analytics', slug: 'analytics', name: 'Analytics', short: 'ANALYTICS', description: 'Cross-company metrics', route: '/analytics', category: 'system', accent: '#4cd9ff', glyph: '▥' },
];

export const PRIMARY_TABS = [
  { label: 'Home', route: '/' },
  { label: 'Projects', route: '/projects' },
  { label: 'Agents', route: '/agents' },
  { label: 'Analytics', route: '/analytics' },
  { label: 'News', route: '/news' },
  { label: 'Strategy Lab', route: '/strategy' },
  { label: 'The Crypto Floor', route: '/crypto-floor' },
  { label: 'More', route: '/system' },
] as const;

export const SIDEBAR_ITEMS = [
  { label: 'Command Center', route: '/command', glyph: '◈' },
  { label: 'Projects', route: '/projects', glyph: '⬢' },
  { label: 'Agents', route: '/agents', glyph: '◉' },
  { label: 'Analytics', route: '/analytics', glyph: '▥' },
  { label: 'News', route: '/news', glyph: '≣' },
  { label: 'Strategy Lab', route: '/strategy', glyph: '⌬' },
  { label: 'The Crypto Floor', route: '/crypto-floor', glyph: '₿' },
  { label: 'Content Studio', route: '/content', glyph: '▶' },
  { label: 'Books & Media', route: '/books', glyph: '▤' },
  { label: 'Automations', route: '/automations', glyph: '⟳' },
  { label: 'System', route: '/system', glyph: '⚙' },
  { label: 'Settings', route: '/settings', glyph: '⋯' },
] as const;

export function companyModules(): ModuleDefinition[] {
  return MODULES.filter((m) => m.category === 'company');
}

export function getModule(slug: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.slug === slug);
}
