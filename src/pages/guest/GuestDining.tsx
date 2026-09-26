import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getMenuItems } from '@/services/menuService';
import { getCart, saveCart, type CartItem } from '@/services/cartService';
import { useAuth } from '@/hooks/useAuth';
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
} from 'lucide-react';

const HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';

const RESTAURANT_CATEGORIES = ['All', 'Starters', 'Mains', 'Desserts'];
const BAR_CATEGORIES = ['All', 'Cocktails', 'Wine', 'Beer', 'Soft Drinks', 'Hot Drinks'];

export function GuestDining() {
  const { guestData } = useAuth();
  const [activeVenue, setActiveVenue] = useState<'restaurant' | 'bar'>('restaurant');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    const data = await getMenuItems(HOTEL_ID);
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (guestData?.guestId) setCart(getCart(guestData.guestId));
  }, [guestData?.guestId]);

  useEffect(() => {
    loadMenu();

    // Subscribe to realtime menu changes from Kitchen/Manager updates
    const channel = supabase
      .channel('guest-dining-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        loadMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const addToCart = (item: MenuItem) => {
    if (!guestData) return;
    const next = cart.some((entry) => entry.item.id === item.id)
      ? cart.map((entry) => entry.item.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry)
      : [...cart, { item, quantity: 1 }];
    setCart(next);
    saveCart(guestData.guestId, next);
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-5 sm:p-8 text-white shadow-xl">
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
            cocktails and Maltese vintages at The Moorings & Limonata Pool Bar. Add items from either menu to your cart and check out together for delivery to your room.
          </p>
        </div>
        <RouterLink to="/guest/cart" className="relative z-10 mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-amber-400">
          <ShoppingCart className="h-4 w-4" />
          Cart{cart.length > 0 && ` (${cart.reduce((sum, entry) => sum + entry.quantity, 0)})`}
        </RouterLink>
        <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
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
              ? 'bg-slate-900 text-white ring-2 ring-amber-500/50'
              : 'bg-white text-slate-600 hover:bg-sand-100 border border-sand-200'
          }`}
        >
          <UtensilsCrossed className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>Azure Restaurant & In-Room Dining</span>
        </button>

        <button
          onClick={() => {
            setActiveVenue('bar');
            setActiveCategory('All');
          }}
          className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3 px-3 sm:py-3.5 sm:px-4 text-xs sm:text-sm font-semibold transition-all shadow-sm ${
            activeVenue === 'bar'
              ? 'bg-slate-900 text-white ring-2 ring-amber-500/50'
              : 'bg-white text-slate-600 hover:bg-sand-100 border border-sand-200'
          }`}
        >
          <Wine className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span>The Moorings & Pool Bar</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-sand-200 shadow-sm">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-sea-600 text-white shadow-sm'
                  : 'bg-sand-100 text-slate-600 hover:bg-sand-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search dish or beverage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-sand-200 bg-sand-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sea-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 text-slate-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-sea-500 border-t-transparent" />
          <p className="text-xs">Loading live menu...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-sand-300 bg-white p-8 text-center">
          <UtensilsCrossed className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No items found</p>
          <p className="text-xs text-slate-400 mt-1">Try another category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition-all hover:shadow-md ${
                item.available
                  ? 'border-sand-200 hover:border-sand-300'
                  : 'border-sand-200/60 bg-sand-50/50 opacity-75'
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
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
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand-100 to-sand-200">
                    {activeVenue === 'bar' ? (
                      <Wine className="h-10 w-10 text-sand-400" />
                    ) : (
                      <UtensilsCrossed className="h-10 w-10 text-sand-400" />
                    )}
                  </div>
                )}
                <div className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-sm font-bold text-amber-700 shadow-sm backdrop-blur-sm">
                  €{item.price.toFixed(2)}
                </div>
                {item.availableForRoomService && (
                  <div className="absolute left-2 top-2 inline-flex items-center rounded-md bg-blue-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    Room Service
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {item.category}
                  </span>
                  <h3 className="mt-0.5 font-semibold text-slate-900 group-hover:text-sea-700 transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-3 border-t border-sand-100">
                  <div className="flex items-center gap-1.5">
                    {item.available ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500">
                        <XCircle className="h-3.5 w-3.5" />
                        Sold Out
                      </span>
                    )}
                  </div>

                  {item.available ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sea-600 hover:bg-sea-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Add to Cart</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Unavailable</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
