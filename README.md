# FoodWise – Stop Wasting Food in College

Full-stack MVP that connects campus cafeterias, hostel messes and restaurants with students and NGOs so surplus food gets eaten instead of thrown away.

**Stack:** React 19 + TypeScript + Tailwind CSS v4 + Recharts + Framer Motion (client) · Node.js + Express 5 + Prisma 6 + PostgreSQL + JWT (server) · Cloudinary image storage (local-disk fallback).

## Quick start

```bash
npm run install:all        # install server + client deps
npm run db                 # terminal 1: starts a local PostgreSQL on :5433 (embedded, no install needed)
npm run setup              # terminal 2: create tables + load sample data
npm run dev                # API on :4000, web app on http://localhost:5173
```

**Before a demo / presentation:** the sample listings have deadlines a few hours after they were loaded, so after a day they will all have expired. Refresh them (with `npm run db` still running) using:

```bash
npm run demo:refresh       # reloads fresh demo data (also removes accounts you created)
```

If `npm run db` says the port is already in use, a database is already running – just continue with `npm run dev`.

Already have Postgres? Point `DATABASE_URL` in `server/.env` at it and skip `npm run db`.

### Demo accounts (password `password123`)

| Role | Email |
|---|---|
| Provider (Central Cafeteria) | `cafeteria@foodwise.demo` |
| Provider (Hostel 7 Mess) | `hostel@foodwise.demo` |
| Student | `student@foodwise.demo` |
| NGO (Annapurna Food Bank) | `ngo@foodwise.demo` |

The login page has one-click buttons for these.

### Cloudinary

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `server/.env`. Without them, uploads are stored in `server/uploads/` and served at `/uploads/*`. `GET /api/health` reports which storage is active.

## The journey

1. **Provider lists surplus** – photo, quantity + unit, kg per unit, category, dietary, preparation time, pickup location, collection deadline.
2. **Students / NGOs discover** – search, category + diet filters, sort by deadline / newest / quantity.
3. **Request** – students up to 3 servings per request, NGOs in bulk. One open request per listing per user.
4. **Provider approves** – stock is reserved atomically (`remaining` decrements in a conditional update, so two approvals can never oversell). Pending requests that no longer fit are auto-declined. Declining or revoking an approval (or the requester cancelling) returns stock.
5. **Pickup** – requester shows a 4-digit code; provider enters it to confirm collection. When everything is collected the listing becomes `COMPLETED`.
6. **Impact** – meals, kg, CO₂e (2.5 kg CO₂e per kg food), pickups and vendors update immediately; leaderboard ranks providers and rescuers.

**Expiry & reminders:** a background sweep (every 60 s, and on reads at most every 10 s) closes listings past their deadline, expires their open requests, notifies everyone, and sends a "pickup deadline approaching" reminder to approved requesters within 60 minutes of the deadline.

## API overview

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET/PATCH | `/api/auth/me` | signed in |
| GET | `/api/listings?q&category&dietary&sort&status&mine` | public |
| GET | `/api/listings/:id` | public (owner sees all requests) |
| POST / PATCH | `/api/listings`, `/api/listings/:id` | provider (owner) |
| POST | `/api/listings/:id/cancel` | provider (owner) |
| POST | `/api/requests` | student, NGO |
| GET | `/api/requests/mine`, `/api/requests/incoming` | requester / provider |
| POST | `/api/requests/:id/approve` · `reject` · `collect` | provider (owner) |
| POST | `/api/requests/:id/cancel` | requester |
| GET/POST | `/api/notifications`, `/:id/read`, `/read-all` | signed in |
| GET | `/api/impact?scope=global|me&weeks=` | public / signed in |
| GET | `/api/leaderboard?period=week|month|all` | public |
| POST | `/api/uploads` (multipart `image`) | provider |
