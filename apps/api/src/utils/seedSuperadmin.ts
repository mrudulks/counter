import { env } from '../config/env';
import { User } from '../models/User';

export async function ensureSuperadmin(): Promise<void> {
  if (await User.exists({ role: 'superadmin' })) return;
  await User.create({ ...env.superadmin, role: 'superadmin', restaurant: null });
  console.log(`Default superadmin created: ${env.superadmin.email}`);
}
