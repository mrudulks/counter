import { Router } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { MenuItem } from '../models/MenuItem';
import { Table } from '../models/Table';
import { Order } from '../models/Order';
import { authorize, restaurantAccess } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { HttpError } from '../utils/HttpError';

const router = Router();

const restaurantSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().min(1).max(5).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  const user = req.user!;
  const filter = user.role === 'superadmin' ? {} : { _id: user.restaurant };
  const restaurants = await Restaurant.find(filter).sort({ createdAt: -1 });
  res.json(restaurants);
});

router.post('/', authorize('superadmin'), validateBody(restaurantSchema), async (req, res) => {
  const restaurant = await Restaurant.create(req.body);
  res.status(201).json(restaurant);
});

router.get('/:restaurantId', restaurantAccess, async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.restaurantId);
  if (!restaurant) throw new HttpError(404, 'Restaurant not found');
  res.json(restaurant);
});

router.patch(
  '/:restaurantId',
  authorize('superadmin', 'admin'),
  restaurantAccess,
  validateBody(restaurantSchema.partial()),
  async (req, res) => {
    // Only superadmin may activate/deactivate a restaurant
    if (req.user!.role !== 'superadmin') delete req.body.isActive;
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.restaurantId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!restaurant) throw new HttpError(404, 'Restaurant not found');
    res.json(restaurant);
  },
);

router.delete('/:restaurantId', authorize('superadmin'), async (req, res) => {
  const id = req.params.restaurantId;
  const restaurant = await Restaurant.findByIdAndDelete(id);
  if (!restaurant) throw new HttpError(404, 'Restaurant not found');
  await Promise.all([
    User.deleteMany({ restaurant: id }),
    MenuItem.deleteMany({ restaurant: id }),
    Table.deleteMany({ restaurant: id }),
    Order.deleteMany({ restaurant: id }),
  ]);
  res.json({ message: 'Restaurant deleted' });
});

export default router;
