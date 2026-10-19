import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { authorize, restaurantIdOf } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { HttpError } from '../utils/HttpError';

// Mounted at /api/restaurants/:restaurantId/users
const router = Router({ mergeParams: true });

const restaurantRole = z.enum(['admin', 'staff', 'kitchen']);

router.use(authorize('superadmin', 'admin'));

router.get('/', async (req, res) => {
  const users = await User.find({ restaurant: restaurantIdOf(req) }).sort({ role: 1, name: 1 });
  res.json(users);
});

router.post(
  '/',
  validateBody(
    z.object({
      name: z.string().trim().min(1),
      email: z.email(),
      password: z.string().min(6),
      role: restaurantRole,
    }),
  ),
  async (req, res) => {
    const user = await User.create({ ...req.body, restaurant: restaurantIdOf(req) });
    res.status(201).json(user);
  },
);

router.patch(
  '/:userId',
  validateBody(
    z.object({
      name: z.string().trim().min(1).optional(),
      email: z.email().optional(),
      password: z.string().min(6).optional(),
      role: restaurantRole.optional(),
      isActive: z.boolean().optional(),
    }),
  ),
  async (req, res) => {
    const user = await User.findOne({ _id: req.params.userId, restaurant: restaurantIdOf(req) });
    if (!user) throw new HttpError(404, 'User not found');
    if (user.id === req.user!.id && (req.body.isActive === false || (req.body.role && req.body.role !== user.role))) {
      throw new HttpError(400, 'You cannot disable yourself or change your own role');
    }
    Object.assign(user, req.body);
    await user.save();
    res.json(user);
  },
);

router.delete('/:userId', async (req, res) => {
  if (req.params.userId === req.user!.id) throw new HttpError(400, 'You cannot delete yourself');
  const user = await User.findOneAndDelete({ _id: req.params.userId, restaurant: restaurantIdOf(req) });
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ message: 'User deleted' });
});

export default router;
