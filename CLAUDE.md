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
Phone is the primary identifier (+ optional second phone). Also: first/second/last name, client-since date (auto), email, company, notes, referral source. **Client category is system-only** (not customer-facing), tiered by order count: Silver (10+), Gold (20+), Diamond (30+).

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
