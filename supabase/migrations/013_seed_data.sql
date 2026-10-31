-- Migration: 013_seed_data
-- Idempotent seed (ON CONFLICT DO NOTHING) so it is safe to re-run.
-- Data faithfully ported from the original Express SQLite seed (server/seed.js).
-- 26 products, 3 promo codes, 1 admin profile.

-- 1. Admin profile (auth user is created separately via Supabase Auth)
insert into public.profiles (id, role, email) values
('00000000-0000-0000-0000-000000000001', 'admin', 'admin@confetticlub.shop')
on conflict (id) do nothing;

-- 2. Promo codes
insert into public.promo_codes (code, type, value, min_subtotal_cents, active, uses, description) values
('GIFT10', 'percent', 10, 3000, true, 0, '10% off orders over Rs 30'),
('FREESHIP', 'free_shipping', 0, 0, true, 0, 'Free standard shipping, any order'),
('WELCOME5', 'fixed', 500, 2500, true, 0, 'Rs 5 off your first order over Rs 25')
on conflict (code) do nothing;

-- 3. Products (26 items)
insert into public.products (id, slug, name, description, category, price_cents, compare_at_cents, emoji, gradient, rating, review_count, is_active, stock, sort_order, created_at, updated_at) values
('00000000-0000-0000-0000-000000000001', 'cloud-mood-lamp', 'Cloud Mood Lamp', 'A squishy cloud lamp with three warmth levels and a tap-to-dim touch sensor.', 'Home & Cozy', 3400, 4200, '🌙', '#7C5CFF,#5AC8FA', 4.8, 312, true, 42, 1, now(), now()),
('00000000-0000-0000-0000-000000000002', 'name-it-necklace', 'Name It Necklace', 'Custom-engraved name necklace in 18k gold vermeil, handmade to order.', 'Personalized', 4900, null, '✨', '#FFD84D,#FF9BE1', 4.9, 198, true, 25, 2, now(), now()),
('00000000-0000-0000-0000-000000000003', 'main-character-mug', 'Main Character Mug', 'Chunky 16oz ceramic mug with a snarky front print that fades in with heat.', 'For Her', 2200, 2800, '☕', '#FF6B5E,#FFD84D', 4.7, 540, true, 68, 3, now(), now()),
('00000000-0000-0000-0000-000000000004', 'cozy-sock-drop-3-pack', 'Cozy Sock Drop (3-pack)', 'Three pairs of absurdly soft cotton-blend socks in rotating seasonal colorways.', 'Under Rs 25', 1800, null, '🧦', '#D3FF52,#7CE7FF', 4.6, 806, true, 90, 4, now(), now()),
('00000000-0000-0000-0000-000000000005', 'pocket-projector-mini', 'Pocket Projector Mini', 'Palm-sized 1080p projector that turns any wall into a cinema in under a minute.', 'Tech & Gadgets', 8900, 10900, '🎬', '#0B0B0F,#7C5CFF', 4.5, 96, true, 14, 5, now(), now()),
('00000000-0000-0000-0000-000000000006', 'plant-parent-starter-kit', 'Plant Parent Starter Kit', 'Three low-maintenance succulents, ceramic pots, soil, and a care card that actually helps.', 'Home & Cozy', 2900, null, '🪴', '#D3FF52,#3DDC97', 4.7, 233, true, 55, 6, now(), now()),
('00000000-0000-0000-0000-000000000007', 'retro-bluetooth-boombox', 'Retro Bluetooth Boombox', '1980s looks, modern guts: 20W stereo, 12-hour battery, and a chunky volume dial.', 'Tech & Gadgets', 7900, 9900, '📻', '#FF6B5E,#7CE7FF', 4.6, 187, true, 21, 7, now(), now()),
('00000000-0000-0000-0000-000000000008', 'diy-candle-making-lab', 'DIY Candle Making Lab', 'Soy wax, three fragrance oils, wicks, and vessels -- everything for two candle nights in.', 'Experiences', 3200, null, '🕯️', '#FFD84D,#FF9BE1', 4.8, 154, true, 47, 8, now(), now()),
('00000000-0000-0000-0000-000000000009', 'smart-sip-bottle', 'Smart Sip Bottle', 'Vacuum-insulated bottle with a glow ring that reminds you to drink every hour.', 'Tech & Gadgets', 4500, null, '💧', '#5AC8FA,#D3FF52', 4.4, 121, true, 33, 9, now(), now()),
('00000000-0000-0000-0000-00000000000a', 'desk-zen-sandbox', 'Desk Zen Sandbox', 'Miniature rock garden with a tiny rake for your most stressful of afternoons.', 'Home & Cozy', 2600, null, '⛰️', '#C9B8FF,#7CE7FF', 4.5, 89, true, 61, 10, now(), now()),
('00000000-0000-0000-0000-00000000000b', 'custom-photo-phone-case', 'Custom Photo Phone Case', 'Upload any photo and we print it on a drop-tested, soft-touch case.', 'Personalized', 2400, null, '📱', '#FF9BE1,#7C5CFF', 4.6, 268, true, 74, 11, now(), now()),
('00000000-0000-0000-0000-00000000000c', 'weekender-duffle', 'Weekender Duffle', '35L canvas duffle with a shoe compartment that survives overhead bins.', 'For Him', 3900, 4900, '🎒', '#0B0B0F,#D3FF52', 4.5, 77, true, 26, 12, now(), now()),
('00000000-0000-0000-0000-00000000000d', 'chocolate-flight-box', 'Chocolate Flight Box', 'Six single-origin chocolate bars from six countries, from bright Ecuadorian to smoky Guatemala.', 'Under Rs 25', 2800, null, '🍫', '#8B5A2B,#FFD84D', 4.9, 431, true, 58, 13, now(), now()),
('00000000-0000-0000-0000-00000000000e', 'instant-print-camera', 'Instant Print Camera', 'Retro-styled instant camera with auto exposure and a selfie mirror.', 'Tech & Gadgets', 7400, 8900, '📸', '#FF6B5E,#FFD84D', 4.7, 302, true, 17, 14, now(), now()),
('00000000-0000-0000-0000-00000000000f', 'sleep-ritual-set', 'Sleep Ritual Set', 'Lavender pillow mist, a silk eye mask, and magnesium soak for a proper bedtime ritual.', 'Self-Care', 2100, 2700, '😴', '#7C5CFF,#C9B8FF', 4.6, 190, true, 66, 15, now(), now()),
('00000000-0000-0000-0000-000000000010', 'custom-coordinates-keychain', 'Custom Coordinates Keychain', 'Any place on earth, engraved as latitude/longitude on a brushed steel keychain.', 'Personalized', 1200, null, '🔑', '#7CE7FF,#FFD84D', 4.5, 145, true, 120, 16, now(), now()),
('00000000-0000-0000-0000-000000000011', 'led-rainbow-strips', 'LED Rainbow Strips', '5 meters of app-controlled LED strip with 16 million colors and music sync.', 'Tech & Gadgets', 1900, 2500, '🌈', '#FF9BE1,#7CE7FF', 4.4, 612, true, 84, 17, now(), now()),
('00000000-0000-0000-0000-000000000012', 'silk-scrunchie-vault-5-pack', 'Silk Scrunchie Vault (5-pack)', 'Five mulberry silk scrunchies that hold a bun without the crease or snag.', 'For Her', 1500, null, '🎀', '#FF9BE1,#FFD84D', 4.7, 355, true, 95, 18, now(), now()),
('00000000-0000-0000-0000-000000000013', 'engraved-leather-wallet', 'Engraved Leather Wallet', 'Full-grain leather bifold with a hidden message engraved inside the flap.', 'For Him', 4400, null, '👛', '#8B5A2B,#C9B8FF', 4.8, 112, true, 30, 19, now(), now()),
('00000000-0000-0000-0000-000000000014', 'game-night-box', 'Game Night Box', 'Three party games for 3-8 players that need zero setup and no rulebook PhD.', 'Experiences', 3600, 4500, '🎲', '#FF6B5E,#D3FF52', 4.8, 264, true, 39, 20, now(), now()),
('00000000-0000-0000-0000-000000000015', 'single-origin-coffee-flight', 'Single-Origin Coffee Flight', 'Four 100g bags from four roasters -- light, medium, dark, and one wild card.', 'Under Rs 25', 2700, null, '🫘', '#8B5A2B,#FF9BE1', 4.7, 178, true, 62, 21, now(), now()),
('00000000-0000-0000-0000-000000000016', 'custom-pet-socks', 'Custom Pet Socks', 'Upload a pet photo and we turn it into a repeating pattern on comfy crew socks.', 'Personalized', 2600, null, '🐶', '#FFD84D,#FF6B5E', 4.9, 389, true, 44, 22, now(), now()),
('00000000-0000-0000-0000-000000000017', 'bluetooth-beanie', 'Bluetooth Beanie', 'Knitted beanie with hidden speakers, a mic, and 8 hours of playback.', 'For Him', 3200, null, '🎧', '#0B0B0F,#5AC8FA', 4.3, 93, true, 36, 23, now(), now()),
('00000000-0000-0000-0000-000000000018', 'star-map-poster', 'Star Map Poster', 'Custom night-sky map of any date and location, printed on heavyweight matte stock.', 'Personalized', 3900, 4900, '🌌', '#0B0B0F,#7C5CFF', 4.8, 210, true, 28, 24, now(), now()),
('00000000-0000-0000-0000-000000000019', 'balloon-bouquet-kit', 'Balloon Bouquet Kit', 'Ten latex balloons, five foil shapes, ribbons, and a hand pump for instant decor.', 'Experiences', 1800, null, '🎈', '#FF6B5E,#7CE7FF', 4.5, 66, true, 70, 25, now(), now()),
('00000000-0000-0000-0000-00000000001a', 'confetti-gift-card', 'Confetti Gift Card', 'Digital gift card delivered by email with a confetti-filled note you can schedule.', 'Personalized', 2500, null, '🎁', '#7C5CFF,#D3FF52', 4.9, 512, true, 999, 26, now(), now())
on conflict (id) do nothing;
