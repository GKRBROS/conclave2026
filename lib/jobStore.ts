declare global {
  var __jobs: Map<string, any> | undefined;
}

// Global job store that persists across requests
export const jobStore: Map<string, any> = globalThis.__jobs ?? (globalThis.__jobs = new Map());

