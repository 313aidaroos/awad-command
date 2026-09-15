import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface ComputerPage {
  goto: (url: string, opts?: { timeout?: number }) => Promise<void>;
  screenshot: (opts?: { fullPage?: boolean }) => Promise<Buffer>;
  url: () => string;
}

export interface ComputerSession {
  page: () => Promise<ComputerPage>;
  close: () => Promise<void>;
}

export interface ComputerRuntime {
  enabled: boolean;
  reason?: string;
  dataDir: string;
  profileDir: (projectSlug: string) => string;
  open: (projectSlug: string) => Promise<ComputerSession>;
}

export interface RuntimeOptions {
  dataDir: string;
  headless?: boolean;
}

export function profilePath(dataDir: string, projectSlug: string): string {
  const safe = projectSlug.replace(/[^a-z0-9._-]+/gi, '-') || 'unknown';
  return join(dataDir, 'profiles', safe);
}

export function createUnavailableRuntime(dataDir: string, reason: string): ComputerRuntime {
  return {
    enabled: false,
    reason,
    dataDir,
    profileDir: (slug) => profilePath(dataDir, slug),
    async open() {
      throw new Error(reason);
    },
  };
}

export function createFakeRuntime(
  dataDir: string,
  pages: { url?: string; png?: Buffer } = {},
): ComputerRuntime {
  let current = pages.url ?? 'about:blank';
  return {
    enabled: true,
    dataDir,
    profileDir: (slug) => profilePath(dataDir, slug),
    async open() {
      await mkdir(profilePath(dataDir, 'test'), { recursive: true });
      return {
        async page() {
          return {
            async goto(url) {
              current = url;
            },
            async screenshot() {
              return pages.png ?? Buffer.from('89504e470d0a1a0a', 'hex');
            },
            url: () => current,
          };
        },
        async close() {
          return;
        },
      };
    },
  };
}

export async function createPlaywrightRuntime(opts: RuntimeOptions): Promise<ComputerRuntime> {
  const dataDir = opts.dataDir;
  const headless = opts.headless !== false;
  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    return createUnavailableRuntime(
      dataDir,
      'Playwright is not installed. From worker/: pnpm add playwright && npx playwright install chromium. Or run worker/Dockerfile.computer. See docs/COMPUTER_SETUP.md.',
    );
  }

  return {
    enabled: true,
    dataDir,
    profileDir: (slug) => profilePath(dataDir, slug),
    async open(projectSlug) {
      const dir = profilePath(dataDir, projectSlug);
      await mkdir(dir, { recursive: true });
      try {
        const context = await playwright.chromium.launchPersistentContext(dir, {
          headless,
          viewport: { width: 1280, height: 720 },
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        });
        return {
          async page() {
            const existing = context.pages()[0];
            const page = existing ?? (await context.newPage());
            return {
              goto: (url, gotoOpts) => page.goto(url, { timeout: gotoOpts?.timeout ?? 20_000, waitUntil: 'domcontentloaded' }).then(() => undefined),
              screenshot: (shotOpts) => page.screenshot({ type: 'png', fullPage: shotOpts?.fullPage === true }),
              url: () => page.url(),
            };
          },
          async close() {
            await context.close();
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Chromium failed to launch (${message}). Install browsers with npx playwright install chromium, or use Xvfb + Dockerfile.computer. See docs/COMPUTER_SETUP.md.`,
        );
      }
    },
  };
}
