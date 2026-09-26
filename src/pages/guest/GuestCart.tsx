import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createRequest } from '@/services/requestService';
import { clearCart, getCart, saveCart, type CartItem } from '@/services/cartService';
import { navigate, RouterLink } from '@/utils/router';

export function GuestCart() {
  const { session, guestData } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (guestData?.guestId) setCart(getCart(guestData.guestId));
  }, [guestData?.guestId]);

  const itemCount = useMemo(() => cart.reduce((total, entry) => total + entry.quantity, 0), [cart]);
  const total = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
    [cart],
  );

  if (session?.type !== 'guest' || !guestData) return null;

  const updateQuantity = (itemId: string, quantity: number) => {
    const next = quantity > 0
      ? cart.map((entry) => entry.item.id === itemId ? { ...entry, quantity } : entry)
      : cart.filter((entry) => entry.item.id !== itemId);
    setCart(next);
    saveCart(guestData.guestId, next);
  };

  const checkout = async () => {
    if (cart.length === 0 || checkingOut) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const lines = cart.map(({ item, quantity }) => `${quantity} × ${item.name} (€${(item.price * quantity).toFixed(2)})`);
      const venues = [...new Set(cart.map(({ item }) => item.venue === 'bar' ? 'bar' : 'restaurant'))];
      const request = await createRequest({
        hotelId: guestData.hotelId,
        guestId: guestData.guestId,
        stayId: guestData.stayId,
        roomId: guestData.roomId,
        title: `Dining order: ${itemCount} item${itemCount === 1 ? '' : 's'}`,
        description: `Guest placed a combined ${venues.join(' and ')} order for delivery to room ${session.roomNumber}:\n${lines.join('\n')}\nTotal: €${total.toFixed(2)}`,
        category: 'Room Service',
        priority: 'Normal',
        source: 'concierge',
      });
      if (!request) {
        setCheckoutError('We could not place your order. Please try again.');
        return;
      }
      clearCart(guestData.guestId);
      setCart([]);
      setCheckoutComplete(true);
    } catch (error) {
      console.error('Failed to check out dining cart:', error);
      setCheckoutError('We could not place your order. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (checkoutComplete) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-slate-800">Order sent to the kitchen</h1>
        <p className="mt-2 text-sm text-slate-500">Your complete dining order has been sent to the hotel team for delivery to Room {session.roomNumber}.</p>
        <div className="mt-6 flex justify-center gap-3">
          <RouterLink to="/guest/requests" className="rounded-lg bg-sea-600 px-4 py-2 text-sm font-semibold text-white">Track order</RouterLink>
          <RouterLink to="/guest/dining" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Back to menu</RouterLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/guest/dining')} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Back to dining">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-slate-800">Your dining cart</h1>
          <p className="text-sm text-slate-500">{itemCount} item{itemCount === 1 ? '' : 's'} ready for one checkout</p>
        </div>
      </div>

      {checkoutError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{checkoutError}</div>}

      {cart.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-300 bg-white p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-500">Add dishes and drinks from the menu to order them together.</p>
          <RouterLink to="/guest/dining" className="mt-5 inline-flex rounded-lg bg-sea-600 px-4 py-2 text-sm font-semibold text-white">Browse menu</RouterLink>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {cart.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-sand-200 bg-white p-3 shadow-sm">
                <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover bg-sand-100" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">€{item.price.toFixed(2)} each · {item.venue === 'bar' ? 'Bar' : 'Restaurant'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.id, quantity - 1)} className="rounded-md border border-slate-200 p-1.5 text-slate-600" aria-label={`Decrease ${item.name}`}><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-5 text-center text-sm font-semibold">{quantity}</span>
                  <button onClick={() => updateQuantity(item.id, quantity + 1)} className="rounded-md border border-slate-200 p-1.5 text-slate-600" aria-label={`Increase ${item.name}`}><Plus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => updateQuantity(item.id, 0)} className="ml-1 p-1.5 text-red-500" aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="h-fit rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800">Order summary</h2>
            <div className="mt-4 flex justify-between text-sm text-slate-600"><span>Items</span><span>{itemCount}</span></div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-lg font-bold text-slate-900"><span>Total</span><span>€{total.toFixed(2)}</span></div>
            <button onClick={checkout} disabled={checkingOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-sea-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {checkingOut && <Loader2 className="h-4 w-4 animate-spin" />} Checkout together
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
