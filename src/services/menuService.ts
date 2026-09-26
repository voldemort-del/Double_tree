import { supabase } from '@/lib/supabase';
import type { MenuItem, MenuVenue } from '@/types';

// ============================================================
// menuService — CRUD for hotel menu items (restaurant & bar).
// Staff manage items; AI reads available items to present
// guests with accurate choices before placing orders.
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

/** Fetch all menu items for a hotel, optionally filtered by venue */
export async function getMenuItems(hotelId: string, venue?: MenuVenue): Promise<MenuItem[]> {
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

  const { data, error } = await query;
  if (error) {
    console.error('[menuService] getMenuItems error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToMenuItem);
}

/** Fetch only available items for a given venue (used by staff display) */
export async function getAvailableMenuItems(hotelId: string, venue?: MenuVenue): Promise<MenuItem[]> {
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

  const { data, error } = await query;
  if (error) {
    console.error('[menuService] getAvailableMenuItems error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToMenuItem);
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
  const { data, error } = await supabase
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
    .single();

  if (error) {
    console.error('[menuService] createMenuItem error:', error.message);
    return null;
  }
  return rowToMenuItem(data);
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

  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[menuService] updateMenuItem error:', error.message);
    return null;
  }
  return rowToMenuItem(data);
}

export async function toggleMenuItemAvailability(id: string, available: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('menu_items')
    .update({ available })
    .eq('id', id);

  if (error) {
    console.error('[menuService] toggleMenuItemAvailability error:', error.message);
    return false;
  }
  return true;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[menuService] deleteMenuItem error:', error.message);
    return false;
  }
  return true;
}
