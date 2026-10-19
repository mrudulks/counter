import { Router } from 'express';
import { z } from 'zod';
import { Table, TABLE_STATUSES } from '../models/Table';
import { Order } from '../models/Order';
import { authorize, restaurantIdOf } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { HttpError } from '../utils/HttpError';

// Mounted at /api/restaurants/:restaurantId/tables
const router = Router({ mergeParams: true });

const tableSchema = z.object({
  name: z.string().trim().min(1),
  seats: z.number().int().min(1).optional(),
  status: z.enum(TABLE_STATUSES).optional(),
});

router.get('/', async (req, res) => {
  const restaurant = restaurantIdOf(req);
  const [tables, openOrders] = await Promise.all([
    Table.find({ restaurant }).collation({ locale: 'en', numericOrdering: true }).sort({ name: 1 }).lean(),
    Order.find({ restaurant, status: 'open', table: { $ne: null } }, 'table orderNumber total').lean(),
  ]);
  const orderByTable = new Map(openOrders.map((o) => [String(o.table), o]));
  res.json(tables.map((t) => ({ ...t, currentOrder: orderByTable.get(String(t._id)) ?? null })));
});

router.post('/', authorize('superadmin', 'admin'), validateBody(tableSchema), async (req, res) => {
  const table = await Table.create({ ...req.body, restaurant: restaurantIdOf(req) });
  res.status(201).json(table);
});

router.patch(
  '/:tableId',
  authorize('superadmin', 'admin', 'staff'),
  validateBody(tableSchema.partial()),
  async (req, res) => {
    // Staff may only change the status (e.g. mark reserved)
    const update = req.user!.role === 'staff' ? { status: req.body.status } : req.body;
    const table = await Table.findOneAndUpdate(
      { _id: req.params.tableId, restaurant: restaurantIdOf(req) },
      update,
      { new: true, runValidators: true },
    );
    if (!table) throw new HttpError(404, 'Table not found');
    res.json(table);
  },
);

router.delete('/:tableId', authorize('superadmin', 'admin'), async (req, res) => {
  const open = await Order.exists({ table: req.params.tableId, status: 'open' });
  if (open) throw new HttpError(400, 'Table has an open order');
  const table = await Table.findOneAndDelete({ _id: req.params.tableId, restaurant: restaurantIdOf(req) });
  if (!table) throw new HttpError(404, 'Table not found');
  res.json({ message: 'Table deleted' });
});

export default router;
