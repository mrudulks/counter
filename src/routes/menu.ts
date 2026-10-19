import { Router } from 'express';
import { z } from 'zod';
import { MenuItem } from '../models/MenuItem';
import { authorize, restaurantIdOf } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { HttpError } from '../utils/HttpError';

// Mounted at /api/restaurants/:restaurantId/menu
const router = Router({ mergeParams: true });

const menuItemSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  category: z.string().trim().min(1),
  price: z.number().min(0),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

router.get('/', async (req, res) => {
  const items = await MenuItem.find({ restaurant: restaurantIdOf(req) }).sort({ category: 1, name: 1 });
  res.json(items);
});

router.post('/', authorize('superadmin', 'admin'), validateBody(menuItemSchema), async (req, res) => {
  const item = await MenuItem.create({ ...req.body, restaurant: restaurantIdOf(req) });
  res.status(201).json(item);
});

router.patch(
  '/:itemId',
  authorize('superadmin', 'admin'),
  validateBody(menuItemSchema.partial()),
  async (req, res) => {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.itemId, restaurant: restaurantIdOf(req) },
      req.body,
      { new: true, runValidators: true },
    );
    if (!item) throw new HttpError(404, 'Menu item not found');
    res.json(item);
  },
);

router.delete('/:itemId', authorize('superadmin', 'admin'), async (req, res) => {
  const item = await MenuItem.findOneAndDelete({ _id: req.params.itemId, restaurant: restaurantIdOf(req) });
  if (!item) throw new HttpError(404, 'Menu item not found');
  res.json({ message: 'Menu item deleted' });
});

export default router;
