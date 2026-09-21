import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getMenuItems } from '@/services/menuService';
import type { MenuItem, MenuVenue } from '@/types';
import { navigate } from '@/utils/router';
import {
  UtensilsCrossed,
  Wine,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  MessageCircle,
} from 'lucide-react';

const HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';

const RESTAURANT_CATEGORIES = ['All', 'Starters', 'Mains', 'Desserts'];
const BAR_CATEGORIES = ['All', 'Cocktails', 'Wine', 'Beer', 'Soft Drinks', 'Hot Drinks'];

export function GuestDining() {
  const [activeVenue, setActiveVenue] = useState<'restaurant' | 'bar'>('restaurant');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadMenu = useCallback(async () => {
    setLoading(true);
    const data = await getMenuItems(HOTEL_ID);
    setItems(data);
    setLoading(false);
  }, []);

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

  const handleOrderWithAI = (item: MenuItem) => {
    // Navigate to Concierge and prefill prompt in localStorage/session
    sessionStorage.setItem(
      'concierge_prefill_prompt',
      `I would like to order the ${item.name} (€${item.price.toFixed(2)}) for room service.`,
    );
    navigate('/guest/concierge');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur-sm border border-amber-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            <span>DoubleTree Malta Culinary & Bar Experience</span>
          </div>
          <h1 className="mt-3 font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            Restaurant & Bar Menus
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Explore authentic Mediterranean gastronomy at Azure Restaurant & Terrace or handcrafted
            cocktails and Maltese vintages at The Moorings & Limonata Pool Bar. Order directly through your AI Concierge for seamless room service.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Venue Switcher Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setActiveVenue('restaurant');
            setActiveCategory('All');
          }}
          className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3.5 px-4 text-sm font-semibold transition-all shadow-sm ${
            activeVenue === 'restaurant'
              ? 'bg-slate-900 text-white ring-2 ring-amber-500/50'
              : 'bg-white text-slate-600 hover:bg-sand-100 border border-sand-200'
          }`}
        >
          <UtensilsCrossed className="h-4 w-4 text-amber-400" />
          <span>Azure Restaurant & In-Room Dining</span>
        </button>

        <button
          onClick={() => {
            setActiveVenue('bar');
            setActiveCategory('All');
          }}
          className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3.5 px-4 text-sm font-semibold transition-all shadow-sm ${
            activeVenue === 'bar'
              ? 'bg-slate-900 text-white ring-2 ring-amber-500/50'
              : 'bg-white text-slate-600 hover:bg-sand-100 border border-sand-200'
          }`}
        >
          <Wine className="h-4 w-4 text-amber-400" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group flex flex-col justify-between rounded-xl border bg-white p-5 transition-all hover:shadow-md ${
                item.available
                  ? 'border-sand-200 hover:border-sand-300'
                  : 'border-sand-200/60 bg-sand-50/50 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 group-hover:text-sea-700 transition-colors">
                        {item.name}
                      </h3>
                      {item.availableForRoomService && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          Room Service
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">{item.category}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-bold text-amber-700">
                      €{item.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-sand-100">
                <div className="flex items-center gap-1.5">
                  {item.available ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500">
                      <XCircle className="h-3.5 w-3.5" />
                      Currently Sold Out
                    </span>
                  )}
                </div>

                {item.available ? (
                  <button
                    onClick={() => handleOrderWithAI(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sea-600 hover:bg-sea-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Order with Concierge</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Sold out today</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
