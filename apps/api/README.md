# Restaurant POS — backend

Express 5 + TypeScript + MongoDB (Mongoose) REST API for a multi-restaurant POS.

## Setup

```bash
npm install
cp .env.example .env     # set JWT_SECRET, MONGO_URI, superadmin credentials
npm run dev              # http://localhost:4500
npm run seed             # optional: demo restaurant, team, menu and tables
```

On every start the server creates the **default superadmin** from `SUPERADMIN_*` env vars if no superadmin exists
(defaults: `superadmin@pos.local` / `SuperAdmin@123` — change it after first sign-in).

Seeded demo logins (password `Password@123`): `admin@demo.local`, `staff@demo.local`, `kitchen@demo.local`.

Scripts: `dev` (watch), `build`, `start`, `seed`, `typecheck`.

## Roles

| Role         | Scope            | Permissions |
|--------------|------------------|-------------|
| `superadmin` | all restaurants  | Everything; only role that can create/delete restaurants |
| `admin`      | own restaurant   | Restaurant settings, menu, tables, team (admin/staff/kitchen), orders, stats |
| `staff`      | own restaurant   | Create orders, add items, void/edit pending items, mark ready items served, take payment, cancel orders not yet cooking, reserve tables |
| `kitchen`    | own restaurant   | Move items `pending → preparing → ready` |

## API

All routes except login need `Authorization: Bearer <token>`. Restaurant-scoped routes check the user belongs to `:rid` (superadmin passes).

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| PATCH | `/api/auth/me/password` | any |
| GET | `/api/restaurants` | any (non-superadmin sees own) |
| POST | `/api/restaurants` | superadmin |
| GET / PATCH | `/api/restaurants/:rid` | member / admin+ |
| DELETE | `/api/restaurants/:rid` | superadmin (cascades) |
| GET POST PATCH DELETE | `/api/restaurants/:rid/users[/:id]` | admin+ |
| GET | `/api/restaurants/:rid/menu` | member |
| POST PATCH DELETE | `/api/restaurants/:rid/menu[/:id]` | admin+ |
| GET | `/api/restaurants/:rid/tables` | member (includes `currentOrder`) |
| POST DELETE | `/api/restaurants/:rid/tables[/:id]` | admin+ |
| PATCH | `/api/restaurants/:rid/tables/:id` | admin+, staff (status only) |
| GET | `/api/restaurants/:rid/orders?status=open,completed&from=&to=&table=` | member |
| GET | `/api/restaurants/:rid/orders/:id` | member |
| POST | `/api/restaurants/:rid/orders` `{type, table?, items:[{menuItem, quantity, notes?}]}` | staff, admin+ |
| POST | `/api/restaurants/:rid/orders/:id/items` `{items}` | staff, admin+ |
| PATCH | `/api/restaurants/:rid/orders/:id/items/:itemId` `{status?, quantity?, notes?}` | role-based transitions |
| POST | `/api/restaurants/:rid/orders/:id/items/status` `{itemIds, status}` | bulk version, same role rules |
| POST | `/api/restaurants/:rid/orders/:id/complete` `{paymentMethod: cash|card|upi}` | staff, admin+ |
| POST | `/api/restaurants/:rid/orders/:id/cancel` | staff (if nothing cooking), admin+ |
| GET | `/api/restaurants/:rid/orders/stats/summary` | admin+ |

### Order rules
- One open order per table; creating a dine-in order marks the table `occupied`, completing/cancelling frees it.
- Item name/price are snapshotted on the order; totals exclude cancelled items and apply the restaurant's `taxPercent`.
- An order can be paid only when every non-cancelled item is `served`.
- Order numbers are sequential per restaurant.

## Realtime (Socket.IO)

Socket.IO runs on the same port as the API. Connect with the JWT:

```js
const socket = io('http://localhost:4500', { auth: { token } });
socket.emit('restaurant:join', restaurantId); // superadmin only; others auto-join their restaurant
socket.on('order:event', ({ type, order, itemIds, actor }) => { ... });
```

Every order change is broadcast to everyone in that restaurant's room:

| `type` | When | `itemIds` |
|---|---|---|
| `created` | new order placed | — |
| `items-added` | another round sent to the kitchen | the new items |
| `items-updated` | item(s) started / ready / served / voided | the changed items |
| `completed` | order paid | — |
| `cancelled` | order cancelled | — |

`order` is the full populated order; `actor` is `{ id, name }` of whoever made the change.
