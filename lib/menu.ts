import type { Href } from 'expo-router';
import {
  Boxes,
  BookOpen,
  ClipboardList,
  Factory,
  FilePlus,
  FolderTree,
  HandCoins,
  Package,
  PackageCheck,
  PackagePlus,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  Warehouse,
  type LucideIcon,
} from 'lucide-react-native';
import type { UserProfileResponse } from '../api/types';
import {
  canCreatePurchaseRequest,
  canDraftOrder,
  canLogPurchase,
  canSetSpendingLimits,
} from '../auth/permissions';

export type MenuEntry = {
  key: string;
  label: string;
  Icon: LucideIcon;
  href: Href;
  /** Who may use it, when this person may not: the tile shows locked. */
  lockedFor?: string;
};

/**
 * The Menu tab's two grids, also the source of Home's shortcuts. Every entry
 * is listed for every role; one this person can't use carries `lockedFor`
 * (decided 15 Nov 2026: limits are shown, never hidden). The gates mirror
 * auth/permissions.ts; the server still enforces each one.
 */
export function procurementMenu(user: UserProfileResponse | null): MenuEntry[] {
  return [
    {
      key: 'request',
      label: 'New request',
      Icon: FilePlus,
      href: '/(app)/purchase-requests/create',
      lockedFor: canCreatePurchaseRequest(user) ? undefined : 'a Store Manager or above, an Admin or Procurement',
    },
    { key: 'requests', label: 'Requests', Icon: ClipboardList, href: '/(app)/purchase-requests' },
    {
      key: 'limits',
      label: 'Spending limits',
      Icon: ShieldCheck,
      href: '/(app)/purchase-authorizations/create',
      lockedFor: canSetSpendingLimits(user) ? undefined : "the store's Owner",
    },
    {
      key: 'buy',
      label: 'Buy elsewhere',
      Icon: ShoppingBag,
      href: '/(app)/realisasi/create',
      lockedFor: canLogPurchase(user) ? undefined : 'a Store Manager or above, or Procurement',
    },
    {
      key: 'order',
      label: 'Order from HQ',
      Icon: Truck,
      href: '/(app)/purchase-orders/create',
      lockedFor: canDraftOrder(user) ? undefined : 'a Store Manager or above, or Procurement',
    },
    { key: 'receipts', label: 'Goods receipts', Icon: PackageCheck, href: '/(app)/goods-receipts' },
    { key: 'reimbursements', label: 'Reimbursements', Icon: HandCoins, href: '/(app)/reimbursements' },
    { key: 'expenses', label: 'Expenses', Icon: Receipt, href: '/(app)/expenses' },
    { key: 'suppliers', label: 'Suppliers', Icon: Factory, href: '/(app)/suppliers' },
  ];
}

/** `atHq`: stock across stores and the HQ catalog are HQ's own screens. */
export function inventoryMenu(atHq: boolean): MenuEntry[] {
  return [
    { key: 'stock', label: 'Stock', Icon: Boxes, href: '/(app)/inventory/stock' },
    { key: 'restock', label: 'Restock', Icon: PackagePlus, href: '/(app)/inventory/restock' },
    { key: 'adjustments', label: 'Adjustments', Icon: SlidersHorizontal, href: '/(app)/inventory/adjustments' },
    { key: 'items', label: 'Items', Icon: Package, href: '/(app)/inventory/items' },
    { key: 'categories', label: 'Categories', Icon: FolderTree, href: '/(app)/inventory/categories' },
    {
      key: 'across',
      label: 'Stock across stores',
      Icon: Warehouse,
      href: '/(app)/inventory/across',
      lockedFor: atHq ? undefined : 'people signed in at HQ',
    },
    {
      key: 'catalog',
      label: 'HQ catalog',
      Icon: BookOpen,
      href: '/(app)/inventory/catalog',
      lockedFor: atHq ? undefined : 'people signed in at HQ',
    },
  ];
}
