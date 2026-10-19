/**
 * Seeds a demo restaurant with users, menu and tables.
 * Safe to re-run: skips if the demo restaurant already exists.
 */
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { ensureSuperadmin } from './utils/seedSuperadmin';
import { Restaurant } from './models/Restaurant';
import { User } from './models/User';
import { MenuItem } from './models/MenuItem';
import { Table } from './models/Table';

const DEMO_NAME = 'Demo Bistro';

async function seed() {
  await connectDB();
  await ensureSuperadmin();

  if (await Restaurant.exists({ name: DEMO_NAME })) {
    console.log(`"${DEMO_NAME}" already exists — nothing to do.`);
    return;
  }

  const restaurant = await Restaurant.create({
    name: DEMO_NAME,
    address: '12 MG Road, Bengaluru',
    phone: '+91 98765 43210',
    currency: 'INR',
    taxPercent: 5,
  });

  const users = [
    { name: 'Asha Admin', email: 'admin@demo.local', role: 'admin' },
    { name: 'Sam Staff', email: 'staff@demo.local', role: 'staff' },
    { name: 'Kiran Kitchen', email: 'kitchen@demo.local', role: 'kitchen' },
  ] as const;
  for (const u of users) {
    await User.create({ ...u, password: 'Password@123', restaurant: restaurant._id });
  }

  await MenuItem.insertMany(
    [
      { name: 'Paneer Tikka', category: 'Starters', price: 240, isVeg: true },
      { name: 'Chicken 65', category: 'Starters', price: 280, isVeg: false },
      { name: 'Veg Spring Rolls', category: 'Starters', price: 180, isVeg: true },
      { name: 'Butter Chicken', category: 'Mains', price: 360, isVeg: false },
      { name: 'Dal Makhani', category: 'Mains', price: 260, isVeg: true },
      { name: 'Veg Biryani', category: 'Mains', price: 280, isVeg: true },
      { name: 'Butter Naan', category: 'Breads', price: 60, isVeg: true },
      { name: 'Garlic Naan', category: 'Breads', price: 70, isVeg: true },
      { name: 'Gulab Jamun', category: 'Desserts', price: 120, isVeg: true },
      { name: 'Masala Chai', category: 'Beverages', price: 50, isVeg: true },
      { name: 'Fresh Lime Soda', category: 'Beverages', price: 90, isVeg: true },
    ].map((m) => ({ ...m, restaurant: restaurant._id })),
  );

  await Table.insertMany(
    Array.from({ length: 8 }, (_, i) => ({ name: `T${i + 1}`, seats: i < 4 ? 2 : 4, restaurant: restaurant._id })),
  );

  console.log(`Seeded "${DEMO_NAME}". Logins (password: Password@123):`);
  users.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}`));
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
