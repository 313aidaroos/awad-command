# HQ design update

Replaces the Home presentation with the reference command-room design while keeping the existing app and integrations.

## Scope

Home uses a compact terminal navigation, responsive command-room hero, company strip, finances, projects, health, news, Cixy and activity. Every module comes from the existing registry. Cixy opens the existing CEO console. Fleet and mission-control polling remain the original data sources. All other routes retain their original behavior and layout, including the 3D Command Center.

No API routes, authentication, credentials, database migrations, worker code, dependency manifests, or deployment configuration are changed. Financial aggregation and news were already unconnected; the UI shows unavailable states instead of invented data. Production integration health depends on the existing environment and services.

## Validation

- App TypeScript passed; 82 tests across 18 files passed.
- Worker TypeScript passed; 55 tests across 12 files passed.
- Optimized Next.js production build passed (existing lint warnings remain).
- Browser checked at desktop and 390px mobile widths, with no horizontal page overflow; tour and existing Cixy console opening verified.
- Local fleet refresh reached all 13 configured company sites. Local credentials were not copied from production.

## Merge and rollback

Apply this commit to the existing repository. Do not replace the repository with the separate starter package. Keep existing Vercel environment variables and database schema. Git integration deploys the production branch with the existing project settings. Roll back by reverting the HQ commit or restoring the previous Vercel deployment.

Assets: generated command-room artwork; self-hosted Oxanium and IBM Plex Mono fonts with license files under public/hq-fonts.
