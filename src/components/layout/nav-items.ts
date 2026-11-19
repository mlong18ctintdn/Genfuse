import {
  BellRing,
  Crown,
  Gamepad2,
  Home,
  Languages,
  MessageCircleHeart,
  Settings,
  ShieldAlert,
  TreeDeciduous,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  /** Full key in messages/*.json */
  labelKey: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (max 5). */
  primary?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/home', labelKey: 'nav.home', icon: Home, primary: true },
  { href: '/companion', labelKey: 'nav.companion', icon: MessageCircleHeart, primary: true },
  { href: '/memory-tree', labelKey: 'nav.memoryTree', icon: TreeDeciduous, primary: true },
  { href: '/translator', labelKey: 'nav.translator', icon: Languages, primary: true },
  { href: '/scam-shield', labelKey: 'nav.scamShield', icon: ShieldAlert, primary: true },
  { href: '/reminders', labelKey: 'nav.reminders', icon: BellRing },
  { href: '/games', labelKey: 'nav.games', icon: Gamepad2 },
  { href: '/premium', labelKey: 'nav.upgrade', icon: Crown },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];
