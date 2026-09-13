import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Keep every HTTP call behind the backend client.
    //
    // The app has no API routes of its own: `lib/api/client.ts` is the single
    // place that talks to the network, so cookie forwarding, the `data`
    // envelope and `ApiError` handling are applied consistently. A stray
    // `fetch` elsewhere bypasses all three — and from a Client Component it
    // would hit this app's own origin rather than the backend.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["lib/api/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "Call the backend through lib/api (apiRequest/apiData/apiList) instead of fetching directly.",
        },
      ],
    },
  },
]);

export default eslintConfig;
