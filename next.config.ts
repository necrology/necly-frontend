import type { NextConfig } from "next";
import { apiOrigin } from "./src/lib/api-base";

// CSP host sources with a path only match that exact path unless they end in
// a slash. Allow the API origin so browser requests to /api/v1/* are not
// blocked before they reach the backend. `apiOrigin` derives its fallback from
// the same module as the API client (`src/lib/api-base.ts`), so `connect-src`
// and the bundled API base can never diverge when NEXT_PUBLIC_API_URL is unset.
const apiOriginValue = apiOrigin(process.env.NEXT_PUBLIC_API_URL);

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOriginValue} https://cloudflareinsights.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
