export type Role = 'superadmin' | 'admin' | 'staff' | 'kitchen';

export interface Restaurant {
  _id: string;
  name: string;
  address: string;
  phone: string;
  currency: string;
  taxPercent: number;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  restaurant: Restaurant | string | null;
  isActive: boolean;
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  image: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface Table {
  _id: string;
  name: string;
  seats: number;
  status: TableStatus;
  currentOrder?: { _id: string; orderNumber: number; total: number } | null;
}

export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderStatus = 'open' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'upi';

export interface OrderItem {
  _id: string;
  menuItem: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
  status: ItemStatus;
}

export interface Order {
  _id: string;
  orderNumber: number;
  type: 'dine-in' | 'takeaway';
  table: { _id: string; name: string; seats: number } | null;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  notes: string;
  createdBy: { _id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  revenueToday: number;
  ordersToday: number;
  revenueYesterday: number;
  ordersYesterday: number;
  openOrders: number;
  topItems: { name: string; quantity: number }[];
}
