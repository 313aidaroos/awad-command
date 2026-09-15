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
  closeAll: () => Promise<void>;
}

export interface RuntimeOptions {
  dataDir: string;
  headless?: boolean;
}

export interface FakeRuntimeStats {
  opens: number;
  closes: number;
}

export interface FakeComputerRuntime extends ComputerRuntime {
  stats: FakeRuntimeStats;
}

export function profilePath(dataDir: string, projectSlug: string): string {
  const safe = projectSlug.replace(/[^a-z0-9._-]+/gi, '-') || 'unknown';
  return join(dataDir, 'profiles', safe);
}

/** Keep one live session per project so navigate + later screenshots share a page. */
export function createSessionPool(openFresh: (projectSlug: string) => Promise<ComputerSession>): {
  open: (projectSlug: string) => Promise<ComputerSession>;
  closeAll: () => Promise<void>;
} {
  const sessions = new Map<string, Promise<ComputerSession>>();

  async function open(projectSlug: string): Promise<ComputerSession> {
    const existing = sessions.get(projectSlug);
    if (existing) return existing;

    let pending: Promise<ComputerSession>;
    pending = openFresh(projectSlug)
      .then((session) => {
        const wrapped: ComputerSession = {
          page: () => session.page(),
          close: async () => {
            if (sessions.get(projectSlug) === pending) {
              sessions.delete(projectSlug);
            }
            await session.close();
          },
        };
        return wrapped;
      })
      .catch((err) => {
        if (sessions.get(projectSlug) === pending) {
          sessions.delete(projectSlug);
        }
        throw err;
      });

    sessions.set(projectSlug, pending);
    return pending;
  }

  async function closeAll(): Promise<void> {
    const pending = [...sessions.values()];
    sessions.clear();
    await Promise.all(
      pending.map(async (entry) => {
        try {
          await (await entry).close();
        } catch {
          return;
        }
      }),
    );
  }

  return { open, closeAll };
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
    async closeAll() {
      return;
    },
  };
}

const EMPTY_PNG = Buffer.from('89504e470d0a1a0a', 'hex');

export function createFakeRuntime(
  dataDir: string,
  pages: { url?: string; png?: Buffer } = {},
): FakeComputerRuntime {
  const stats: FakeRuntimeStats = { opens: 0, closes: 0 };
  const pool = createSessionPool(async (projectSlug) => {
    stats.opens += 1;
    await mkdir(profilePath(dataDir, projectSlug || 'test'), { recursive: true });
    // Fresh sessions start blank unless the caller seeded an initial URL.
    // URL is stored on this session object so a later open() without the pool
    // would lose navigation — that is the production bug we are covering.
    let current = pages.url ?? 'about:blank';
    return {
      async page() {
        return {
          async goto(url) {
            current = url;
          },
          async screenshot() {
            return pages.png ?? EMPTY_PNG;
          },
          url: () => current,
        };
      },
      async close() {
        stats.closes += 1;
      },
    };
  });

  return {
    enabled: true,
    dataDir,
    profileDir: (slug) => profilePath(dataDir, slug),
    open: pool.open,
    closeAll: pool.closeAll,
    stats,
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

  const pool = createSessionPool(async (projectSlug) => {
    const dir = profilePath(dataDir, projectSlug);
    await mkdir(dir, { recursive: true });
    try {
      const context = await playwright.chromium.launchPersistentContext(dir, {
        headless,
        viewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
      let page = context.pages()[0] ?? (await context.newPage());
      return {
        async page() {
          const stillOpen = context.pages().includes(page);
          if (!stillOpen) {
            page = context.pages()[0] ?? (await context.newPage());
          }
          return {
            goto: (url, gotoOpts) =>
              page
                .goto(url, { timeout: gotoOpts?.timeout ?? 20_000, waitUntil: 'domcontentloaded' })
                .then(() => undefined),
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
  });

  return {
    enabled: true,
    dataDir,
    profileDir: (slug) => profilePath(dataDir, slug),
    open: pool.open,
    closeAll: pool.closeAll,
  };
}
