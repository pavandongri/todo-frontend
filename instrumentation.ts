import { EnvironmentError, serverEnv } from "@/lib/env";

/**
 * Runs once per server instance, before any request is handled.
 *
 * Validating the environment here means a misconfigured deployment fails at
 * start-up with a readable message, instead of booting and erroring on every
 * request that tries to reach the backend.
 */
export function register() {
  try {
    serverEnv();
  } catch (error) {
    if (!(error instanceof EnvironmentError)) throw error;

    // Next.js keeps the process alive when the instrumentation hook rejects —
    // it logs and then serves 500s. For a configuration fault that is worse
    // than not starting at all, so exit rather than limp along.
    console.error(`\n${error.message}\n`);
    process.exit(1);
  }
}
