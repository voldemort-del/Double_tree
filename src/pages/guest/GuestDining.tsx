import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribeRealtimeEvents } from '@/realtime/bus';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getMenuItems } from '@/services/menuService';
import { getCart, saveCart, type CartItem } from '@/services/cartService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { RouterLink } from '@/utils/router';
import type { MenuItem } from '@/types';
import {
  UtensilsCrossed,
  Wine,
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  ArrowRight,
  Check,
} from 'lucide-react';

const HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';

const RESTAURANT_CATEGORIES = ['All', 'Starters', 'Mains', 'Desserts'];
const BAR_CATEGORIES = ['All', 'Cocktails', 'Wine', 'Beer', 'Soft Drinks', 'Hot Drinks'];

export function GuestDining() {
  const { session, guestData } = useAuth();
  const [activeVenue, setActiveVenue] = useState<'restaurant' | 'bar'>('restaurant');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  // Portion counts chosen before adding to cart (defaults to 1 per item)
  const [portions, setPortions] = useState<Record<string, number>>({});

  // Resolve effective guestId so adding to cart never silently fails
  const effectiveGuestId = useMemo(() => {
    if (guestData?.guestId) return guestData.guestId;
    if (session && session.type === 'guest' && 'guestId' in session) {
      return (session as any).guestId;
    }
    return 'g-1';
  }, [guestData?.guestId, session]);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMenuItems(HOTEL_ID);
      setItems(data);
    } catch (err) {
      console.error('[GuestDining] Error loading menu:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCart(getCart(effectiveGuestId));
  }, [effectiveGuestId]);

  useEffect(() => {
    loadMenu();

    const unsubBus = subscribeRealtimeEvents((event) => {
      if (event.type === 'menu:updated') {
        loadMenu();
      }
    });

    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('guest-dining-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
            loadMenu();
          })
          .subscribe();
      } catch (err) {
        console.warn('[GuestDining] Realtime channel setup failed:', err);
      }
    }

    return () => {
      unsubBus();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadMenu]);

  const venueItems = items.filter((i) => i.venue === activeVenue);
  const categories = activeVenue === 'bar' ? BAR_CATEGORIES : RESTAURANT_CATEGORIES;

  const filteredItems = venueItems.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Portion helpers
  const getPortion = (id: string) => portions[id] || 1;

  const adjustPortion = (id: string, delta: number) => {
    setPortions((prev) => {
      const cur = prev[id] || 1;
      const next = Math.max(1, Math.min(20, cur + delta));
      return { ...prev, [id]: next };
    });
  };

  // Add selected portions of an item to the cart
  const handleAddToCart = (item: MenuItem) => {
    const qtyToAdd = getPortion(item.id);
    const existing = cart.find((entry) => entry.item.id === item.id);
    const newQuantity = (existing ? existing.quantity : 0) + qtyToAdd;

    const nextCart = existing
      ? cart.map((entry) => (entry.item.id === item.id ? { ...entry, quantity: newQuantity } : entry))
      : [...cart, { item, quantity: newQuantity }];

    setCart(nextCart);
    saveCart(effectiveGuestId, nextCart);

    // Reset portion selector back to 1
    setPortions((prev) => ({ ...prev, [item.id]: 1 }));

    toast.show({
      type: 'success',
      title: 'Added to Cart',
      message: `${qtyToAdd} × ${item.name} (€${(item.price * qtyToAdd).toFixed(2)}) added to room cart.`,
      duration: 3500,
    });
  };

  // Directly update in-cart quantity (+ or -)
  const updateInCartQty = (item: MenuItem, newQty: number) => {
    let nextCart: CartItem[];
    if (newQty <= 0) {
      nextCart = cart.filter((entry) => entry.item.id !== item.id);
      toast.show({
        type: 'info',
        title: 'Removed from Cart',
        message: `${item.name} removed from your order.`,
        duration: 2500,
      });
    } else {
      nextCart = cart.map((entry) =>
        entry.item.id === item.id ? { ...entry, quantity: newQty } : entry,
      );
    }
    setCart(nextCart);
    saveCart(effectiveGuestId, nextCart);
  };

  const totalCartCount = useMemo(() => cart.reduce((sum, e) => sum + e.quantity, 0), [cart]);
  const totalCartPrice = useMemo(() => cart.reduce((sum, e) => sum + e.item.price * e.quantity, 0), [cart]);

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 md:pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950 p-5 sm:p-8 text-white shadow-xl border border-amber-500/20">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-sm border border-amber-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            <span>DoubleTree Malta Culinary & Bar Experience</span>
          </div>
          <h1 className="mt-3 font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            Restaurant & Bar Menus
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Explore authentic Mediterranean gastronomy at Azure Restaurant & Terrace or handcrafted
            cocktails and Maltese vintages at The Moorings & Pool Bar. Select your portions and order for direct room delivery.
          </p>
        </div>

        <RouterLink
          to="/guest/cart"
          className="relative z-10 mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md transition-all hover:scale-105 active:scale-95"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>View Cart</span>
          {totalCartCount > 0 && (
            <span className="flex h-5 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-bold text-amber-300">
              {totalCartCount}
            </span>
          )}
        </RouterLink>
        <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Venue Switcher Tabs */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <button
          onClick={() => {
            setActiveVenue('restaurant');
            setActiveCategory('All');
          }}
          className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3 px-3 sm:py-3.5 sm:px-4 text-xs sm:text-sm font-semibold transition-all shadow-sm ${
            activeVenue === 'restaurant'
              ? 'bg-slate-900 text-amber-300 ring-2 ring-amber-500/50 shadow-md'
              : 'bg-[#1a1916] text-stone-300 hover:bg-[#23211c] border border-stone-800'
          }`}
        >
          <UtensilsCrossed className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>Azure Restaurant & Kitchen Dining</span>
        </button>

        <button
          onClick={() => {
            setActiveVenue('bar');
            setActiveCategory('All');
          }}
          className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3 px-3 sm:py-3.5 sm:px-4 text-xs sm:text-sm font-semibold transition-all shadow-sm ${
            activeVenue === 'bar'
              ? 'bg-slate-900 text-amber-300 ring-2 ring-amber-500/50 shadow-md'
              : 'bg-[#1a1916] text-stone-300 hover:bg-[#23211c] border border-stone-800'
          }`}
        >
          <Wine className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>The Moorings & Pool Bar</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#1a1916] p-3.5 rounded-xl border border-stone-800 shadow-sm">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search dish or beverage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-800 bg-stone-900/90 pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:bg-stone-900 transition-colors"
          />
        </div>
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 text-stone-400">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-xs font-medium">Loading live menu...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-800 bg-[#1a1916] p-8 text-center">
          <UtensilsCrossed className="h-8 w-8 text-stone-600 mb-2" />
          <p className="text-sm font-semibold text-stone-300">No items found</p>
          <p className="text-xs text-stone-500 mt-1">Try another category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const inCartEntry = cart.find((e) => e.item.id === item.id);
            const inCartQty = inCartEntry?.quantity ?? 0;
            const portionCount = getPortion(item.id);

            return (
              <div
                key={item.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-[#1a1916] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                  item.available
                    ? inCartQty > 0
                      ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'border-stone-800 hover:border-amber-500/40'
                    : 'border-stone-800/60 opacity-60'
                }`}
              >
                {/* Image & Badges */}
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        item.available ? '' : 'grayscale'
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-900 to-stone-800">
                      {activeVenue === 'bar' ? (
                        <Wine className="h-10 w-10 text-stone-600" />
                      ) : (
                        <UtensilsCrossed className="h-10 w-10 text-stone-600" />
                      )}
                    </div>
                  )}

                  {/* Price Tag */}
                  <div className="absolute right-2.5 top-2.5 rounded-lg bg-amber-500 px-2.5 py-1 text-sm font-bold text-slate-950 shadow-md backdrop-blur-sm">
                    €{item.price.toFixed(2)}
                  </div>

                  {/* Room Service Pill */}
                  {item.availableForRoomService && (
                    <div className="absolute left-2.5 top-2.5 inline-flex items-center rounded-md bg-blue-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm shadow-sm">
                      Room Delivery
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {item.category}
                    </span>
                    <h3 className="mt-0.5 font-semibold text-white text-base group-hover:text-amber-200 transition-colors">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-stone-300 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Action & Portion Controls */}
                  <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {item.available ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Sold Out
                          </span>
                        )}
                      </div>

                      {inCartQty > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <Check className="h-3 w-3" />
                          {inCartQty} in cart
                        </span>
                      )}
                    </div>

                    {item.available ? (
                      inCartQty > 0 ? (
                        /* In-Cart Portion Adjuster */
                        <div className="flex items-center justify-between rounded-xl bg-stone-900 border border-amber-500/40 p-1.5 shadow-sm">
                          <button
                            onClick={() => updateInCartQty(item, inCartQty - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700 hover:text-white active:scale-95 transition-all"
                            title="Decrease portion"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="text-center px-2">
                            <span className="text-xs font-bold text-amber-300">{inCartQty} portion{inCartQty > 1 ? 's' : ''}</span>
                            <span className="text-[10px] text-stone-400 block leading-tight">
                              Total €{(item.price * inCartQty).toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => updateInCartQty(item, inCartQty + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-95 transition-all shadow-sm"
                            title="Increase portion"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        /* Not In Cart: Portion Picker + Add Button */
                        <div className="flex items-center gap-2">
                          {/* Portion count stepper (1, 2, 3...) */}
                          <div className="flex items-center rounded-xl bg-stone-900 border border-stone-700/80 p-1">
                            <button
                              onClick={() => adjustPortion(item.id, -1)}
                              disabled={portionCount <= 1}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:text-white disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                              title="Decrease portions"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-white min-w-[24px] text-center" title="Portions">
                              {portionCount}
                            </span>
                            <button
                              onClick={() => adjustPortion(item.id, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:text-white transition-colors"
                              title="Increase portions"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Add to Cart button */}
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition-all shadow-md active:scale-95"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>
                              Add {portionCount > 1 ? `(${portionCount})` : ''} · €{(item.price * portionCount).toFixed(2)}
                            </span>
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="py-2 text-center text-xs text-stone-500 italic bg-stone-900/40 rounded-xl border border-stone-800">
                        Item currently unavailable
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar when items are in cart */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-16 md:bottom-6 inset-x-3 sm:inset-x-auto sm:right-28 z-40 animate-slide-up">
          <RouterLink
            to="/guest/cart"
            className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950 px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-2xl border border-amber-500/40 hover:border-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md flex-shrink-0">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 border border-amber-400 text-[10px] font-bold text-amber-300">
                  {totalCartCount}
                </span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-medium text-amber-300">
                  {totalCartCount} portion{totalCartCount > 1 ? 's' : ''} in room cart
                </p>
                <p className="text-sm font-bold text-white">
                  Total: €{totalCartPrice.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-3.5 py-2 rounded-xl shadow-sm transition-colors">
              <span>Checkout</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </RouterLink>
        </div>
      )}
    </div>
  );
}
