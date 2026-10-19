# Counter — web app

Next.js 16 (App Router) + Tailwind CSS 4 client for the [Counter API](../api).

## Setup

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4500/api
npm run dev                  # http://localhost:8000
```

The backend must be running and its `CORS_ORIGIN` must include this app's URL.

## Screens by role

| Role        | Lands on      | Can use                                                                 |
|-------------|---------------|-------------------------------------------------------------------------|
| Super admin | `/restaurants`| Add/edit/delete restaurants, then "Work in this restaurant" to get every screen below for it |
| Admin       | `/dashboard`  | Today, Floor, Orders, Kitchen, Menu, Tables, Team, Settings             |
| Staff       | `/floor`      | Floor (tables + takeaway), order screen, Orders                         |
| Kitchen     | `/kitchen`    | Kitchen ticket rail                                                     |

## Order flow

1. **Floor** — tap a table (or *New takeaway*). A table with an open order opens that order.
2. **Order screen** — tap dishes to build a draft, add notes, *Send to kitchen*. Add more rounds anytime.
3. **Kitchen** — tickets drop onto the rail the instant they're sent. Tap a dish: *Start* → *Mark ready*, or use *Start all* / *All ready*.
4. **Order screen** — staff *Mark served* on ready items, then *Take payment* (cash / card / UPI). The table frees up.

Staff can void or change quantity only on items the kitchen hasn't started; cancelling an order that's already cooking needs an admin.

## Live notifications

The app keeps a Socket.IO connection to the API (sidebar shows *Live updates on*). Screens update the moment anyone changes an order, and teammates get a toast (plus a chime when someone needs to act):

| Event | Kitchen | Floor staff | Admin |
|---|---|---|---|
| New order / more items sent | toast + chime | — | toast + chime |
| Dishes ready | — | toast + chime | toast + chime |
| Item voided | toast | — | toast |
| Order paid / cancelled | toast | toast | toast |

You never get a toast for your own actions. Polling every 30 s remains as a fallback if the socket drops.
Set `NEXT_PUBLIC_SOCKET_URL` only if the socket server isn't on the API's origin.

## Structure

```
src/
  app/login/                 sign-in
  app/(app)/                 signed-in area (AppShell: auth guard + role nav)
    restaurants/ dashboard/ floor/ orders/ kitchen/ account/
    pos/table/[tableId]  pos/takeaway  pos/order/[orderId]
    manage/menu  manage/tables  manage/team  manage/settings
  components/                OrderScreen, Guard, AppShell, ui primitives, toast
  lib/                       api client, session (auth + active restaurant), useFetch, types
```
