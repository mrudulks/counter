import type { LucideIcon } from 'lucide-react';
import { Armchair, BookOpen, ChefHat, LayoutDashboard, LayoutGrid, ReceiptText, Settings, Store, Users } from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /** Needs an active restaurant (superadmin must pick one first) */
  scoped: boolean;
}

export const NAV: NavItem[] = [
  { href: '/restaurants', icon: Store, label: 'Restaurants', roles: ['superadmin'], scoped: false },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/floor', icon: LayoutGrid, label: 'Floor', roles: ['superadmin', 'admin', 'staff'], scoped: true },
  { href: '/orders', icon: ReceiptText, label: 'Orders', roles: ['superadmin', 'admin', 'staff'], scoped: true },
  { href: '/kitchen', icon: ChefHat, label: 'Kitchen', roles: ['superadmin', 'admin', 'kitchen'], scoped: true },
  { href: '/manage/menu', icon: BookOpen, label: 'Menu', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/manage/tables', icon: Armchair, label: 'Tables', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/manage/team', icon: Users, label: 'Team', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/manage/settings', icon: Settings, label: 'Settings', roles: ['superadmin', 'admin'], scoped: true },
];
