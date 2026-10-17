import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
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

  // Fallback for demo mode
  const effectiveGuest = useMemo(() => {
    if (guestData) return guestData;
    if (session && session.type === 'guest') {
      return {
        guestId: (session as any).guestId || 'g-1',
        name: session.name || 'Alex Morgan',
        roomNumber: (session as any).roomNumber || '408',
        roomId: 'r-408',
        hotelId: 'a0000000-0000-0000-0000-000000000001',
        stayId: 's-1',
      };
    }
    return null;
  }, [guestData, session]);

  useEffect(() => {
    if (effectiveGuest?.guestId) setCart(getCart(effectiveGuest.guestId));
  }, [effectiveGuest?.guestId]);

  const itemCount = useMemo(() => cart.reduce((total, entry) => total + entry.quantity, 0), [cart]);
  const total = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
    [cart],
  );

  if (!effectiveGuest) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-stone-800 bg-[#1a1916] p-8 text-center text-white">
        <ShoppingBag className="mx-auto h-12 w-12 text-stone-600 mb-3" />
        <h2 className="text-lg font-bold">Please log in as a guest</h2>
        <p className="text-xs text-stone-400 mt-1">Dining orders require an active guest room reservation.</p>
        <RouterLink to="/guest/login" className="mt-4 inline-block rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950">
          Go to Guest Login
        </RouterLink>
      </div>
    );
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    const next = quantity > 0
      ? cart.map((entry) => (entry.item.id === itemId ? { ...entry, quantity } : entry))
      : cart.filter((entry) => entry.item.id !== itemId);
    setCart(next);
    saveCart(effectiveGuest.guestId, next);
  };

  const checkout = async () => {
    if (cart.length === 0 || checkingOut) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const lines = cart.map(
        ({ item, quantity }) => `${quantity} × ${item.name} (€${(item.price * quantity).toFixed(2)})`,
      );
      const venues = [...new Set(cart.map(({ item }) => (item.venue === 'bar' ? 'bar' : 'restaurant')))];
      const request = await createRequest({
        hotelId: effectiveGuest.hotelId,
        guestId: effectiveGuest.guestId,
        stayId: effectiveGuest.stayId,
        roomId: effectiveGuest.roomId,
        title: `Dining order: ${itemCount} portion${itemCount === 1 ? '' : 's'}`,
        description: `Guest placed a combined ${venues.join(' and ')} order for delivery to room ${effectiveGuest.roomNumber}:\n${lines.join('\n')}\nTotal: €${total.toFixed(2)}`,
        category: 'Room Service',
        priority: 'Normal',
        source: 'concierge',
      });
      if (!request) {
        setCheckoutError('We could not place your order. Please try again.');
        return;
      }
      clearCart(effectiveGuest.guestId);
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
      <div className="mx-auto max-w-xl rounded-2xl border border-emerald-500/30 bg-[#1a1916] p-8 text-center text-white shadow-xl animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-white">
          Order Sent to the Kitchen & Bar
        </h1>
        <p className="mt-2 text-sm text-stone-300 leading-relaxed max-w-md mx-auto">
          Your dining order has been received by Azure Restaurant & Moorings Bar for delivery to Room {effectiveGuest.roomNumber}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <RouterLink
            to="/guest/requests"
            className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition-all hover:scale-105 active:scale-95"
          >
            Track Order Status
          </RouterLink>
          <RouterLink
            to="/guest/dining"
            className="rounded-xl border border-stone-700 bg-stone-900 hover:bg-stone-800 px-5 py-2.5 text-sm font-semibold text-stone-200 transition-colors"
          >
            Back to Menus
          </RouterLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/guest/dining')}
          className="rounded-xl border border-stone-800 bg-[#1a1916] p-2 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          aria-label="Back to dining"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Room Dining Cart
          </h1>
          <p className="text-xs sm:text-sm text-stone-400">
            {itemCount} portion{itemCount === 1 ? '' : 's'} ready for delivery to Room {effectiveGuest.roomNumber}
          </p>
        </div>
      </div>

      {checkoutError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
          {checkoutError}
        </div>
      )}

      {cart.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-800 bg-[#1a1916] p-10 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-stone-600 mb-3" />
          <h2 className="text-base font-semibold text-white">Your cart is empty</h2>
          <p className="mt-1 text-xs sm:text-sm text-stone-400 max-w-sm mx-auto">
            Explore authentic Mediterranean gastronomy and artisan cocktails from our live menus.
          </p>
          <RouterLink
            to="/guest/dining"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-all hover:scale-105 active:scale-95 shadow-md"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Browse Menus</span>
          </RouterLink>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {/* Cart Items List */}
          <div className="space-y-3">
            {cart.map(({ item, quantity }) => (
              <div
                key={item.id}
                className="flex items-center gap-3 sm:gap-4 rounded-2xl border border-stone-800 bg-[#1a1916] p-3.5 shadow-sm transition-all hover:border-stone-700"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover bg-stone-900 flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-stone-900 flex-shrink-0 text-stone-600">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {item.venue === 'bar' ? 'Bar & Lounge' : 'Azure Restaurant'}
                  </span>
                  <h3 className="font-semibold text-white text-sm sm:text-base truncate">{item.name}</h3>
                  <p className="text-xs text-stone-400">
                    €{item.price.toFixed(2)} each · <span className="font-semibold text-stone-300">€{(item.price * quantity).toFixed(2)} total</span>
                  </p>
                </div>

                {/* Portion Stepper */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className="flex items-center rounded-xl bg-stone-900 border border-stone-700 p-0.5 sm:p-1">
                    <button
                      onClick={() => updateQuantity(item.id, quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 active:scale-95 transition-all"
                      aria-label={`Decrease portion of ${item.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-xs sm:text-sm font-bold text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 active:scale-95 transition-all"
                      aria-label={`Increase portion of ${item.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => updateQuantity(item.id, 0)}
                    className="p-2 text-stone-500 hover:text-rose-400 transition-colors"
                    title={`Remove ${item.name}`}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary Card */}
          <div className="h-fit rounded-2xl border border-stone-800 bg-[#1a1916] p-5 sm:p-6 shadow-md space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide border-b border-stone-800 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2 text-xs sm:text-sm text-stone-400">
              <div className="flex justify-between">
                <span>Room Number</span>
                <span className="font-semibold text-white">Room {effectiveGuest.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Guest Name</span>
                <span className="font-semibold text-white">{effectiveGuest.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Portions</span>
                <span className="font-semibold text-white">{itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Service</span>
                <span className="font-semibold text-emerald-400">Complimentary</span>
              </div>
            </div>

            <div className="border-t border-stone-800 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-medium text-stone-300">Total Charged to Room</span>
              <span className="text-xl font-bold text-amber-400">€{total.toFixed(2)}</span>
            </div>

            <button
              onClick={checkout}
              disabled={checkingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-3 px-4 text-sm font-bold text-slate-950 transition-all shadow-md active:scale-98 disabled:opacity-60"
            >
              {checkingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting to Kitchen...</span>
                </>
              ) : (
                <>
                  <span>Order Now for Room {effectiveGuest.roomNumber}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
