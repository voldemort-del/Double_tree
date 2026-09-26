/*
# Migration 007: Refresh existing menu images per item

Migration 006 may already have been applied with category-level images.
This migration gives every existing menu item its own item-specific image URL.
*/

UPDATE menu_items
SET image_url = 'https://source.unsplash.com/900x600/?' ||
  replace(lower(name), ' ', ',')
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001';
