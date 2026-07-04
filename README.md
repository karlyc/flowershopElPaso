# 🌹 Karel's Flowers — POS

Backend: Node.js + Express + PostgreSQL + Prisma. Frontend (`pos/`): plain HTML/CSS/vanilla JS.

---

## Project Structure

```
flowershopElPaso/
├── prisma/
│   ├── schema.prisma      # Database models
│   └── seed.js            # Initial data (admin staff, settings, category)
├── src/
│   ├── index.js           # App entry point
│   ├── db/
│   │   └── prisma.js      # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.js        # JWT auth + role guards
│   │   └── upload.js      # Multer photo/proof upload config
│   ├── routes/
│   │   ├── auth.js               # POST /login, GET /me, PUT /pin
│   │   ├── staff.js              # Staff management (admin only)
│   │   ├── clients.js            # Client lookup, create, update
│   │   ├── categories.js         # Category CRUD
│   │   ├── products.js           # Product CRUD, photos, recipe
│   │   ├── inventory.js          # Inventory CRUD + quantity edits
│   │   ├── zipCodes.js           # Delivery zone pricing
│   │   ├── orders.js             # Order CRUD, status, submit payment
│   │   ├── tasks.js              # Task CRUD + complete
│   │   ├── makingArrangements.js # Arrangement-building queue
│   │   ├── deliveries.js         # Assign driver, confirm delivery
│   │   ├── dashboard.js          # Today/tomorrow, tasks, reminders, pending payments
│   │   ├── payments.js           # Admin payment confirmation workflow
│   │   ├── reports.js            # Daily / monthly / range reports
│   │   ├── expenditures.js       # Expense tracking
│   │   └── settings.js           # Shop info & tax rate (singleton)
│   └── utils/
│       ├── orderNumber.js  # Day-scoped sequential order numbers
│       └── clientTier.js   # Silver/Gold/Diamond tier from order count
├── pos/                    # Staff POS frontend — see "Frontend" section below
└── .env.example
```

---

## Quick Setup (Local)

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 3. Push schema to database
npm run db:push

# 4. Seed initial data (admin staff, settings, starter category)
npm run db:seed

# 5. Start dev server
npm run dev
```

The seed script creates an admin staff record with PIN `1234` — change it via `PUT /api/auth/pin` immediately after first login.

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** service to the project — Railway auto-sets `DATABASE_URL`
4. Add the remaining env vars (`JWT_SECRET`, `CORS_ORIGIN`) in Railway's Variables tab
5. Set the build/start commands (or a Railway `Procfile`/`railway.json`) to run `npm run db:push` once, then `npm start`
6. Railway auto-deploys on every push to main

---

## Frontend — POS staff app (`pos/`)

Plain HTML/CSS/vanilla JS (ES modules), no build step, no framework — deploys as-is to any static host.

**Run locally:**
```bash
cd pos
python3 -m http.server 8080   # or: npx serve
# open http://localhost:8080
```
`pos/js/config.js` auto-points at `http://localhost:3000/api` when served from `localhost`.

**Deploy to Cloudflare Pages:**
1. Push this repo to GitHub
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect repo
3. Build settings: no build command, output directory `pos`
4. After the Railway backend is live, edit `pos/js/config.js` and replace `REPLACE-WITH-YOUR-RAILWAY-DOMAIN` with your actual Railway domain, then redeploy
5. Add the Pages domain to the backend's `CORS_ORIGIN` env var on Railway

**Structure:**
```
pos/
├── index.html         # login screen + app shell (sidebar/topbar/content)
├── css/styles.css
└── js/
    ├── config.js       # API base URL per environment
    ├── api.js          # fetch wrapper (auth header, JSON, 401 handling)
    ├── state.js         # signed-in staff (localStorage-backed)
    ├── router.js         # hash router with :param support
    ├── nav.js            # sidebar structure, gated by role
    ├── format.js         # money/date/text formatting helpers
    ├── main.js            # bootstrap: login flow, sidebar, route wiring
    └── views/              # one render function per screen (dashboard, orderForm,
                             # orders, customers, makingArrangements, deliveries, tasks,
                             # categories, products, inventory, zipCodes, admin/*)
```

Not yet built: a separate public/customer-facing website (ordering, marketing) — only the internal staff app exists so far.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET  | `/api/auth/staff` | Active staff `{ id, name }` roster for the login screen (no auth required) |
| POST | `/api/auth/login` | `{ staffId, pin }` → JWT token |
| GET  | `/api/auth/me` | Current staff info |
| PUT  | `/api/auth/pin` | Change PIN |

### Staff (admin only to create/edit)
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/staff` | List staff (any authenticated user — used by dropdowns) |
| POST | `/api/staff` | Create staff |
| PUT | `/api/staff/:id` | Edit name/role/PIN |
| POST | `/api/staff/:id/verify-pin` | `{ pin }` → `{ valid }`, used to attribute "assisted by" on an order |
| PATCH | `/api/staff/:id/active` | Suspend / restore access |

### Clients
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/clients?search=` | Search by phone or name |
| GET | `/api/clients/:id` | Detail + order history |
| POST | `/api/clients` | Create |
| PUT | `/api/clients/:id` | Update |

### Catalog
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET/POST/PUT/DELETE | `/api/categories` | Category CRUD |
| GET/POST/PUT/DELETE | `/api/products` | Product CRUD (multipart: `photo1`, `photo2`, `photo3`) |
| PUT | `/api/products/:id/recipe` | Replace recipe (`{ items: [{ inventoryItemId, quantity, notes }] }`) |
| GET/POST/PUT/DELETE | `/api/inventory` | Inventory CRUD |
| PATCH | `/api/inventory/:id/quantity` | Quick quantity edit |
| GET/POST/PUT/DELETE | `/api/zip-codes` | Delivery zone pricing |

### Orders
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/orders` | Filters: `search`, `orderStatus`, `paymentStatus`, `date` |
| GET | `/api/orders/:id` | Detail |
| GET | `/api/orders/:id/receipt` | Order + shop info for the printed receipt |
| POST | `/api/orders` | Create order (client, items, delivery, payment, message, occasion) |
| PUT | `/api/orders/:id` | Edit order |
| PATCH | `/api/orders/:id/status` | Update `orderStatus` |
| POST | `/api/orders/:id/submit-payment` | Multipart: `proof` photo (+ `cashBillBreakdown` for cash) |
| DELETE | `/api/orders/:id` | Cancel (admin only) |

**Order status flow**: `MAKING_ARRANGEMENT` → `PENDING_DELIVERY` → `COMPLETED` (or `CANCELLED`).
**Payment status flow**: `PENDING` → `SUBMITTED` (proof uploaded) → `CONFIRMED` (admin approved).

### Operational workflow
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/making-arrangements` | Queue sorted by nearest delivery |
| PATCH | `/api/making-arrangements/:orderId/complete` | Moves order to `PENDING_DELIVERY` |
| GET | `/api/deliveries` | Pending physical deliveries (excludes pickup) |
| GET | `/api/deliveries/assigned/:staffId` | A driver's assigned deliveries |
| PATCH | `/api/deliveries/:orderId/assign` | `{ staffId }` |
| POST | `/api/deliveries/:orderId/confirm` | Multipart: `receivedByName` + `photo` — marks `COMPLETED` |
| GET/POST/PUT/PATCH/DELETE | `/api/tasks` | Task CRUD + `/complete` |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/dashboard` | Combined payload: today/tomorrow deliveries, tasks, reminders, pending payments |
| GET | `/api/dashboard/deliveries/today` \| `/tomorrow` | Same lists individually |
| GET | `/api/dashboard/tasks` | Incomplete tasks due today or undated |
| GET | `/api/dashboard/reminders` | Birthday/anniversary orders whose anniversary is in 2 days |
| GET | `/api/dashboard/pending-payments` | Orders without a confirmed payment |

### Admin (admin only)
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/payments/submitted` | Awaiting confirmation, ordered cash → card → zelle → cashapp → check |
| PATCH | `/api/payments/:orderId/confirm` | Mark payment confirmed |
| GET | `/api/payments/not-submitted` | Today's orders with no payment submitted |
| GET | `/api/payments/pending` | No submitted payment for over a day |
| PATCH | `/api/payments/:orderId/reminder` | `{ snooze: next_day\|one_week\|two_weeks\|one_month }` — also creates a dashboard task |
| GET | `/api/reports/daily?date=` | Daily total |
| GET | `/api/reports/monthly?year=&month=` | Sales by payment method, tax, new clients, top 3 products, MoM comparison, expenses, margins |
| GET | `/api/reports/range?from=&to=` | Date range total |
| GET/POST/PUT/DELETE | `/api/expenditures` | Expense tracking |
| GET/PUT | `/api/settings` | Shop info, tax rate, hours of operation |

---

## Roles & permissions

| Role | Access |
|---|---|
| ADMIN | Everything |
| OFFICE | Everything except `/api/payments`, `/api/reports`, `/api/staff` write access, and `/api/settings` writes |
| FLORIST | Tasks, deliveries, making arrangements, inventory |
| DRIVER | Tasks, deliveries, making arrangements, inventory |

Every route requires `Authorization: Bearer <token>` except `POST /api/auth/login`.

## Business rules

- **Tax**: default rate 1.0825, configurable via `/api/settings`; zeroed when an order's `taxExempt` flag is set.
- **Client tier** (`REGULAR`/`SILVER`/`GOLD`/`DIAMOND`) is system-only, derived from `orderCount` at 10/20/30 orders — not shown to the customer.
- **Phone country codes**: `Client.phoneCode`/`phone2Code` default to `+1` (USA); the POS phone inputs pin USA/Mexico at the top of the picker with the full country list underneath (`pos/js/countries.js`).
- **Order numbers** are day-scoped and sequential, e.g. `20260703-0001`.
