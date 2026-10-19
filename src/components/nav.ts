import type { Role } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  roles: Role[];
  /** Needs an active restaurant (superadmin must pick one first) */
  scoped: boolean;
}

export const NAV: NavItem[] = [
  { href: '/restaurants', label: 'Restaurants', roles: ['superadmin'], scoped: false },
  { href: '/dashboard', label: 'Today', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/floor', label: 'Floor', roles: ['superadmin', 'admin', 'staff'], scoped: true },
  { href: '/orders', label: 'Orders', roles: ['superadmin', 'admin', 'staff'], scoped: true },
  { href: '/kitchen', label: 'Kitchen', roles: ['superadmin', 'admin', 'kitchen'], scoped: true },
  { href: '/manage/menu', label: 'Menu', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/manage/tables', label: 'Tables', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/manage/team', label: 'Team', roles: ['superadmin', 'admin'], scoped: true },
  { href: '/manage/settings', label: 'Settings', roles: ['superadmin', 'admin'], scoped: true },
];
