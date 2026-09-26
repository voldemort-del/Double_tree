/*
# Migration 006: Add images to restaurant and bar menu items
*/

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url text;

UPDATE menu_items
SET image_url = CASE
  WHEN name = 'Bruschetta al Pomodoro' THEN 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Seafood Soup' THEN 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Caprese Salad' THEN 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Calamari Fritti' THEN 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Spaghetti Carbonara' THEN 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Grilled Sea Bass' THEN 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Maltese Rabbit Stew' THEN 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Beef Tenderloin' THEN 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Penne Arrabbiata' THEN 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Grilled Chicken Fillet' THEN 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Tiramisu' THEN 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Maltese Imqaret' THEN 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Panna Cotta' THEN 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Chocolate Fondant' THEN 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Aperol Spritz' THEN 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Maltese Sunset' THEN 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Mojito' THEN 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Cosmopolitan' THEN 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Mediterranean Mule' THEN 'https://images.unsplash.com/photo-1587223962930-cb7f31384c25?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Negroni' THEN 'https://images.unsplash.com/photo-1560963689-b5682b6440f8?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Marsovin Grand Vin (Red)' THEN 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Marsovin Grand Vin (White)' THEN 'https://images.unsplash.com/photo-1566454419290-57a0a1f20e5c?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Prosecco DOC' THEN 'https://images.unsplash.com/photo-1598306442928-4d7d2d7f5d38?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'House Red Wine (bottle)' THEN 'https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'House White Wine (bottle)' THEN 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Cisk Lager' THEN 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Cisk Excel (Alcohol-Free)' THEN 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Peroni Nastro Azzurro' THEN 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Hopleaf Pale Ale' THEN 'https://images.unsplash.com/photo-1559526642-c3f001ea68a4?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Fresh Orange Juice' THEN 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Still Water (500ml)' THEN 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Sparkling Water (500ml)' THEN 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Coca-Cola' THEN 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Lemon Iced Tea' THEN 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Espresso' THEN 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'Cappuccino' THEN 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80'
  WHEN name = 'English Breakfast Tea' THEN 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80'
  ELSE image_url
END
WHERE image_url IS NULL;
