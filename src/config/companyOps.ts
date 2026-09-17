export const ownerAdminEmail = 'awad@apixis.dev';

export type SupportAlias = string | 'unavailable';

export interface CompanyOpsDefinition {
  slug: string;
  name: string;
  supportAlias: SupportAlias;
  adminEmail: string;
}

/** Real support/admin inventory known to Command. Unknown aliases stay unavailable. */
export const companyOps: CompanyOpsDefinition[] = [
  { slug: 'apixis', name: 'Apixis', supportAlias: 'support@apixis.dev', adminEmail: ownerAdminEmail },
  { slug: 'socixis', name: 'Socixis', supportAlias: 'support@socixis.dev', adminEmail: ownerAdminEmail },
  { slug: 'contraxis', name: 'Contraxis', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'lyrixis', name: 'Lyrixis', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'halaxis', name: 'Halaxis', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'rawixis', name: 'Rawixis', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'awadbot', name: 'AwadBot', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'qahwahworld', name: 'Qahwahworld', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'recovra', name: 'Recovra', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'geoxis', name: 'Geoxis', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'launchixis', name: 'Launchixis', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'nursery-toons', name: 'Nursery Toons', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
  { slug: 'contentbot', name: 'Content Bot', supportAlias: 'unavailable', adminEmail: ownerAdminEmail },
];
