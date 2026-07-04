# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Backend (`src/`, `prisma/`) and the staff-facing POS frontend (`pos/`) are both built out per the spec below. See `README.md` for setup, deploy, and the full API reference. Not yet built: a separate public/customer-facing website — only the internal staff app exists so far.

Note: `karel-backend` (a sibling Node/Express/Prisma project also for a flower shop POS) is a **separate, unrelated project** — do not treat it as prior art or reuse its schema/routes for this one unless the user explicitly says to.

## Tech stack

- **Backend**: Node.js + Express + Prisma, targeting PostgreSQL.
- **Frontend**: `pos/` is a plain HTML/CSS/vanilla-JS (ES modules) static app — no build step, no framework. It calls the backend via `fetch`; the API base URL is set in `pos/js/config.js`.
- **Hosting**: Railway (backend + Postgres). `pos/` deploys as a static site (e.g. Cloudflare Pages) — update `pos/js/config.js` with the deployed Railway URL after backend deploy.

## What this project is

A point-of-sale + website backend for a flower shop. It has two audiences: **staff** (dashboard, order creation, deliveries, inventory, admin/reporting) and the **shop's operational workflow** (arrangement-making → delivery → payment confirmation). Full functional spec: [karelsflowerspos.txt](karelsflowerspos.txt).

## Domain model (from spec)

### Orders
The core entity. Created via a multi-step form: customer lookup/create → products (multiple, with notes) → occasion (birthday, anniversary, funeral, graduation, love, other; funeral adds banner color/message) → gift message (+ signature or anonymous) → delivery info → payment → notification method → staff attribution (dropdown + PIN).

- **Delivery types**: house/apt, business/work, or pickup — each with its own required fields (recipient name/phone, address, zip, notes; business adds business name + dept).
- **Payment**: card, cash, check, zelle, cashapp. Total = products + delivery fee (looked up by zip code, or custom) + tax (rate 1.0825). Tax-exempt checkbox zeroes tax.
- **Order status flow**: `making arrangement` → `pending delivery` → `completed`.
- Orders list oldest → newest; each row supports view (full detail + edit) and submit payment (photo proof; cash orders additionally capture bill breakdown).
- Receipt must show shop info, order number, delivery date/time, customer name + phone, delivery info, product photos, banner info (if funeral), product notes (if any), and total with delivery + tax broken out.

### Customers
Phone is the primary identifier (+ optional second phone), each with its own country dial code — defaults to USA (`+1`), with Mexico (`+52`) pinned alongside it and the full country list available (El Paso is a border city). Also: first/second/last name, client-since date (auto), email, company, notes, referral source. **Client category is system-only** (not customer-facing), tiered by order count: Silver (10+), Gold (20+), Diamond (30+).

### Products / Categories / Inventory
- Products have code, name, category (multi), up to 3 photos, size (L×W inches), price, description, site visibility, and a **recipe** (list of inventory items + quantities) used to build the arrangement.
- Categories: name, photo, visibility, product membership.
- Inventory: searchable by code/name, grouped by category, quantity is editable. Adding inventory captures category (Bases, flowers, Ribbons, others), size, unit (piece/roll/box/bunch/bag), units per purchase, price, derived unit price, notes, and provider.
- Zip codes: list of delivery zones with a price each (used by the order delivery-fee dropdown).

### Operational workflow
- **Making arrangements**: queue of orders sorted by nearest delivery date/time, showing product photo + recipe + notes. "Completed" button moves the order to `pending delivery`.
- **Deliveries**: shows only orders with a physical delivery (excludes pickup), sorted for the driver. Confirming a delivery requires name of recipient + photo proof, which marks the order `completed`.
- **Tasks**: ad-hoc to-dos with frequency (one time/monthly/yearly), due date, assignee (staff dropdown), and completed/pending views.
- **Dashboard**: today's + tomorrow's deliveries (earliest first), open tasks, reminders (customers whose birthday/anniversary order was delivered ~2 days before, one year prior), pending payments, and a quick expense-add.

### Admin (admin-role only)
- **Payment confirmation**: reconciles "submitted" payments (receipt + proof shown, ordered by cash/card/zelle/applepay/check) against a "payment confirmed" state; also surfaces orders with no submitted payment yet, with a snooze/reminder (next day / 1 week / 2 weeks / 1 month) that surfaces on the dashboard as a task.
- **Reports**: daily total; monthly total broken out by payment method (pre-tax) + total tax, new client count, top 3 products, month-over-month order comparison, monthly expenses, net profit margin, operating profit margin.
- **Expenses**: recurring/set expenses (weekly, monthly, etc.) with category (bills, payroll, rent, flowers, maintenance, marketing, misc, other), amount, description.
- **Shop config**: logo, name, address, website, phone(s), tax rate, hours of operation.
- **Users**: name, PIN, role, active/suspended toggle.

## Roles & permissions

| Role | Access |
|---|---|
| Admin | Everything |
| Office | Everything except the Admin tab |
| Florist | Tasks, deliveries, making arrangements, inventory |
| Driver | Tasks, deliveries, making arrangements, inventory |

Staff attribution on orders (`Assisted by`) requires selecting a user **and** entering their PIN.

## Design system

The `pos/` frontend follows a boutique, luxury-restraint design system. Tokens live in `pos/css/styles.css`; the brand mark is `pos/assets/logo-karels.png`.

### Content fundamentals

How Karel's staff copy reads across the POS:

- **Voice**: plain, operational, warm-professional. Written for busy florists and office staff, not customers. Short imperative labels: "Save order", "Submit payment", "Confirm delivery", "+ Add product".
- **Person**: neutral/system voice — no "I" or "you"; UI speaks in nouns and verbs ("Today's Deliveries", "Pending Payments", "Making arrangement").
- **Casing**: Title Case for page titles, card headers and nav ("Making Arrangements", "Zip Codes"). UPPERCASE + wide tracking for eyebrow labels, table headers and status pills. Sentence case for helper text and messages.
- **Status language**: fixed vocabulary — order status Making arrangement → Pending delivery → Completed (or Cancelled); payment Pending → Submitted → Confirmed; client tiers Silver / Gold / Diamond (system-only, never shown to customers).
- **Numbers & data**: money as `$84.00`; order numbers day-scoped `20260704-0001`; dates short ("Jul 4"); tax shown as `8.25%`.
- **Emoji**: none in the refreshed UI. The original used a 🌹; this system replaces decorative emoji with a floral glyph (❀ / ✿) or the logo. Keep emoji out of production copy.
- **Vibe**: calm, boutique, considered — "every arrangement, made by hand." Luxury restraint, not exclamation. Avoid marketing hype in an internal tool.

### Visual foundations

- **Palette**: warm Ivory (`#FAF8F5`) grounds every surface. Forest green (`#304437`) is the primary ink, brand color and navigation rail. Sage (`#A8B8A5`) is the soft secondary (badges, avatars, quiet fills). Dusty rose (`#D8A6A4`) is the warm accent. Gold (`#C9A96E`) is the premium accent — primary CTAs, active nav pill, hero numerals.
- **Type**: Cormorant Garamond (high-contrast serif) for display, headings, card titles and KPI numerals — often italic for warmth. Manrope for all body, UI, tables and data. Serif carries elegance; sans carries legibility. Eyebrow labels are 11px uppercase, tracking 0.18em.
- **Spacing**: 4px base scale (`--space-1`…`--space-9`). Generous 24–32px gutters between cards; 16–20px inside them.
- **Backgrounds**: flat ivory — no gradients in content (the only gradient is the forest login backdrop). No busy textures or patterns. Imagery, where present, is warm and natural (flowers); product thumbnails are soft rounded squares. Use real product photos or color-chip placeholders — no stock photography ships with this system.
- **Corners**: soft. `--radius-sm` 6px (fields, small buttons), `--radius-md` 10px (thumbnails), `--radius-lg` 16px (cards), `--radius-xl` 24px (login card), pill for badges/avatars.
- **Cards**: ivory surface, 1px hairline border (`--stone-300`), `--radius-lg`, soft warm-tinted shadow (`--shadow-sm`, forest-toned, never gray/blue). Optional serif title header separated by a hairline. No colored left-border accents.
- **Elevation**: three soft shadows (sm/md/lg) all tinted with forest green at low alpha for warmth. Modals use `--shadow-lg` over a translucent forest scrim with a light backdrop blur.
- **Borders**: 1px hairlines in warm stone, never pure black/gray. Table rows divide with the same hairline.
- **Buttons**: filled forest primary; filled gold for premium/confirm actions; outlined secondary; borderless ghost; outlined danger (muted brick red). Radius 6px, semibold Manrope. Hover = slight darken (via ramp), press = same (no scale). Focus ring is gold at 40% (`--shadow-focus`).
- **Motion**: restrained. 0.15s ease color/background transitions on interactive elements. No bounces, no infinite loops, minimal movement — boutique calm.
- **Transparency/blur**: used sparingly — only the modal scrim (`rgba(forest,.45)` + 2px blur). Content is otherwise opaque.
- **Layout**: fixed 248px forest sidebar, 64px top bar, scrolling content capped at 1200px. Dashboard uses a 2-column (1.4 / 1) card grid; forms use a content + sticky summary split.

### Iconography

The source POS uses no icon font or SVG icon set — it leans on Unicode glyphs, text labels and one 🌹 emoji. This system keeps that lightweight approach:

- Unicode glyphs as quiet nav/marker icons (❖ ✎ ❋ ♥ ✿ ➤ ✓ ❀ ▤ ⌖ $ ▦ ⚙), rendered in the sidebar at low emphasis. They are decorative, not a committed icon language.
- Floral glyph ❀ / ✿ stands in for empty states and product thumbnails.
- No emoji in production copy (the original 🌹 is replaced by the logo/glyph).
- If a real icon set is ever needed, add a CDN stroke-icon library (e.g. Lucide) and keep it monoline to match the delicate serif — but confirm with the owner first, since the source defines none. Flagged as an intentional gap, not an existing asset.
- Logo: `pos/assets/logo-karels.png` — the real mark. Never redraw or recolor it; place it on white or forest. It is the one brand asset shipped with this system.

### Reference component/token catalog

The palette, type and spacing above originated in a standalone design-system export (namespace `KarelSFlowersDesignSystem_b74332`) that models the same POS as reusable pieces. Those pieces don't exist as files in this repo — `pos/` is plain HTML/CSS/JS, not React — but they're useful as a naming/behavior reference when restyling or extending `pos/`:

- **Forms**: Button (forest primary, gold, secondary, ghost, danger; sizes sm/md/lg), Input (labeled text field with hint/error), Select (labeled dropdown with custom chevron), Textarea, Checkbox (inline-label boolean toggle).
- **Data**: Badge (status/tier pill in 8 tones), Card (content panel with optional serif title header), StatCard (KPI tile with serif numeral), DataTable (list table for orders/products/customers), EmptyState (centered placeholder for empty lists).
- **App shell**: Sidebar (forest nav rail with grouped links + gold active pill), Topbar (serif page title + staff chip), PageHeader (in-content title + toolbar), Modal (centered dialog over a forest scrim).
- The export's own UI kit (`ui_kits/pos/`) is an interactive click-through of the same flows (sign in → Dashboard → Orders → Create Order → Products) built in React/JSX with mock data — a design reference only, not code to import here.
- The export's foundation specimens (brand, colors, type, spacing) and its token files (`tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/fonts.css`) map onto the CSS custom properties defined at the top of `pos/css/styles.css`.

### Fonts

Cormorant Garamond and Manrope are loaded from Google Fonts via CDN. These are the exact requested families (not substitutes), loaded over the network rather than bundled as binaries. If fully self-hosted/offline font files are needed, vendor them into `pos/assets/` with local `@font-face` rules.
