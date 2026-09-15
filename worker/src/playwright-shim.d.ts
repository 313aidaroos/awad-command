declare module 'playwright' {
  export interface PlaywrightPage {
    goto: (url: string, options?: { timeout?: number; waitUntil?: string }) => Promise<unknown>;
    screenshot: (options?: { type?: string; fullPage?: boolean }) => Promise<Buffer>;
    url: () => string;
  }

  export interface PlaywrightContext {
    pages: () => PlaywrightPage[];
    newPage: () => Promise<PlaywrightPage>;
    close: () => Promise<void>;
  }

  export const chromium: {
    launchPersistentContext: (
      userDataDir: string,
      options?: Record<string, unknown>,
    ) => Promise<PlaywrightContext>;
  };
}
