import { Request, Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Order, ITEM_STATUSES, PAYMENT_METHODS } from '../models/Order';
import { MenuItem } from '../models/MenuItem';
import { Table } from '../models/Table';
import { Restaurant } from '../models/Restaurant';
import { nextSequence } from '../models/Counter';
import { Role } from '../models/User';
import { authorize, restaurantIdOf } from '../middleware/auth';
import { validateBody, objectId } from '../middleware/validate';
import { HttpError } from '../utils/HttpError';
import { emitOrderEvent, OrderEventType } from '../realtime';

// Mounted at /api/restaurants/:restaurantId/orders
const router = Router({ mergeParams: true });

type ItemStatus = (typeof ITEM_STATUSES)[number];
type OrderDoc = NonNullable<Awaited<ReturnType<typeof Order.findOne>>>;

const orderItemInput = z.object({
  menuItem: objectId,
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

// Item status transitions each role may perform. Admins may set any status.
const TRANSITIONS: Partial<Record<Role, Partial<Record<ItemStatus, ItemStatus[]>>>> = {
  kitchen: { pending: ['preparing'], preparing: ['ready', 'pending'] },
  staff: { pending: ['cancelled'], ready: ['served'] },
};

const POPULATE = [
  { path: 'table', select: 'name seats' },
  { path: 'createdBy', select: 'name' },
];

async function resolveItems(restaurant: string, input: z.infer<typeof orderItemInput>[]) {
  const ids = [...new Set(input.map((i) => i.menuItem))];
  const menuItems = await MenuItem.find({ _id: { $in: ids }, restaurant });
  const byId = new Map(menuItems.map((m) => [m.id as string, m]));
  return input.map((i) => {
    const m = byId.get(i.menuItem);
    if (!m) throw new HttpError(400, 'One or more menu items were not found');
    if (!m.isAvailable) throw new HttpError(400, `${m.name} is currently unavailable`);
    return { menuItem: m._id, name: m.name, price: m.price, quantity: i.quantity, notes: i.notes ?? '' };
  });
}

async function recalculate(order: OrderDoc) {
  const restaurant = await Restaurant.findById(order.restaurant, 'taxPercent');
  const round = (n: number) => Math.round(n * 100) / 100;
  const subtotal = order.items
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  order.subtotal = round(subtotal);
  order.tax = round((subtotal * (restaurant?.taxPercent ?? 0)) / 100);
  order.total = round(order.subtotal + order.tax);
}

async function releaseTable(order: OrderDoc) {
  if (!order.table) return;
  const stillOpen = await Order.exists({ table: order.table, status: 'open', _id: { $ne: order._id } });
  if (!stillOpen) await Table.findByIdAndUpdate(order.table, { status: 'available' });
}

function assertTransition(role: Role, from: ItemStatus, to: ItemStatus) {
  const allowed = TRANSITIONS[role];
  if (allowed && !allowed[from]?.includes(to)) {
    throw new HttpError(403, `You cannot change an item from ${from} to ${to}`);
  }
}

/** Populates the order, broadcasts it to the restaurant's room and returns it for the response. */
async function publish(req: Request, type: OrderEventType, order: OrderDoc, itemIds?: string[]) {
  const populated = await order.populate(POPULATE);
  emitOrderEvent(order.restaurant, {
    type,
    order: populated.toJSON(),
    itemIds,
    actor: { id: req.user!.id, name: req.user!.name },
  });
  return populated;
}

async function findOpenOrder(restaurantId: string, orderId: string) {
  const order = await Order.findOne({ _id: orderId, restaurant: restaurantId });
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.status !== 'open') throw new HttpError(400, `Order is already ${order.status}`);
  return order;
}

router.get('/', async (req, res) => {
  const { status, from, to, table } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { restaurant: restaurantIdOf(req) };
  if (status) filter.status = { $in: status.split(',') };
  if (table) filter.table = table;
  if (from || to) {
    filter.createdAt = {
      ...(from && { $gte: new Date(from) }),
      ...(to && { $lte: new Date(to) }),
    };
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).populate(POPULATE);
  res.json(orders);
});

router.get('/:orderId', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, restaurant: restaurantIdOf(req) }).populate(
    POPULATE,
  );
  if (!order) throw new HttpError(404, 'Order not found');
  res.json(order);
});

router.post(
  '/',
  authorize('superadmin', 'admin', 'staff'),
  validateBody(
    z.object({
      type: z.enum(['dine-in', 'takeaway']).default('dine-in'),
      table: objectId.optional(),
      items: z.array(orderItemInput).min(1, 'Add at least one item'),
      notes: z.string().optional(),
    }),
  ),
  async (req, res) => {
    const restaurantId = restaurantIdOf(req);
    const { type, table: tableId, items, notes } = req.body;

    let table = null;
    if (type === 'dine-in') {
      if (!tableId) throw new HttpError(400, 'Select a table for dine-in orders');
      table = await Table.findOne({ _id: tableId, restaurant: restaurantId });
      if (!table) throw new HttpError(404, 'Table not found');
      if (await Order.exists({ table: table._id, status: 'open' })) {
        throw new HttpError(409, `${table.name} already has an open order — add items to it instead`);
      }
    }

    const order = new Order({
      restaurant: restaurantId,
      orderNumber: await nextSequence(`order:${restaurantId}`),
      type,
      table: table?._id ?? null,
      items: await resolveItems(restaurantId, items),
      notes: notes ?? '',
      createdBy: req.user!._id,
    });
    await recalculate(order);
    await order.save();
    if (table) await Table.findByIdAndUpdate(table._id, { status: 'occupied' });

    res.status(201).json(await publish(req, 'created', order));
  },
);

router.post(
  '/:orderId/items',
  authorize('superadmin', 'admin', 'staff'),
  validateBody(z.object({ items: z.array(orderItemInput).min(1) })),
  async (req, res) => {
    const restaurantId = restaurantIdOf(req);
    const order = await findOpenOrder(restaurantId, req.params.orderId as string);
    const before = order.items.length;
    order.items.push(...(await resolveItems(restaurantId, req.body.items)));
    await recalculate(order);
    await order.save();
    const added = order.items.slice(before).map((i) => String(i._id));
    res.json(await publish(req, 'items-added', order, added));
  },
);

router.patch(
  '/:orderId/items/:itemId',
  authorize('superadmin', 'admin', 'staff', 'kitchen'),
  validateBody(
    z.object({
      status: z.enum(ITEM_STATUSES).optional(),
      quantity: z.number().int().min(1).optional(),
      notes: z.string().optional(),
    }),
  ),
  async (req, res) => {
    const order = await findOpenOrder(restaurantIdOf(req), req.params.orderId as string);
    const item = order.items.id(req.params.itemId as string);
    if (!item) throw new HttpError(404, 'Order item not found');

    const role = req.user!.role as Role;
    const { status, quantity, notes } = req.body;

    if (status && status !== item.status) {
      assertTransition(role, item.status as ItemStatus, status);
      item.status = status;
    }

    if (quantity !== undefined || notes !== undefined) {
      if (role === 'kitchen') throw new HttpError(403, 'Kitchen staff cannot edit items');
      if (item.status !== 'pending') throw new HttpError(400, 'Only pending items can be edited');
      if (quantity !== undefined) item.quantity = quantity;
      if (notes !== undefined) item.notes = notes;
    }

    await recalculate(order);
    await order.save();
    res.json(await publish(req, 'items-updated', order, [String(item._id)]));
  },
);

// Move several items to the same status at once (e.g. kitchen "All ready", floor "Serve all")
router.post(
  '/:orderId/items/status',
  authorize('superadmin', 'admin', 'staff', 'kitchen'),
  validateBody(z.object({ itemIds: z.array(objectId).min(1), status: z.enum(ITEM_STATUSES) })),
  async (req, res) => {
    const order = await findOpenOrder(restaurantIdOf(req), req.params.orderId as string);
    const role = req.user!.role as Role;
    const { itemIds, status } = req.body as { itemIds: string[]; status: ItemStatus };

    const items = itemIds.map((id) => {
      const item = order.items.id(id);
      if (!item) throw new HttpError(404, 'Order item not found');
      return item;
    });
    const changing = items.filter((i) => i.status !== status);
    changing.forEach((i) => assertTransition(role, i.status as ItemStatus, status));
    changing.forEach((i) => (i.status = status));

    await recalculate(order);
    await order.save();
    res.json(await publish(req, 'items-updated', order, changing.map((i) => String(i._id))));
  },
);

router.post(
  '/:orderId/complete',
  authorize('superadmin', 'admin', 'staff'),
  validateBody(z.object({ paymentMethod: z.enum(PAYMENT_METHODS) })),
  async (req, res) => {
    const order = await findOpenOrder(restaurantIdOf(req), req.params.orderId as string);
    const active = order.items.filter((i) => i.status !== 'cancelled');
    if (active.length === 0) throw new HttpError(400, 'Order has no items — cancel it instead');
    const unserved = active.filter((i) => i.status !== 'served');
    if (unserved.length) {
      throw new HttpError(400, `${unserved.length} item(s) have not been served yet`);
    }
    order.status = 'completed';
    order.paymentMethod = req.body.paymentMethod;
    await order.save();
    await releaseTable(order);
    res.json(await publish(req, 'completed', order));
  },
);

router.post('/:orderId/cancel', authorize('superadmin', 'admin', 'staff'), async (req, res) => {
  const order = await findOpenOrder(restaurantIdOf(req), req.params.orderId as string);
  const cooking = order.items.some((i) => ['preparing', 'ready', 'served'].includes(i.status));
  if (cooking && req.user!.role === 'staff') {
    throw new HttpError(403, 'Items are already being prepared — ask an admin to cancel this order');
  }
  order.status = 'cancelled';
  order.items.forEach((i) => {
    if (i.status !== 'served') i.status = 'cancelled';
  });
  await recalculate(order);
  await order.save();
  await releaseTable(order);
  res.json(await publish(req, 'cancelled', order));
});

router.get('/stats/summary', authorize('superadmin', 'admin'), async (req, res) => {
  const restaurant = new Types.ObjectId(restaurantIdOf(req));
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [today, openOrders, topItems] = await Promise.all([
    Order.aggregate([
      { $match: { restaurant, status: 'completed', updatedAt: { $gte: startOfDay } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Order.countDocuments({ restaurant, status: 'open' }),
    Order.aggregate([
      { $match: { restaurant, status: 'completed', updatedAt: { $gte: startOfDay } } },
      { $unwind: '$items' },
      { $match: { 'items.status': { $ne: 'cancelled' } } },
      { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
  ]);

  res.json({
    revenueToday: today[0]?.revenue ?? 0,
    ordersToday: today[0]?.orders ?? 0,
    openOrders,
    topItems: topItems.map((t) => ({ name: t._id, quantity: t.quantity })),
  });
});

export default router;
