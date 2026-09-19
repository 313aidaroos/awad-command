/** Public company sites Command can probe. Status only — no product logic. */
export const FLEET_SITES = [
  { slug: 'contraxis', name: 'Contraxis', url: 'https://contraxis-dev.vercel.app' },
  { slug: 'socixis', name: 'Socixis', url: 'https://socixis.dev' },
  { slug: 'wallet', name: 'Apixis Wallet', url: 'https://apixis-wallet.vercel.app' },
  { slug: 'lyrixis', name: 'Lyrixis', url: 'https://lyrixis.vercel.app' },
  { slug: 'halaxis', name: 'Halaxis', url: 'https://halaxis.vercel.app' },
  { slug: 'rawixis', name: 'Rawixis', url: 'https://rawixis.vercel.app' },
  { slug: 'awadbot', name: 'AwadBot', url: 'https://awadbot.vercel.app' },
  { slug: 'apixis', name: 'Apixis', url: 'https://apixis.dev' },
  { slug: 'qahwahworld', name: 'Qahwahworld', url: 'https://qahwahworld.vercel.app' },
  { slug: 'recovra', name: 'Recovra', url: 'https://recovra-three.vercel.app' },
  { slug: 'geoxis', name: 'Geoxis', url: 'https://spatial-dashboard-xi.vercel.app' },
  { slug: 'launchixis', name: 'Launchixis', url: 'https://launchixis.vercel.app' },
  { slug: 'nursery-toons', name: 'Nursery Toons', url: 'https://nurserytoons.vercel.app' },
  { slug: 'contentbot', name: 'Content Bot', url: 'https://personalcontentbot.vercel.app' },
] as const;

export type FleetSiteDef = (typeof FLEET_SITES)[number];
