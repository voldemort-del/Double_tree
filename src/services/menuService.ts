import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MenuItem, MenuVenue } from '@/types';
import { emitRealtimeEvent } from '@/realtime/bus';

// ============================================================
// menuService — CRUD for hotel menu items (restaurant & bar).
// Staff manage items; AI reads available items to present
// guests with accurate choices before placing orders.
// Provides instant offline/demo mock fallback so menus always load.
// ============================================================

function rowToMenuItem(row: any): MenuItem {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    venue: row.venue,
    category: row.category,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    available: row.available,
    availableForRoomService: row.available_for_room_service,
    imageUrl: row.image_url ?? undefined,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// Fallback demo menu — mirrors the seed migration data so the
// dining page works even when Supabase is empty or unreachable.
// ============================================================
const _HOTEL = 'a0000000-0000-0000-0000-000000000001';
const _NOW = new Date().toISOString();

export const MOCK_MENU_ITEMS: MenuItem[] = [
  // ── Restaurant: Starters ──────────────────────────────────
  { id: 'mi-r-01', hotelId: _HOTEL, venue: 'restaurant', category: 'Starters', name: 'Bruschetta al Pomodoro', description: 'Toasted sourdough with vine tomatoes, fresh basil and extra virgin olive oil', price: 8.50, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&h=600&fit=crop&q=80', displayOrder: 10, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-02', hotelId: _HOTEL, venue: 'restaurant', category: 'Starters', name: 'Seafood Soup', description: 'Traditional Maltese seafood broth with catch of the day, vegetables and herbs', price: 12.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop&q=80', displayOrder: 20, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-03', hotelId: _HOTEL, venue: 'restaurant', category: 'Starters', name: 'Caprese Salad', description: 'Buffalo mozzarella, heirloom tomatoes, fresh basil, aged balsamic', price: 11.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800&h=600&fit=crop&q=80', displayOrder: 30, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-04', hotelId: _HOTEL, venue: 'restaurant', category: 'Starters', name: 'Calamari Fritti', description: 'Lightly battered squid rings with lemon aioli and mixed leaves', price: 13.50, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f3?w=800&h=600&fit=crop&q=80', displayOrder: 40, createdAt: _NOW, updatedAt: _NOW },
  // ── Restaurant: Mains ────────────────────────────────────
  { id: 'mi-r-05', hotelId: _HOTEL, venue: 'restaurant', category: 'Mains', name: 'Spaghetti Carbonara', description: 'Spaghetti with pancetta, egg, pecorino romano and black pepper', price: 18.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=600&fit=crop&q=80', displayOrder: 50, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-06', hotelId: _HOTEL, venue: 'restaurant', category: 'Mains', name: 'Grilled Sea Bass', description: 'Whole sea bass grilled over charcoal with capers, lemon butter and seasonal vegetables', price: 26.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=600&fit=crop&q=80', displayOrder: 60, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-07', hotelId: _HOTEL, venue: 'restaurant', category: 'Mains', name: 'Maltese Rabbit Stew', description: 'Traditional braised rabbit with garlic, wine, tomatoes and herbs, served with crusty bread', price: 22.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop&q=80', displayOrder: 70, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-08', hotelId: _HOTEL, venue: 'restaurant', category: 'Mains', name: 'Beef Tenderloin', description: '220g beef tenderloin with truffle jus, roasted potatoes and seasonal greens', price: 34.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop&q=80', displayOrder: 80, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-09', hotelId: _HOTEL, venue: 'restaurant', category: 'Mains', name: 'Penne Arrabbiata', description: 'Penne with spicy tomato sauce, garlic and fresh parsley — vegetarian', price: 15.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=600&fit=crop&q=80', displayOrder: 90, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-10', hotelId: _HOTEL, venue: 'restaurant', category: 'Mains', name: 'Grilled Chicken Fillet', description: 'Free-range chicken breast with Mediterranean herbs, roasted vegetables and lemon sauce', price: 20.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&h=600&fit=crop&q=80', displayOrder: 100, createdAt: _NOW, updatedAt: _NOW },
  // ── Restaurant: Desserts ─────────────────────────────────
  { id: 'mi-r-11', hotelId: _HOTEL, venue: 'restaurant', category: 'Desserts', name: 'Tiramisu', description: 'Classic Italian tiramisu with mascarpone, espresso and cocoa', price: 9.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=600&fit=crop&q=80', displayOrder: 110, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-12', hotelId: _HOTEL, venue: 'restaurant', category: 'Desserts', name: 'Maltese Imqaret', description: 'Deep-fried date pastries with vanilla ice cream', price: 8.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop&q=80', displayOrder: 120, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-13', hotelId: _HOTEL, venue: 'restaurant', category: 'Desserts', name: 'Panna Cotta', description: 'Vanilla panna cotta with seasonal berry coulis', price: 8.50, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop&q=80', displayOrder: 130, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-r-14', hotelId: _HOTEL, venue: 'restaurant', category: 'Desserts', name: 'Chocolate Fondant', description: 'Warm chocolate fondant with vanilla ice cream and caramel sauce', price: 10.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&h=600&fit=crop&q=80', displayOrder: 140, createdAt: _NOW, updatedAt: _NOW },
  // ── Bar: Cocktails ───────────────────────────────────────
  { id: 'mi-b-01', hotelId: _HOTEL, venue: 'bar', category: 'Cocktails', name: 'Aperol Spritz', description: 'Aperol, Prosecco, soda water and orange slice', price: 11.00, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=800&h=600&fit=crop&q=80', displayOrder: 10, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-02', hotelId: _HOTEL, venue: 'bar', category: 'Cocktails', name: 'Maltese Sunset', description: 'Vodka, blood orange juice, grenadine and lemon — house special', price: 12.00, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop&q=80', displayOrder: 20, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-03', hotelId: _HOTEL, venue: 'bar', category: 'Cocktails', name: 'Mojito', description: 'White rum, fresh mint, lime juice, sugar and soda water', price: 11.50, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=600&fit=crop&q=80', displayOrder: 30, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-04', hotelId: _HOTEL, venue: 'bar', category: 'Cocktails', name: 'Cosmopolitan', description: 'Vodka, triple sec, cranberry juice and fresh lime', price: 12.00, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&h=600&fit=crop&q=80', displayOrder: 40, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-05', hotelId: _HOTEL, venue: 'bar', category: 'Cocktails', name: 'Mediterranean Mule', description: 'Gin, elderflower, cucumber, ginger beer and fresh mint', price: 12.50, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1621873495914-a2b9b6c6d8ae?w=800&h=600&fit=crop&q=80', displayOrder: 50, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-06', hotelId: _HOTEL, venue: 'bar', category: 'Cocktails', name: 'Negroni', description: 'Gin, Campari and sweet vermouth with orange peel', price: 13.00, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800&h=600&fit=crop&q=80', displayOrder: 60, createdAt: _NOW, updatedAt: _NOW },
  // ── Bar: Wine ────────────────────────────────────────────
  { id: 'mi-b-07', hotelId: _HOTEL, venue: 'bar', category: 'Wine', name: 'Marsovin Grand Vin (Red)', description: 'Full-bodied Maltese Cabernet Sauvignon — glass', price: 9.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop&q=80', displayOrder: 70, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-08', hotelId: _HOTEL, venue: 'bar', category: 'Wine', name: 'Marsovin Grand Vin (White)', description: 'Crisp Maltese Chardonnay with citrus notes — glass', price: 9.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80', displayOrder: 80, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-09', hotelId: _HOTEL, venue: 'bar', category: 'Wine', name: 'Prosecco DOC', description: 'Italian sparkling wine — glass', price: 10.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800&h=600&fit=crop&q=80', displayOrder: 90, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-10', hotelId: _HOTEL, venue: 'bar', category: 'Wine', name: 'House Red Wine (bottle)', description: 'Bottle of house Merlot', price: 28.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop&q=80', displayOrder: 100, createdAt: _NOW, updatedAt: _NOW },
  // ── Bar: Beer ────────────────────────────────────────────
  { id: 'mi-b-11', hotelId: _HOTEL, venue: 'bar', category: 'Beer', name: 'Cisk Lager', description: "Malta's iconic lager — 330ml bottle", price: 5.00, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop&q=80', displayOrder: 120, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-12', hotelId: _HOTEL, venue: 'bar', category: 'Beer', name: 'Cisk Excel (Alcohol-Free)', description: 'Non-alcoholic Maltese lager — 330ml', price: 4.50, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop&q=80', displayOrder: 130, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-13', hotelId: _HOTEL, venue: 'bar', category: 'Beer', name: 'Peroni Nastro Azzurro', description: 'Italian premium lager — 330ml bottle', price: 5.50, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800&h=600&fit=crop&q=80', displayOrder: 140, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-14', hotelId: _HOTEL, venue: 'bar', category: 'Beer', name: 'Hopleaf Pale Ale', description: 'Maltese craft pale ale — 330ml', price: 6.00, available: true, availableForRoomService: false, imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&h=600&fit=crop&q=80', displayOrder: 150, createdAt: _NOW, updatedAt: _NOW },
  // ── Bar: Soft Drinks ─────────────────────────────────────
  { id: 'mi-b-15', hotelId: _HOTEL, venue: 'bar', category: 'Soft Drinks', name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', price: 5.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&h=600&fit=crop&q=80', displayOrder: 160, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-16', hotelId: _HOTEL, venue: 'bar', category: 'Soft Drinks', name: 'Still Water (500ml)', description: 'Chilled still mineral water', price: 3.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=800&h=600&fit=crop&q=80', displayOrder: 170, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-17', hotelId: _HOTEL, venue: 'bar', category: 'Soft Drinks', name: 'Coca-Cola', description: 'Classic Coca-Cola — 330ml can', price: 3.50, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&h=600&fit=crop&q=80', displayOrder: 190, createdAt: _NOW, updatedAt: _NOW },
  // ── Bar: Hot Drinks ──────────────────────────────────────
  { id: 'mi-b-18', hotelId: _HOTEL, venue: 'bar', category: 'Hot Drinks', name: 'Espresso', description: 'Double shot Italian espresso', price: 3.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&h=600&fit=crop&q=80', displayOrder: 210, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-19', hotelId: _HOTEL, venue: 'bar', category: 'Hot Drinks', name: 'Cappuccino', description: 'Espresso with steamed milk foam', price: 4.00, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&h=600&fit=crop&q=80', displayOrder: 220, createdAt: _NOW, updatedAt: _NOW },
  { id: 'mi-b-20', hotelId: _HOTEL, venue: 'bar', category: 'Hot Drinks', name: 'English Breakfast Tea', description: 'Traditional black tea with milk', price: 3.50, available: true, availableForRoomService: true, imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&h=600&fit=crop&q=80', displayOrder: 230, createdAt: _NOW, updatedAt: _NOW },
];

const STORAGE_MENU_KEY = 'dth_mock_menu_items';

export function getStoredMockMenuItems(): MenuItem[] {
  if (typeof window === 'undefined') return MOCK_MENU_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_MENU_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveStoredMockMenuItems(MOCK_MENU_ITEMS);
  return MOCK_MENU_ITEMS;
}

export function saveStoredMockMenuItems(items: MenuItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_MENU_KEY, JSON.stringify(items));
  } catch {}
}

function withTimeout<T>(promiseLike: PromiseLike<T>, ms = 2500): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Fetch all menu items for a hotel, optionally filtered by venue */
export async function getMenuItems(hotelId: string, venue?: MenuVenue): Promise<MenuItem[]> {
  if (!isSupabaseConfigured) {
    const stored = getStoredMockMenuItems();
    return stored.filter((i) => !venue || i.venue === venue);
  }

  try {
    let query = supabase
      .from('menu_items')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('venue')
      .order('category')
      .order('display_order');

    if (venue) {
      query = query.eq('venue', venue);
    }

    const { data, error } = await withTimeout(query, 2500);
    if (error) {
      console.warn('[menuService] Supabase getMenuItems error, falling back to mock:', error.message);
      const stored = getStoredMockMenuItems();
      return stored.filter((i) => !venue || i.venue === venue);
    }

    if (!data || data.length === 0) {
      const stored = getStoredMockMenuItems();
      return stored.filter((i) => !venue || i.venue === venue);
    }

    return data.map(rowToMenuItem);
  } catch (err: any) {
    console.warn('[menuService] Supabase getMenuItems timed out or failed, using mock data:', err?.message || err);
    const stored = getStoredMockMenuItems();
    return stored.filter((i) => !venue || i.venue === venue);
  }
}

/** Fetch only available items for a given venue (used by staff display) */
export async function getAvailableMenuItems(hotelId: string, venue?: MenuVenue): Promise<MenuItem[]> {
  if (!isSupabaseConfigured) {
    const stored = getStoredMockMenuItems();
    return stored.filter((i) => (!venue || i.venue === venue) && i.available);
  }

  try {
    let query = supabase
      .from('menu_items')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('available', true)
      .order('venue')
      .order('category')
      .order('display_order');

    if (venue) {
      query = query.eq('venue', venue);
    }

    const { data, error } = await withTimeout(query, 2500);
    if (error || !data || data.length === 0) {
      const stored = getStoredMockMenuItems();
      return stored.filter((i) => (!venue || i.venue === venue) && i.available);
    }

    return data.map(rowToMenuItem);
  } catch {
    const stored = getStoredMockMenuItems();
    return stored.filter((i) => (!venue || i.venue === venue) && i.available);
  }
}

export interface CreateMenuItemInput {
  hotelId: string;
  venue: MenuVenue;
  category: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  availableForRoomService: boolean;
  imageUrl?: string;
  displayOrder?: number;
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<MenuItem | null> {
  const newItem: MenuItem = {
    id: `mi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    hotelId: input.hotelId,
    venue: input.venue,
    category: input.category,
    name: input.name,
    description: input.description,
    price: input.price,
    available: input.available,
    availableForRoomService: input.availableForRoomService,
    imageUrl: input.imageUrl ?? undefined,
    displayOrder: input.displayOrder ?? 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const stored = getStoredMockMenuItems();
  saveStoredMockMenuItems([newItem, ...stored]);
  emitRealtimeEvent({ type: 'menu:updated' });

  if (!isSupabaseConfigured) {
    return newItem;
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('menu_items')
        .insert({
          hotel_id: input.hotelId,
          venue: input.venue,
          category: input.category,
          name: input.name,
          description: input.description,
          price: input.price,
          available: input.available,
          available_for_room_service: input.availableForRoomService,
          image_url: input.imageUrl ?? null,
          display_order: input.displayOrder ?? 0,
        })
        .select()
        .single(),
      2500
    );

    if (!error && data) {
      return rowToMenuItem(data);
    }
  } catch (err) {
    console.warn('[menuService] createMenuItem remote sync error, saved locally');
  }

  return newItem;
}

export interface UpdateMenuItemInput {
  venue?: MenuVenue;
  category?: string;
  name?: string;
  description?: string;
  price?: number;
  available?: boolean;
  availableForRoomService?: boolean;
  displayOrder?: number;
  imageUrl?: string | null;
}

export async function updateMenuItem(id: string, patch: UpdateMenuItemInput): Promise<MenuItem | null> {
  const stored = getStoredMockMenuItems();
  const index = stored.findIndex((i) => i.id === id);
  let updatedItem: MenuItem | null = null;

  if (index !== -1) {
    updatedItem = {
      ...stored[index],
      ...patch,
      imageUrl: patch.imageUrl === null ? undefined : (patch.imageUrl ?? stored[index].imageUrl),
      updatedAt: new Date().toISOString(),
    };
    stored[index] = updatedItem;
    saveStoredMockMenuItems([...stored]);
    emitRealtimeEvent({ type: 'menu:updated' });
  }

  if (!isSupabaseConfigured) {
    return updatedItem;
  }

  try {
    const updates: Record<string, any> = {};
    if (patch.venue !== undefined) updates.venue = patch.venue;
    if (patch.category !== undefined) updates.category = patch.category;
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.price !== undefined) updates.price = patch.price;
    if (patch.available !== undefined) updates.available = patch.available;
    if (patch.availableForRoomService !== undefined) updates.available_for_room_service = patch.availableForRoomService;
    if (patch.displayOrder !== undefined) updates.display_order = patch.displayOrder;
    if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl || null;

    const { data, error } = await withTimeout(
      supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
      2500
    );

    if (!error && data) {
      return rowToMenuItem(data);
    }
  } catch (err) {
    console.warn('[menuService] updateMenuItem remote sync error, updated locally');
  }

  return updatedItem;
}

export async function toggleMenuItemAvailability(id: string, available: boolean): Promise<boolean> {
  const stored = getStoredMockMenuItems();
  const index = stored.findIndex((i) => i.id === id);
  if (index !== -1) {
    stored[index] = { ...stored[index], available, updatedAt: new Date().toISOString() };
    saveStoredMockMenuItems([...stored]);
    emitRealtimeEvent({ type: 'menu:updated' });
  }

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    await withTimeout(
      supabase.from('menu_items').update({ available }).eq('id', id),
      2500
    );
  } catch (err) {
    console.warn('[menuService] toggleMenuItemAvailability remote sync error, updated locally');
  }

  return true;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const stored = getStoredMockMenuItems();
  const next = stored.filter((i) => i.id !== id);
  saveStoredMockMenuItems(next);
  emitRealtimeEvent({ type: 'menu:updated' });

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    await withTimeout(
      supabase.from('menu_items').delete().eq('id', id),
      2500
    );
  } catch (err) {
    console.warn('[menuService] deleteMenuItem remote sync error, deleted locally');
  }

  return true;
}
