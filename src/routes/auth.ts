import { Router } from 'express';
import { z } from 'zod';
import { User, UserDoc } from '../models/User';
import { authenticate, signToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { HttpError } from '../utils/HttpError';

const router = Router();

router.post(
  '/login',
  validateBody(z.object({ email: z.email(), password: z.string().min(1) })),
  async (req, res) => {
    const { email, password } = req.body;
    const user = (await User.findOne({ email: email.toLowerCase() }).select('+password')) as UserDoc | null;
    if (!user || !(await user.comparePassword(password))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    if (!user.isActive) throw new HttpError(403, 'Your account is disabled');

    await user.populate('restaurant', 'name currency taxPercent isActive');
    res.json({ token: signToken(user.id), user });
  },
);

router.get('/me', authenticate, async (req, res) => {
  await req.user!.populate('restaurant', 'name currency taxPercent isActive');
  res.json({ user: req.user });
});

router.patch(
  '/me/password',
  authenticate,
  validateBody(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) })),
  async (req, res) => {
    const user = (await User.findById(req.user!.id).select('+password')) as UserDoc;
    if (!(await user.comparePassword(req.body.currentPassword))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  },
);

export default router;
