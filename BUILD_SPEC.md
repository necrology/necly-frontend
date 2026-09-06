# Necly Services frontend build specification

Build the complete production-quality frontend in this repository. The package/config and five strict RED→GREEN behavior suites already exist; preserve them and their behavior. Do not touch anything outside this repository. Do not commit or push.

## Stack
- Next.js 16 latest App Router under src/app, TypeScript strict, React 19, Tailwind CSS v4.
- Sora is installed via @fontsource/sora. Zustand is installed and existing cart/sidebar stores must be used.
- lucide-react and recharts are installed.
- Use Server Components by default and focused Client Components for interactions.
- Build against Next 16 conventions, including async dynamic route params.

## Brand and composition
- Brand name Necly Services throughout title, metadata, navbar, footer, auth, about, dashboard.
- Use supplied official SVG assets in public/brand/necly-services-logo.svg and icon-only SVG. Do not replace them with generated logos.
- Style: original bright premium service marketplace. Off-white/white canvas, deep navy #061b31, sky #0ea5e9, selective violet #7c3aed, compact controls, 4–8px radii, generous whitespace, subtle blue-tinted shadows. Brand gradient cyan→blue→indigo→violet only on the logo and selected emphasis—not gradient-soup.
- Sora typography. Accessible visible focus, semantic landmarks, keyboard usable, minimum 44px touch targets, reduced-motion handling.
- Avoid glassmorphism, generic AI gradients, emoji, fake decorative stats, giant rounded cards, and repeated icon-topper feature cards.
- Landing is Decide/Learn: editorial asymmetric hero with one clear idea per section.
- Catalog is Explore: search/filter/result grid is the composition.
- Dashboard is Monitor/Operate: data density and actions, no marketing hero.
- Responsive at mobile/tablet/desktop.

## Public routes
Implement every route fully, not placeholders:
1. / landing: asymmetric editorial hero, service-discovery mock panel, category rail, curated services, process, trust/testimonials, CTA.
2. /products interactive catalog with text search, category, max-price, in-stock filter, result count/reset/sort, responsive cards.
3. /products/[slug] full service detail: breadcrumb, category/rating, description, inclusions, selectable package/timeline where suitable, duration, inventory, seller, price/purchase panel, testimonials, related services. generateMetadata and valid Product JSON-LD based on seed data. notFound for unknown slug.
4. /cart functional persisted cart: quantities bounded by stock, remove, empty, voucher demo, computed summary.
5. /checkout functional validated contact/project brief form, order review, terms, then routes to a DEMO payment order. Do not imply live purchase.
6. /payment/[orderId] clearly labeled Sandbox/demo. Payment method selection and safe simulation UI. Never claim money was charged; label simulated approval.
7. /orders/[orderId] order detail/tracker using getOrderSteps. Include order/service/contact/activity/support data and demo label where applicable.
8. /login and /register polished accessible interactive demo forms with validation/show-password.
9. /verify-email useful verification state/resend timer interaction.
10. /about brand story, principles, operating model, trust and CTA.

## Dashboard
Implement /dashboard with a persisted collapsible sidebar and mobile drawer using the existing ui store, plus topbar with command/search, notification and profile controls. All nav entries and pages must work:
- overview at /dashboard with meaningful revenue/order/service metrics, compact Recharts area/bar charts, recent orders, activity and quick actions.
- /dashboard/products: searchable/filterable service table and practical actions.
- /dashboard/inventory: stock/availability table, low-stock summary, restock/availability interaction.
- /dashboard/orders: searchable/status-filterable operations table, status controls/details.
- /dashboard/customers: searchable customer table with spend/orders/status.
- /dashboard/payments: payment/reconciliation table, method split, sandbox warning.
- /dashboard/reports: date/metric controls, charts, category performance, export-demo feedback.
- /dashboard/vouchers: voucher table, active toggle, create-voucher interaction.
- /dashboard/notifications: filter and mark-read interactions.
- /dashboard/audit-log: searchable event table, actor/action/resource/time and export-demo feedback.
Use reusable PageHeader, MetricCard, status badge, DataTable-like primitives rather than giant duplicate pages.

## Data/API/system
- Rich typed mock seed data: at least 8 distinct services across several categories, testimonials, dashboard orders/customers/payments/activity/charts/vouchers/audit records. Copy must be specific and plausible, never lorem ipsum. Avoid unsupported hype claims; label seed/dashboard data Demo data.
- API client wrapper prepared for NEXT_PUBLIC_API_URL with typed request, JSON/error handling, and safe fallback base URL. UI can consume seeds now.
- Root metadata, metadataBase, Open Graph, icons; app/sitemap.ts and app/robots.ts.
- next.config.ts already has security headers/CSP; improve if needed without breaking font/assets/build.
- root loading, global-error/error and not-found experiences where useful.
- README with setup, architecture, route inventory, scripts, demo-data/payment disclaimer, API integration guidance.
- .env.example with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL.

## Quality and behavior
- Existing strict TDD suites cover catalog filtering, IDR formatting/totals, persisted cart logic, sidebar toggle, and order steps. Add component behavior tests only test-first if you introduce reusable nontrivial behavior.
- Real interactions/client state, not static screenshots: mobile nav, filters/sort, add to cart, quantities, voucher, checkout validation, demo payment selection/simulation, auth validation, resend timer, sidebar, admin filters/actions/toggles/feedback.
- Avoid hydration mismatch for persisted Zustand stores.
- No broken links, no console errors, no fake live payment success.
- Run npm test, npm run lint, npm run typecheck, and npm run build. Fix all errors and material warnings. Keep output clean.
