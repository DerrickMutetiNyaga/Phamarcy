# Pharmacy Management System

Point of sale, inventory with batch and expiry tracking, purchases, prescriptions, customers, reports and user management for a single retail pharmacy.

Built with Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, MongoDB + Mongoose, JWT sessions in httpOnly cookies, and Cloudinary for images.

## Setup

Requirements: Node.js 20.12 or newer, and a MongoDB **replica set** (MongoDB Atlas works out of the box; for a local server start `mongod --replSet rs0` and run `rs.initiate()` once). Sales, refunds, purchases and stock adjustments use multi-document transactions, which MongoDB only supports on replica sets.

```bash
npm install
# fill in .env (see below)
npm run seed     # optional: loads demo data (erases the database first)
npm run dev      # http://localhost:3000
```

Production: `npm run build && npm start`.

## Environment variables

All keys live in `.env` at the project root (`.env.example` lists the same keys). The app refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing.

| Key | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string, including the database name. Required. |
| `JWT_SECRET` | Secret for signing session tokens, at least 32 characters. Required. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Used server-side for prescription and medicine image uploads. Without them the rest of the app works, and uploads return a clear error. |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app, e.g. `http://localhost:3000`. |
| `NODE_ENV` | `development` or `production`. Session cookies are marked `Secure` in production. |

## Seed data

`npm run seed` wipes every collection in the configured database and loads: 3 users, 3 categories, 3 suppliers, 14 medicines, 18 batches with a spread of expiry dates (including already-expired and soon-to-expire stock), 5 purchases (paid, partly paid and unpaid), 5 customers, 6 prescriptions and 11 sales from the past two weeks, one of them refunded. Sample prescription images are uploaded to Cloudinary. If Cloudinary is not configured, the prescriptions are skipped, and so are prescription-only items in the seeded sales (leaving 7 sales instead of 11). With `NODE_ENV=production` the script refuses to run unless you pass `--force`.

Default logins:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@pharmacy.com | Admin@123 |
| Pharmacist | pharmacist@pharmacy.com | Pharma@123 |
| Cashier | cashier@pharmacy.com | Cashier@123 |

Change these passwords in Settings, Users after first sign-in.

## Assumptions

- **Roles.** Admin has full access. Pharmacist handles the dashboard, inventory, purchases, suppliers, prescriptions and reports, but not the till. Cashier handles POS, customers and sees only their own sales. Access is enforced on the server for every page and API route (`src/proxy.ts`, the Next.js 16 name for middleware), and each session is checked against the database, so deactivating a user signs them out right away.
- **Cashiers and prescriptions.** Cashiers can upload a prescription at the counter and attach one that is already verified. Only a pharmacist or admin can verify or reject it.
- **Refunds.** Only an admin can refund, and a refund covers the whole invoice. Every item goes back into the batch it was sold from. Partial returns are not supported.
- **Currency.** Amounts are in Kenyan shillings and shown as `Ksh 1,250.00`. The symbol can be changed in Settings.
- **Pricing.** Prices are entered excluding tax. Tax is worked out per medicine on the amount left after discounts. Line discounts come off first; a bill-level discount is then split across lines in proportion to their value. Amounts are rounded to 2 decimals at each calculation step.
- **Stock.** Stock is held per batch. A sale takes from the batch that expires first (FEFO) and can split one cart line across several batches. Expired batches are never sold and don't count towards sellable stock or stock valuation. They show up in the expiry report until written off with a stock adjustment.
- **Low stock.** A medicine is low on stock when its sellable quantity is at or below its reorder level; this includes out-of-stock items. New medicines start with the default reorder level from Settings.
- **Purchases.** Receiving a purchase adds stock to the batch with the same batch number, or creates the batch if it doesn't exist yet. The same batch number with a different expiry date is rejected. Payment status (paid, partly paid, unpaid) is derived from the amount paid, and further payments can be recorded later. Purchases can't be deleted, since they are part of the stock history.
- **Deleting records.** Medicines, customers, suppliers and categories that have history (sales, batches, purchases, linked medicines) can't be deleted. Mark a medicine as inactive instead.
- **Numbering.** Invoices are numbered `INV-000001`, `INV-000002` and so on, and purchases `PO-000001`, from atomic counters.
- **Invoices** print on A5 by default, with A4 available. Page margins are set to zero so browsers leave out their own header and footer.
- **Dates and time zone.** "Today" on the dashboard and date-range filters use the server's time zone, so set `TZ` on the server if it differs from the pharmacy's.
- **Units** are limited to tablet, strip, bottle and syrup, and stock is counted in the medicine's unit.
- **Images** must be JPG, PNG or WEBP, 5 MB at most, and are stored in Cloudinary under `pharmacy/medicines` and `pharmacy/prescriptions`.
- **Sessions** last 12 hours. Login is limited to 5 failed attempts per email and IP address every 15 minutes. That limit is kept in memory, so it applies per server instance.
