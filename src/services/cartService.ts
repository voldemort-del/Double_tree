import type { MenuItem } from '@/types';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

function storageKey(guestId: string): string {
  return `dth_guest_cart_${guestId}`;
}

export function getCart(guestId: string): CartItem[] {
  if (typeof window === 'undefined' || !guestId) return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey(guestId)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is CartItem =>
      Boolean(entry?.item?.id) && Number.isInteger(entry.quantity) && entry.quantity > 0,
    );
  } catch (error) {
    console.warn('Unable to read guest dining cart:', error);
    return [];
  }
}

export function saveCart(guestId: string, cart: CartItem[]): void {
  if (typeof window === 'undefined' || !guestId) return;
  try {
    window.sessionStorage.setItem(storageKey(guestId), JSON.stringify(cart));
  } catch (error) {
    console.warn('Unable to save guest dining cart:', error);
  }
}

export function clearCart(guestId: string): void {
  if (typeof window === 'undefined' || !guestId) return;
  window.sessionStorage.removeItem(storageKey(guestId));
}
