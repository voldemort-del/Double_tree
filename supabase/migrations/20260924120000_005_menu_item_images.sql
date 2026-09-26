-- ============================================================
-- Add image_url to menu_items and seed photos for restaurant + bar
-- ============================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_url text;

-- Restaurant: Starters
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Bruschetta al Pomodoro';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Seafood Soup';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Caprese Salad';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f3?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Calamari Fritti';

-- Restaurant: Mains
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Spaghetti Carbonara';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Grilled Sea Bass';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Maltese Rabbit Stew';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1558030006-450675292fec?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Beef Tenderloin';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Penne Arrabbiata';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Grilled Chicken Fillet';

-- Restaurant: Desserts
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Tiramisu';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Maltese Imqaret';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1488477304112-4944851de5d0?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Panna Cotta';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Chocolate Fondant';

-- Bar: Cocktails
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1560512823-829485b0bf49?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Aperol Spritz';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Maltese Sunset';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Mojito';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Cosmopolitan';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Mediterranean Mule';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Negroni';

-- Bar: Wine
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Marsovin Grand Vin (Red)';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Marsovin Grand Vin (White)';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Prosecco DOC';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'House Red Wine (bottle)';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'House White Wine (bottle)';

-- Bar: Beer
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Cisk Lager';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Cisk Excel (Alcohol-Free)';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Peroni Nastro Azzurro';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1618184812509-edbf48f5f39f?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Hopleaf Pale Ale';

-- Bar: Soft Drinks
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Fresh Orange Juice';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Still Water (500ml)';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Sparkling Water (500ml)';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Coca-Cola';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Lemon Iced Tea';

-- Bar: Hot Drinks
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Espresso';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'Cappuccino';

UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&h=600&fit=crop&q=80'
WHERE hotel_id = 'a0000000-0000-0000-0000-000000000001' AND name = 'English Breakfast Tea';
