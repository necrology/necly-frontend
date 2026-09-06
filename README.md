# Necly Services Frontend

Next.js 16 App Router marketplace and operations dashboard for Necly Services — Indonesian digital subscription slot marketplace.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript (strict)
- Tailwind CSS 4
- Zustand (client state) + TanStack Query (server state)
- Vitest + React Testing Library
- ESLint 9 (flat config) + Prettier

## Project Structure

```
src/
  app/
    (site)/          → public marketing, catalog, checkout, orders, auth
    (auth)/          → login, register, verify-email
    dashboard/       → admin/seller management (products, inventory, orders, vouchers, payments, users, testimonials, assets, audit)
    api/             → Next.js API routes (if any)
  components/        → shared UI components (Button, Input, ServiceCard, tables, badges, etc.)
  data/seed.ts       → demo data (SubscriptionProduct, Voucher, DashboardOrder, etc.)
  lib/
    api.ts           → API client + Zustand auth store
    types.ts         → shared TypeScript types
    money.ts         → IDR formatting
    utils.ts         → classnames helper
  stores/            → cart, checkout stores
  styles/            → globals.css, Tailwind config
public/brand/        → logos (SVG)
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page (hero, trust strip, featured products, how-it-works, testimonial) |
| `/products` | Catalog with search, category filter, price range, stock filter, sort |
| `/products/[slug]` | Product detail (benefits, pricing, activation steps, testimonials, purchase panel) |
| `/cart` | Cart with quantity editing, voucher input, summary |
| `/checkout` | Checkout form (address, payment method, idempotency) |
| `/payment/[orderId]` | Payment provider redirect / status |
| `/orders/[orderId]` | Order tracking timeline |
| `/login`, `/register`, `/verify-email` | Auth flows |
| `/dashboard/*` | Admin/seller management views |

## Quick Start (Docker Compose)

```bash
# From parent directory (C:\Source Next)
docker compose -f necly-compose.yml up --build
```

- Frontend: http://localhost:3000
- API (proxy via next.config): http://localhost:8080/api/v1

## Local Development

### Prerequisites

- Node.js 24+
- npm 11+

### Install

```bash
npm ci
```

### Environment

```bash
cp .env.example .env.local
# Edit .env.local
```

Required:
- `NEXT_PUBLIC_API_URL` — backend API base (e.g., `http://localhost:8080/api/v1`)
- `NEXT_PUBLIC_SITE_URL` — this frontend origin (e.g., `http://localhost:3000`)

### Run Dev Server

```bash
npm run dev
```

### Quality Gates

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run build      # Production build (standalone output)
```

## Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` (or default when API unreachable) to run entirely on seeded data without a backend.

## Branding

- **Name**: Necly Services
- **Tagline**: Solusi hemat berlangganan akun premium, aman dan terpercaya
- **Fonts**: Sora (400 body, 600–700 headings) via `@fontsource/sora`
- **Colors**:
  - White `#FFFFFF`, Gray `#F3F4F6` / `#9CA3AF`
  - Sky blue `#0EA5E9` / `#38BDF8`
  - Dark blue `#1E3A8A` / `#1E40AF`
  - Purple `#7C3AED` / `#8B5CF6` (premium/CTA)
- **Radius**: `rounded-md` / `rounded-lg`
- **Shadows**: thin, transitions 150–200ms

## Design Principles

- Compact, minimal UI with generous whitespace
- Small elements, low visual density
- Responsive (mobile-first breakpoints)
- All copy in Indonesian
- "Invitation-based activation" semantics (no password sharing)

## Production Build

```bash
npm run build
# Output in .next/standalone/ — copy to container
```

Dockerfile uses multi-stage build with `output: 'standalone'`.

## Testing

- Unit: `src/**/*.test.ts(x)` with Vitest
- Components: React Testing Library
- Run: `npm test` (CI) or `npm run test:watch` (dev)

## Deployment Notes

- Set all `NEXT_PUBLIC_*` env vars at runtime
- No frontend secrets (all secrets backend-side)
- Standalone output → minimal container
- Healthcheck: `GET /` returns 200
- CSP headers via `next.config.ts`