import { useState, useEffect, useCallback } from 'react';
import type { MenuItem, MenuVenue } from '@/types';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  type CreateMenuItemInput,
} from '@/services/menuService';
import { supabase } from '@/lib/supabase';

const HOTEL_ID = 'a0000000-0000-0000-0000-000000000001';

const RESTAURANT_CATEGORIES = ['Starters', 'Mains', 'Desserts'];
const BAR_CATEGORIES = ['Cocktails', 'Wine', 'Beer', 'Soft Drinks', 'Hot Drinks'];

const VENUE_LABELS: Record<MenuVenue, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  room_service: 'Room Service',
  pool_bar: 'Pool Bar',
};

interface ItemModalProps {
  item?: MenuItem | null;
  venue: MenuVenue;
  onSave: (data: CreateMenuItemInput | Partial<MenuItem>) => void;
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
    setSaving(true);
    await onSave({
      ...form,
      price: parseFloat(form.price) || 0,
      hotelId: HOTEL_ID,
    } as any);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {item ? 'Edit Menu Item' : 'Add Menu Item'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Venue</label>
              <select
                value={form.venue}
                onChange={e => setForm(f => ({ ...f, venue: e.target.value as MenuVenue, category: e.target.value === 'bar' ? BAR_CATEGORIES[0] : RESTAURANT_CATEGORIES[0] }))}
                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value="restaurant">Restaurant</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
              >
                {(form.venue === 'bar' ? BAR_CATEGORIES : RESTAURANT_CATEGORIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Item Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Spaghetti Carbonara"
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Short description..."
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Price (€)</label>
            <input
              type="number"
              required
              min="0"
              step="0.50"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.available}
                onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-sm text-white/70">Available</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.availableForRoomService}
                onChange={e => setForm(f => ({ ...f, availableForRoomService: e.target.checked }))}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-sm text-white/70">Room Service</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MenuManagement() {
  const [activeVenue, setActiveVenue] = useState<'restaurant' | 'bar'>('restaurant');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const data = await getMenuItems(HOTEL_ID);
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems();

    // Realtime subscription
    const channel = supabase
      .channel('menu-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        loadItems();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadItems]);

  const venueItems = items.filter(i => i.venue === activeVenue);
  const categories = activeVenue === 'bar' ? BAR_CATEGORIES : RESTAURANT_CATEGORIES;
  const filteredItems =
    activeCategory === 'All'
      ? venueItems
      : venueItems.filter(i => i.category === activeCategory);

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

  const handleToggle = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.available);
    await loadItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return;
    setDeleting(id);
    await deleteMenuItem(id);
    setDeleting(null);
    await loadItems();
  };

  const availableCount = venueItems.filter(i => i.available).length;
  const unavailableCount = venueItems.filter(i => !i.available).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Menu Management</h2>
          <p className="text-sm text-white/40 mt-0.5">
            {availableCount} available · {unavailableCount} unavailable
          </p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-amber-500/20"
        >
          <span className="text-lg leading-none">+</span>
          Add Item
        </button>
      </div>

      {/* Venue Tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1">
        {(['restaurant', 'bar'] as const).map(v => (
          <button
            key={v}
            onClick={() => { setActiveVenue(v); setActiveCategory('All'); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeVenue === v
                ? 'bg-amber-500 text-black shadow-lg'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {v === 'restaurant' ? '🍽️ Restaurant' : '🍹 Bar'}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              activeCategory === cat
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="text-center py-12 text-white/30">Loading menu...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          No items in this category yet.
          <button
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="block mx-auto mt-3 text-amber-500 hover:text-amber-400 text-sm font-medium"
          >
            + Add the first item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                item.available
                  ? 'bg-white/5 border-white/10 hover:bg-white/8'
                  : 'bg-white/2 border-white/5 opacity-60'
              }`}
            >
              {/* Availability toggle */}
              <button
                onClick={() => handleToggle(item)}
                className={`mt-0.5 w-10 h-6 rounded-full transition-all flex-shrink-0 relative ${
                  item.available ? 'bg-emerald-500' : 'bg-white/20'
                }`}
                title={item.available ? 'Mark unavailable' : 'Mark available'}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  item.available ? 'left-4' : 'left-0.5'
                }`} />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                    {item.availableForRoomService && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20 font-medium">Room Service</span>
                    )}
                    {!item.available && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full border border-red-500/20 font-medium">Unavailable</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-amber-400 flex-shrink-0">€{item.price.toFixed(2)}</span>
                </div>
                <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{item.description}</p>
                <span className="text-[10px] text-white/25 mt-1 inline-block">{item.category}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => { setEditingItem(item); setShowModal(true); }}
                  className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ItemModal
          item={editingItem}
          venue={activeVenue}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
