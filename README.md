# Counter

A restaurant POS for one or many restaurants. Floor staff take orders at the table, the kitchen works a live ticket rail, and admins run menus, tables and teams. Every change reaches every screen instantly over WebSockets.

| App | Path | Stack | Local port |
|---|---|---|---|
| API + realtime | [`apps/api`](apps/api) | Express 5, TypeScript, MongoDB (Mongoose), Socket.IO | 4500 |
| Web | [`apps/web`](apps/web) | Next.js 16, React 19, Tailwind CSS 4 | 8000 |

## Run locally

Needs Node 20+ and MongoDB on `localhost:27017`.

```bash
npm run install:all
cp apps/api/.env.example apps/api/.env          # then set JWT_SECRET
cp apps/web/.env.example apps/web/.env.local
npm run seed                                    # optional demo restaurant
npm run dev:api                                 # terminal 1
npm run dev:web                                 # terminal 2 → http://localhost:8000
```

The API creates a superadmin from `SUPERADMIN_*` in `apps/api/.env` on first start.
`npm run seed` adds **Demo Bistro** with `admin@demo.local`, `staff@demo.local` and `kitchen@demo.local` (password `Password@123`) — for local use only.

## Roles

- **Superadmin** — creates restaurants and can work inside any of them
- **Admin** — runs one restaurant: menu, tables, team, settings, today's takings
- **Staff** — takes orders, serves ready dishes, takes payment
- **Kitchen** — moves dishes from *Start* to *Mark ready* on the ticket rail

## Deploy on Railway

Create one Railway project from this repo with three services:

1. **MongoDB** — from Railway's MongoDB template.
2. **api** — GitHub repo `counter`, **Root Directory** `apps/api`, **Watch Paths** `apps/api/**`.
   Variables: `MONGO_URL=${{MongoDB.MONGO_URL}}`, `MONGO_DB_NAME=restaurant_pos`, `JWT_SECRET`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAME`, `CORS_ORIGIN=https://<web domain>`. Generate a domain.
3. **web** — same repo, **Root Directory** `apps/web`, **Watch Paths** `apps/web/**`.
   Variable: `NEXT_PUBLIC_API_URL=https://<api domain>/api` (baked in at build — redeploy after changing it). Generate a domain.

Keep the API at one replica unless you add the Socket.IO Redis adapter.

See [`apps/api/README.md`](apps/api/README.md) for the REST and socket API and [`apps/web/README.md`](apps/web/README.md) for screens and the order flow.
