import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MenuItem, MenuVenue } from '@/types';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  type CreateMenuItemInput,
} from '@/services/menuService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  UtensilsCrossed,
  Wine,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  ChefHat,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';

const RESTAURANT_CATEGORIES = ['Starters', 'Mains', 'Desserts'];
const BAR_CATEGORIES = ['Cocktails', 'Wine', 'Beer', 'Soft Drinks', 'Hot Drinks'];

interface ItemModalProps {
  item?: MenuItem | null;
  venue: MenuVenue;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

function ItemModal({ item, venue, onSave, onClose }: ItemModalProps) {
  const isBar = venue === 'bar';
  const categories = isBar ? BAR_CATEGORIES : RESTAURANT_CATEGORIES;

  const [form, setForm] = useState({
    venue: item?.venue ?? venue,
    category: item?.category ?? categories[0],
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price?.toString() ?? '',
    available: item?.available ?? true,
    availableForRoomService: item?.availableForRoomService ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      price: parseFloat(form.price) || 0,
      hotelId: HOTEL_ID,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ops-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-ops-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ops-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-ops-600" />
            <h3 className="text-base font-semibold text-ops-900">
              {item ? 'Edit Product' : 'Add New Product'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-ops-400 hover:bg-ops-100 hover:text-ops-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ops-700 mb-1">Venue</label>
              <select
                value={form.venue}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    venue: e.target.value as MenuVenue,
                    category: e.target.value === 'bar' ? BAR_CATEGORIES[0] : RESTAURANT_CATEGORIES[0],
                  }))
                }
                className="w-full rounded-lg border border-ops-200 bg-white px-3 py-2 text-xs text-ops-900 focus:border-ops-600 focus:outline-none"
              >
                <option value="restaurant">Restaurant (Dining)</option>
                <option value="bar">Bar (Beverages)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ops-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-ops-200 bg-white px-3 py-2 text-xs text-ops-900 focus:border-ops-600 focus:outline-none"
              >
                {(form.venue === 'bar' ? BAR_CATEGORIES : RESTAURANT_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ops-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Spaghetti Carbonara or Aperol Spritz"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-ops-200 px-3 py-2 text-xs text-ops-900 placeholder:text-ops-300 focus:border-ops-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ops-700 mb-1">Description & Ingredients</label>
            <textarea
              rows={2}
              placeholder="Short description, dietary info, or ingredients..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-ops-200 px-3 py-2 text-xs text-ops-900 placeholder:text-ops-300 focus:border-ops-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ops-700 mb-1">Price (€ EUR)</label>
            <input
              type="number"
              required
              min="0"
              step="0.25"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full rounded-lg border border-ops-200 px-3 py-2 text-xs text-ops-900 placeholder:text-ops-300 focus:border-ops-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ops-700">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
                className="h-4 w-4 rounded border-ops-300 text-ops-600 focus:ring-ops-500"
              />
              <span>Currently In Stock (Available to Order)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ops-700">
              <input
                type="checkbox"
                checked={form.availableForRoomService}
                onChange={(e) => setForm((f) => ({ ...f, availableForRoomService: e.target.checked }))}
                className="h-4 w-4 rounded border-ops-300 text-ops-600 focus:ring-ops-500"
              />
              <span>Available for Room Service</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-ops-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-ops-200 py-2 text-xs font-semibold text-ops-600 hover:bg-ops-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-ops-900 py-2 text-xs font-semibold text-white hover:bg-ops-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : item ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MenuManagement() {
  const { session } = useAuth();
  const isManager = session?.type === 'manager';
  const isFoodAndBeverage = session?.department === 'Food & Beverage';

  const [activeVenue, setActiveVenue] = useState<'restaurant' | 'bar'>('restaurant');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const data = await getMenuItems(HOTEL_ID);
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();

    const channel = supabase
      .channel('menu-mgmt-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        loadItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadItems]);

  const venueItems = useMemo(() => items.filter((i) => i.venue === activeVenue), [items, activeVenue]);
  const categories = activeVenue === 'bar' ? BAR_CATEGORIES : RESTAURANT_CATEGORIES;

  const filteredItems = useMemo(() => {
    return venueItems.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [venueItems, activeCategory, searchQuery]);

  const handleSave = async (data: any) => {
    if (editingItem) {
      await updateMenuItem(editingItem.id, {
        venue: data.venue,
        category: data.category,
        name: data.name,
        description: data.description,
        price: data.price,
        available: data.available,
        availableForRoomService: data.availableForRoomService,
      });
    } else {
      await createMenuItem(data as CreateMenuItemInput);
    }
    setShowModal(false);
    setEditingItem(null);
    await loadItems();
  };

  const handleToggleStock = async (item: MenuItem) => {
    setTogglingId(item.id);
    await toggleMenuItemAvailability(item.id, !item.available);
    await loadItems();
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item from the catalog?')) return;
    await deleteMenuItem(id);
    await loadItems();
  };

  const totalInVenue = venueItems.length;
  const inStockCount = venueItems.filter((i) => i.available).length;
  const soldOutCount = venueItems.filter((i) => !i.available).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ops-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-ops-900">Restaurant & Bar Product Catalog</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-ops-100 px-2 py-0.5 text-xs font-semibold text-ops-700">
              {isManager ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-ops-600" />
                  Manager Controls
                </>
              ) : isFoodAndBeverage ? (
                <>
                  <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                  Kitchen & Bar Operations
                </>
              ) : (
                'Staff Operations'
              )}
            </span>
          </div>
          <p className="mt-1 text-xs text-ops-500">
            Add, update, 86 (mark sold out), or remove dishes and drinks. All availability updates instantly sync with the Concierge AI and Guest Dining view.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingItem(null);
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-ops-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-ops-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-ops-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ops-500">Total Products in {activeVenue === 'restaurant' ? 'Restaurant' : 'Bar'}</p>
          <p className="mt-1 text-2xl font-bold text-ops-900">{totalInVenue}</p>
        </div>
        <div className="rounded-xl border border-ops-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-700">In Stock & Active</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{inStockCount}</p>
        </div>
        <div className="rounded-xl border border-ops-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-red-700">86'd / Sold Out</p>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">{soldOutCount}</p>
        </div>
      </div>

      {/* Venue Switcher Tabs */}
      <div className="flex gap-2 border-b border-ops-200">
        <button
          onClick={() => {
            setActiveVenue('restaurant');
            setActiveCategory('All');
          }}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 text-xs font-semibold transition-colors ${
            activeVenue === 'restaurant'
              ? 'border-ops-900 text-ops-900'
              : 'border-transparent text-ops-500 hover:text-ops-700'
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
          <span>Azure Restaurant & Kitchen Menu</span>
        </button>

        <button
          onClick={() => {
            setActiveVenue('bar');
            setActiveCategory('All');
          }}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 text-xs font-semibold transition-colors ${
            activeVenue === 'bar'
              ? 'border-ops-900 text-ops-900'
              : 'border-transparent text-ops-500 hover:text-ops-700'
          }`}
        >
          <Wine className="h-4 w-4" />
          <span>The Moorings & Pool Bar Menu</span>
        </button>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-ops-200">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === c
                  ? 'bg-ops-900 text-white'
                  : 'bg-ops-100 text-ops-600 hover:bg-ops-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ops-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-ops-200 pl-8 pr-3 py-1.5 text-xs text-ops-900 placeholder:text-ops-400 focus:border-ops-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Products Table/List */}
      {loading ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 text-ops-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs">Loading products...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-ops-200 bg-white p-8 text-center text-ops-400">
          <p className="text-xs">No products match your filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ops-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ops-100 bg-ops-50/80 text-ops-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Status / Stock</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Room Service</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ops-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-ops-50/50 transition-colors">
                  {/* Toggle availability button */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStock(item)}
                      disabled={togglingId === item.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        item.available
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {item.available ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-red-500" />
                          <span>86'd (Sold Out)</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-ops-900">{item.name}</div>
                    <div className="text-[11px] text-ops-400 mt-0.5 max-w-sm truncate">
                      {item.description}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-ops-600">
                    <span className="rounded-md bg-ops-100 px-2 py-0.5 text-[11px] font-medium">
                      {item.category}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-ops-900">
                    €{item.price.toFixed(2)}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {item.availableForRoomService ? (
                      <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                        Yes
                      </span>
                    ) : (
                      <span className="text-[11px] text-ops-400">Venue only</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowModal(true);
                        }}
                        className="rounded p-1.5 text-ops-400 hover:bg-ops-100 hover:text-ops-700 transition-colors"
                        title="Edit product"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded p-1.5 text-ops-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <ItemModal
          item={editingItem}
          venue={activeVenue}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
