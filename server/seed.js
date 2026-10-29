'use strict';
/**
 * Database seeder — runs automatically on first boot.
 * Creates the admin account, the catalog, promo codes, and (once) a realistic
 * 14-day history of orders + traffic so the dashboard looks alive from day one.
 *
 *   npm run seed            → idempotent seed
 *   npm run seed -- --fresh → wipe & reseed everything
 */
const bcrypt = require('bcryptjs');
const config = require('./config');
const { q, tx, countProducts, close } = require('./db');
const { writeProductImage } = require('./lib/svg');
const { mulberry32, pick, randomToken, orderNumber } = require('./lib/helpers');
const { priceCart } = require('./lib/pricing');
const { numericSettings } = require('./lib/settings');

const DEMO_ADMIN_PASSWORD = config.admin.password;

/* ------------------------------- catalog -------------------------------- */
const DESC_TAIL = 'Arrives gift-ready in our signature confetti box.\nFree shipping over Rs 50 · 30-day easy returns · ships in 1–2 days.';

const PRODUCTS = [
  { name: 'Cloud Mood Lamp', tagline: 'Soft light, big mood.', blurb: 'A squishy cloud lamp with three warmth levels and a tap-to-dim touch sensor.', b1: 'USB-C rechargeable, runs 12 hours a charge', b2: 'Doubles as a bedside night light', category: 'Home & Cozy', price: 3400, compare: 4200, stock: 42, emoji: '🌙', gradient: '#7C5CFF,#5AC8FA', rating: 4.8, reviews: 312, featured: 1, sort: 1 },
  { name: 'Name It Necklace', tagline: 'Your name, but make it gold.', blurb: 'Custom-engraved name necklace in 18k gold vermeil, handmade to order.', b1: 'Choose script or block lettering', b2: 'Ships in a keepsake pouch', category: 'Personalized', price: 4900, compare: null, stock: 25, emoji: '✨', gradient: '#FFD84D,#FF9BE1', rating: 4.9, reviews: 198, featured: 1, sort: 2 },
  { name: 'Main Character Mug', tagline: 'Caffeine with main-character energy.', blurb: 'Chunky 16oz ceramic mug with a snarky front print that fades in with heat.', b1: 'Dishwasher and microwave safe', b2: 'Holds a full 16oz pour-over', category: 'For Her', price: 2200, compare: 2800, stock: 68, emoji: '☕', gradient: '#FF6B5E,#FFD84D', rating: 4.7, reviews: 540, featured: 1, sort: 3 },
  { name: 'Cozy Sock Drop (3-pack)', tagline: 'Feet deserve plot twists.', blurb: 'Three pairs of absurdly soft cotton-blend socks in rotating seasonal colorways.', b1: 'Fits US sizes 6–11', b2: 'Reinforced heel and toe', category: 'Under Rs 25', price: 1800, compare: null, stock: 90, emoji: '🧦', gradient: '#D3FF52,#7CE7FF', rating: 4.6, reviews: 806, featured: 1, sort: 4 },
  { name: 'Pocket Projector Mini', tagline: 'Movie night, anywhere.', blurb: 'A palm-sized 1080p projector that turns any wall into a cinema in under a minute.', b1: 'Wi-Fi screen mirroring for iOS + Android', b2: 'Built-in speaker and 3-hour battery', category: 'Tech & Gadgets', price: 8900, compare: 10900, stock: 14, emoji: '🎬', gradient: '#0B0B0F,#7C5CFF', rating: 4.5, reviews: 96, featured: 1, sort: 5 },
  { name: 'Plant Parent Starter Kit', tagline: 'Kill fewer plants.', blurb: 'Three low-maintenance succulents, ceramic pots, soil, and a care card that actually helps.', b1: 'Ships with live plants, packed upright', b2: 'Care guide for forgetful people', category: 'Home & Cozy', price: 2900, compare: null, stock: 55, emoji: '🪴', gradient: '#D3FF52,#3DDC97', rating: 4.7, reviews: 233, featured: 0, sort: 6 },
  { name: 'Retro Bluetooth Boombox', tagline: 'Blast the nostalgia.', blurb: '1980s looks, modern guts: 20W stereo, 12-hour battery, and a chunky volume dial.', b1: 'Pairs two devices at once', b2: 'Aux in for older devices', category: 'Tech & Gadgets', price: 7900, compare: 9900, stock: 21, emoji: '📻', gradient: '#FF6B5E,#7CE7FF', rating: 4.6, reviews: 187, featured: 1, sort: 7 },
  { name: 'DIY Candle Making Lab', tagline: 'Pour your own vibe.', blurb: 'Soy wax, three fragrance oils, wicks, and vessels — everything for two candle nights in.', b1: 'Includes vanilla, cedar, and sea salt scents', b2: 'Reusable melting pot included', category: 'Experiences', price: 3200, compare: null, stock: 47, emoji: '🕯️', gradient: '#FFD84D,#FF9BE1', rating: 4.8, reviews: 154, featured: 0, sort: 8 },
  { name: 'Smart Sip Bottle', tagline: 'Hydration that nags (kindly).', blurb: 'A vacuum-insulated bottle with a glow ring that reminds you to drink every hour.', b1: 'Keeps drinks cold for 24 hours', b2: 'App-free — the cap does everything', category: 'Tech & Gadgets', price: 4500, compare: null, stock: 33, emoji: '💧', gradient: '#5AC8FA,#D3FF52', rating: 4.4, reviews: 121, featured: 0, sort: 9 },
  { name: 'Desk Zen Sandbox', tagline: 'Meetings? What meetings.', blurb: 'A miniature rock garden with a tiny rake for your most stressful of afternoons.', b1: 'Magnetic base keeps it put', b2: 'Rake tucks into the lid', category: 'Home & Cozy', price: 2600, compare: null, stock: 61, emoji: '⛰️', gradient: '#C9B8FF,#7CE7FF', rating: 4.5, reviews: 89, featured: 0, sort: 10 },
  { name: 'Custom Photo Phone Case', tagline: 'Their face, your phone.', blurb: 'Upload any photo and we print it on a drop-tested, soft-touch case.', b1: 'Wireless-charging friendly', b2: 'Printed and shipped in 48 hours', category: 'Personalized', price: 2400, compare: null, stock: 74, emoji: '📱', gradient: '#FF9BE1,#7C5CFF', rating: 4.6, reviews: 268, featured: 0, sort: 11 },
  { name: 'Weekender Duffle', tagline: 'Pack light, post stories.', blurb: 'A 35L canvas duffle with a shoe compartment that survives overhead bins.', b1: 'Water-resistant coated canvas', b2: 'Tucks away into its own pocket', category: 'For Him', price: 3900, compare: 4900, stock: 26, emoji: '🎒', gradient: '#0B0B0F,#D3FF52', rating: 4.5, reviews: 77, featured: 0, sort: 12 },
  { name: 'Chocolate Flight Box', tagline: 'Six bars, zero regrets.', blurb: 'Six single-origin chocolate bars from six countries, from bright Ecuadorian to smoky Guatemala.', b1: 'Tasting card explains every bar', b2: 'Ships in insulated packaging', category: 'Under Rs 25', price: 2800, compare: null, stock: 58, emoji: '🍫', gradient: '#8B5A2B,#FFD84D', rating: 4.9, reviews: 431, featured: 1, sort: 13 },
  { name: 'Instant Print Camera', tagline: 'Core memories, printed.', blurb: 'A retro-styled instant camera with auto exposure and a selfie mirror.', b1: '10 shots per cartridge (refills included)', b2: 'Runs on rechargeable USB-C', category: 'Tech & Gadgets', price: 7400, compare: 8900, stock: 17, emoji: '📸', gradient: '#FF6B5E,#FFD84D', rating: 4.7, reviews: 302, featured: 1, sort: 14 },
  { name: 'Sleep Ritual Set', tagline: 'Wind down like a pro.', blurb: 'Lavender pillow mist, a silk eye mask, and magnesium soak for a proper bedtime ritual.', b1: 'All-natural fragrance, no synthetics', b2: 'Reusable travel case included', category: 'Self-Care', price: 2100, compare: 2700, stock: 66, emoji: '😴', gradient: '#7C5CFF,#C9B8FF', rating: 4.6, reviews: 190, featured: 0, sort: 15 },
  { name: 'Custom Coordinates Keychain', tagline: 'Your spot, always.', blurb: 'Any place on earth, engraved as latitude/longitude on a brushed steel keychain.', b1: 'Add a date on the reverse', b2: 'Free engraving, ships in 3 days', category: 'Personalized', price: 1200, compare: null, stock: 120, emoji: '🔑', gradient: '#7CE7FF,#FFD84D', rating: 4.5, reviews: 145, featured: 1, sort: 16 },
  { name: 'LED Rainbow Strips', tagline: 'RGB everything.', blurb: '5 meters of app-controlled LED strip with 16 million colors and music sync.', b1: 'Cuttable every 10cm', b2: 'Peel-and-stick with adhesive backing', category: 'Tech & Gadgets', price: 1900, compare: 2500, stock: 84, emoji: '🌈', gradient: '#FF9BE1,#7CE7FF', rating: 4.4, reviews: 612, featured: 1, sort: 17 },
  { name: 'Silk Scrunchie Vault (5-pack)', tagline: 'Zero hair drama.', blurb: 'Five mulberry silk scrunchies that hold a bun without the crease or snag.', b1: 'Gentle on fine and curly hair', b2: 'Comes in a reusable tin', category: 'For Her', price: 1500, compare: null, stock: 95, emoji: '🎀', gradient: '#FF9BE1,#FFD84D', rating: 4.7, reviews: 355, featured: 0, sort: 18 },
  { name: 'Engraved Leather Wallet', tagline: 'Cards, cash, sentiment.', blurb: 'Full-grain leather bifold with a hidden message engraved inside the flap.', b1: 'RFID-blocking inner pocket', b2: 'Ages beautifully with use', category: 'For Him', price: 4400, compare: null, stock: 30, emoji: '👛', gradient: '#8B5A2B,#C9B8FF', rating: 4.8, reviews: 112, featured: 0, sort: 19 },
  { name: 'Game Night Box', tagline: 'Phones down, chaos up.', blurb: 'Three party games for 3–8 players that need zero setup and no rulebook PhD.', b1: 'Average round: 12 minutes', b2: 'Comes in a shelf-ready box', category: 'Experiences', price: 3600, compare: 4500, stock: 39, emoji: '🎲', gradient: '#FF6B5E,#D3FF52', rating: 4.8, reviews: 264, featured: 1, sort: 20 },
  { name: 'Single-Origin Coffee Flight', tagline: 'Beans with range.', blurb: 'Four 100g bags from four roasters — light, medium, dark, and one wild card.', b1: 'Roasted to order each Monday', b2: 'Brew guide for every bag', category: 'Under Rs 25', price: 2700, compare: null, stock: 62, emoji: '🫘', gradient: '#8B5A2B,#FF9BE1', rating: 4.7, reviews: 178, featured: 0, sort: 21 },
  { name: 'Custom Pet Socks', tagline: 'Paws on your calves.', blurb: 'Upload a pet photo and we turn it into a repeating pattern on comfy crew socks.', b1: 'Works for dogs, cats, and chaos gremlins', b2: 'Machine washable print that lasts', category: 'Personalized', price: 2600, compare: null, stock: 44, emoji: '🐶', gradient: '#FFD84D,#FF6B5E', rating: 4.9, reviews: 389, featured: 1, sort: 22 },
  { name: 'Bluetooth Beanie', tagline: 'Warm ears, loud playlists.', blurb: 'A knit beanie with hidden speakers, a mic, and 8 hours of playback.', b1: 'Machine washable (battery pops out)', b2: 'One size, stretchy rib knit', category: 'For Him', price: 3200, compare: null, stock: 36, emoji: '🎧', gradient: '#0B0B0F,#5AC8FA', rating: 4.3, reviews: 93, featured: 0, sort: 23 },
  { name: 'Star Map Poster', tagline: 'The sky the night you met.', blurb: 'A custom night-sky map of any date and location, printed on heavyweight matte stock.', b1: '18×24" fits standard frames', b2: 'Add names and a date line', category: 'Personalized', price: 3900, compare: 4900, stock: 28, emoji: '🌌', gradient: '#0B0B0F,#7C5CFF', rating: 4.8, reviews: 210, featured: 1, sort: 24 },
  { name: 'Balloon Bouquet Kit', tagline: 'Party in a box.', blurb: 'Ten latex balloons, five foil shapes, ribbons, and a hand pump for instant decor.', b1: 'Helium-free — stands upright on weights', b2: 'Reusable pump included', category: 'Experiences', price: 1800, compare: null, stock: 70, emoji: '🎈', gradient: '#FF6B5E,#7CE7FF', rating: 4.5, reviews: 66, featured: 0, sort: 25 },
  { name: 'Confetti Gift Card', tagline: 'When you want to let them pick.', blurb: 'Digital gift card delivered by email with a confetti-filled note you can schedule.', b1: 'Never expires', b2: 'Redeemable on everything', category: 'Personalized', price: 2500, compare: null, stock: 999, emoji: '🎁', gradient: '#7C5CFF,#D3FF52', rating: 4.9, reviews: 512, featured: 1, sort: 26 }
];

const PROMOS = [
  { code: 'GIFT10', type: 'percent', value: 10, min: 3000, description: '10% off orders over Rs 30' },
  { code: 'FREESHIP', type: 'free_shipping', value: 0, min: 0, description: 'Free standard shipping, any order' },
  { code: 'WELCOME5', type: 'fixed', value: 500, min: 2500, description: 'Rs 5 off your first order over Rs 25' }
];

/* ------------------------------ demo people ------------------------------ */
const PEOPLE = [
  ['Ava Martinez', 'Austin', 'TX'], ['Liam Chen', 'Seattle', 'WA'], ['Sophia Patel', 'Jersey City', 'NJ'],
  ['Noah Williams', 'Denver', 'CO'], ['Mia Johnson', 'Chicago', 'IL'], ['Ethan Brown', 'Portland', 'OR'],
  ['Isabella Nguyen', 'San Jose', 'CA'], ['Mason Davis', 'Nashville', 'TN'], ['Charlotte Kim', 'Los Angeles', 'CA'],
  ['Lucas Rivera', 'Miami', 'FL'], ['Amelia Thompson', 'Boston', 'MA'], ['James Anderson', 'Philadelphia', 'PA'],
  ['Harper Wilson', 'Phoenix', 'AZ'], ['Benjamin Lee', 'New York', 'NY'], ['Evelyn Garcia', 'San Antonio', 'TX'],
  ['Henry Moore', 'Columbus', 'OH'], ['Luna Martin', 'Brooklyn', 'NY'], ['Alexander Jackson', 'Dallas', 'TX'],
  ['Aria White', 'Charlotte', 'NC'], ['Daniel Harris', 'Minneapolis', 'MN'], ['Chloe Clark', 'Atlanta', 'GA'],
  ['Jack Lewis', 'Kansas City', 'MO'], ['Grace Walker', 'Raleigh', 'NC'], ['Owen Hall', 'Indianapolis', 'IN'],
  ['Zoe Young', 'Queens', 'NY'], ['Samuel Allen', 'Sacramento', 'CA'], ['Nora King', 'Oakland', 'CA'],
  ['Ryan Wright', 'Milwaukee', 'WI'], ['Lily Scott', 'Baltimore', 'MD'], ['Aaron Torres', 'Tucson', 'AZ'],
  ['Hannah Green', 'Omaha', 'NE'], ['Isaac Adams', 'Colorado Springs', 'CO'], ['Ella Baker', 'Miami', 'FL'],
  ['Caleb Nelson', 'Louisville', 'KY'], ['Victoria Hall', 'Pittsburgh', 'PA'], ['Julian Carter', 'Fresno', 'CA'],
  ['Penelope Mitchell', 'Portland', 'OR'], ['Dylan Roberts', 'Aurora', 'CO'], ['Layla Turner', 'Tampa', 'FL'],
  ['Nathan Phillips', 'Long Beach', 'CA'], ['Ruby Campbell', 'Santa Ana', 'CA'], ['Leo Parker', 'Rochester', 'NY'],
  ['Stella Evans', 'Albuquerque', 'NM'], ['Ian Edwards', 'Mesa', 'AZ'], ['Claire Collins', 'Birmingham', 'AL'],
  ['Marcus Hill', 'Detroit', 'MI']
];

const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'icloud.com', 'yahoo.com', 'proton.me'];
const SOURCES = [['direct', 26], ['instagram', 24], ['tiktok', 18], ['search', 16], ['reddit', 6], ['youtube', 5], ['email', 5]];
const REFERRERS = { instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/', search: 'https://www.google.com/', reddit: 'https://www.reddit.com/', youtube: 'https://www.youtube.com/', email: 'https://mail.google.com/', direct: null };

function weighted(rnd, pairs) {
  const total = pairs.reduce((sum, p) => sum + p[1], 0);
  let roll = rnd() * total;
  for (const [value, weight] of pairs) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

function dayStart(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
}

/* -------------------------------- seeding -------------------------------- */
function ensureAdmin() {
  const email = config.admin.email;
  const existing = q.get('SELECT id, password_hash FROM admins WHERE email = ?', email);
  const explicitPassword = process.env.ADMIN_PASSWORD;
  if (existing) {
    if (explicitPassword) q.run('UPDATE admins SET password_hash = ? WHERE id = ?', bcrypt.hashSync(explicitPassword, 12), existing.id);
    return;
  }
  q.run(
    'INSERT INTO admins (email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
    email, 'Store Owner', bcrypt.hashSync(DEMO_ADMIN_PASSWORD, 12), 'owner', Date.now()
  );
}

function seedProducts() {
  if (countProducts() > 0) return;
  const now = Date.now();
  tx(() => {
    PRODUCTS.forEach((p, index) => {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const description = [
        p.blurb,
        'Why it hits:',
        `• ${p.b1}`,
        `• ${p.b2}`,
        '',
        DESC_TAIL
      ].join('\n');
      const created = now - (PRODUCTS.length - index) * 86400000;
      const result = q.run(`
        INSERT INTO products (slug, name, tagline, description, category, price_cents, compare_at_cents,
          stock, emoji, gradient, rating, review_count, is_active, is_featured, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      `, slug, p.name, p.tagline, description, p.category, p.price, p.compare, p.stock, p.emoji,
        p.gradient, p.rating, p.reviews, p.featured, p.sort, created, now);
      writeProductImage({ slug, name: p.name, emoji: p.emoji, gradient: p.gradient, id: result.lastInsertRowid });
    });
  });
}

function seedPromos() {
  const hasAny = Number(q.get('SELECT COUNT(*) AS n FROM promotions').n);
  if (hasAny > 0) return;
  const now = Date.now();
  for (const promo of PROMOS) {
    q.run(`
      INSERT INTO promotions (code, type, value, min_subtotal_cents, active, uses, description, expires_at, created_at)
      VALUES (?, ?, ?, ?, 1, 0, ?, NULL, ?)
    `, promo.code, promo.type, promo.value, promo.min, promo.description, now);
  }
}

const RANK = { pending: 0, paid: 1, packed: 2, shipped: 3, delivered: 4 };

/**
 * Walks the fulfilment chain from the placed time and stops as soon as a stage
 * would land in the future — so demo orders never claim a status they can't have.
 */
function decideTimestamps(placed, status, rnd, now) {
  const out = { paid_at: null, packed_at: null, shipped_at: null, delivered_at: null, cancelled_at: null };
  if (status === 'cancelled' || status === 'refunded') {
    const t = placed + (1 + rnd() * 40) * 3600000;
    out.cancelled_at = Math.min(Math.max(t, placed + 60000), now - 30000);
    if (out.cancelled_at <= placed) out.cancelled_at = Math.max(placed, now - 30000);
    return out;
  }
  const target = RANK[status] ?? 0;
  const chain = [
    ['paid', 1, (1 + rnd() * 8) * 60000],
    ['packed', 2, (4 + rnd() * 16) * 3600000],
    ['shipped', 3, (5 + rnd() * 18) * 3600000],
    ['delivered', 4, (18 + rnd() * 54) * 3600000]
  ];
  let t = placed;
  for (const [key, rank, offset] of chain) {
    if (rank > target) break;
    t += offset;
    if (t > now) break;
    out[`${key}_at`] = Math.round(t);
  }
  return out;
}

function seedDemoData() {
  const now = Date.now();
  const rnd = mulberry32(20261029);
  const catalog = q.all('SELECT id, slug, name, price_cents, emoji, gradient FROM products ORDER BY id');
  if (!catalog.length) return;
  const settings = numericSettings();

  /* customers */
  const customerIds = [];
  tx(() => {
    PEOPLE.forEach(([name, city, state], i) => {
      const first = name.split(' ')[0].toLowerCase();
      const last = name.split(' ')[1].toLowerCase();
      const domain = EMAIL_DOMAINS[i % EMAIL_DOMAINS.length];
      const email = `${first}.${last}${i % 7 === 0 ? i : ''}@${domain}`;
      const phone = `(${200 + Math.floor(rnd() * 700)}) ${200 + Math.floor(rnd() * 700)}-${String(Math.floor(rnd() * 10000)).padStart(4, '0')}`;
      const created = dayStart(-13) + Math.floor(rnd() * 10 * 86400000);
      const res = q.run('INSERT INTO customers (email, name, phone, city, created_at) VALUES (?, ?, ?, ?, ?)',
        email, name, phone, city, Math.min(created, now));
      customerIds.push({ id: res.lastInsertRowid, name, email, city, state });
    });
  });

  /* orders + events */
  const activityRows = [];
  let seededOrders = 0;

  tx(() => {
    for (let dayOffset = -13; dayOffset <= 0; dayOffset++) {
      const base = dayStart(dayOffset);
      const weekend = [0, 6].includes(new Date(base).getDay());
      const ordersToday = 3 + Math.floor(rnd() * 5) + (dayOffset > -3 ? 2 : 0) + (weekend ? 2 : 0);

      for (let i = 0; i < ordersToday; i++) {
        let placed = base + Math.floor(rnd() * 20 * 3600000) + Math.floor(rnd() * 3600000);
        if (dayOffset === 0 || placed > now) {
          const span = Math.max(now - base, 600000);
          placed = base + Math.floor(rnd() * span);
        }
        if (placed > now - 60000) placed = now - 60000 - Math.floor(rnd() * 3600000);
        if (placed < now - 400 * 86400000) continue;

        const customer = customerIds[Math.floor(rnd() * customerIds.length)];

        const itemCount = 1 + Math.floor(rnd() * 3);
        const chosen = new Map();
        while (chosen.size < itemCount && chosen.size < catalog.length) {
          const p = catalog[Math.floor(rnd() * catalog.length)];
          chosen.set(p.id, { product: p, qty: 1 + (rnd() > 0.72 ? 1 : 0) });
        }
        const products = [...chosen.values()].map((c) => c.product);
        const quantities = new Map([...chosen.entries()].map(([id, c]) => [id, c.qty]));

        const deliveryMethod = rnd() > 0.78 ? 'express' : 'standard';
        let promo = null;
        const roll = rnd();
        if (roll > 0.72) {
          promo = q.get('SELECT * FROM promotions WHERE code = ?', rnd() > 0.5 ? 'GIFT10' : 'FREESHIP');
          if (promo && promo.min_subtotal_cents) {
            const sub = products.reduce((sum, p) => sum + p.price_cents * quantities.get(p.id), 0);
            if (sub < promo.min_subtotal_cents) promo = null;
          }
        }
        const pricing = priceCart({ products, quantities, deliveryMethod, promo, settings });

        const isCard = rnd() > 0.13;
        const statusRoll = rnd();
        let status;
        const ageH = (now - placed) / 3600000;
        if (ageH > 140) status = statusRoll < 0.86 ? 'delivered' : statusRoll < 0.92 ? 'shipped' : statusRoll < 0.96 ? 'refunded' : 'cancelled';
        else if (ageH > 96) status = statusRoll < 0.7 ? 'delivered' : statusRoll < 0.86 ? 'shipped' : statusRoll < 0.93 ? 'packed' : statusRoll < 0.97 ? 'cancelled' : 'refunded';
        else if (ageH > 48) status = statusRoll < 0.35 ? 'delivered' : statusRoll < 0.6 ? 'shipped' : statusRoll < 0.8 ? 'packed' : statusRoll < 0.94 ? 'paid' : 'cancelled';
        else if (ageH > 12) status = statusRoll < 0.12 ? 'delivered' : statusRoll < 0.42 ? 'shipped' : statusRoll < 0.68 ? 'packed' : statusRoll < 0.94 ? 'paid' : 'pending';
        else status = statusRoll < 0.2 ? 'packed' : statusRoll < 0.55 ? 'paid' : statusRoll < 0.92 ? 'pending' : 'cancelled';
        if (isCard && status === 'pending') status = 'paid';

        const stamps = decideTimestamps(placed, status, rnd, now);
        const terminal = status === 'cancelled' || status === 'refunded';
        const paidOut = stamps.paid_at;
        const effectiveStatus = terminal
          ? status
          : stamps.delivered_at ? 'delivered'
            : stamps.shipped_at ? 'shipped'
              : stamps.packed_at ? 'packed'
                : paidOut ? 'paid' : 'pending';

        const number = orderNumber();
        const brands = ['visa', 'mastercard', 'amex', 'discover'];
        const brand = isCard ? brands[Math.floor(rnd() * brands.length)] : null;
        const last4 = isCard ? String(1000 + Math.floor(rnd() * 8999)) : null;
        const paymentStatus = !isCard
          ? (effectiveStatus === 'pending' ? 'due' : (effectiveStatus === 'delivered' ? 'succeeded' : 'authorized'))
          : (effectiveStatus === 'cancelled' ? 'voided' : effectiveStatus === 'refunded' ? 'refunded' : 'succeeded');

        const shippedLike = effectiveStatus === 'shipped' || effectiveStatus === 'delivered';
        const carriers = ['UPS', 'FedEx', 'USPS', 'DHL'];
        const carrier = shippedLike ? carriers[Math.floor(rnd() * carriers.length)] : null;
        const tracking = shippedLike ? `${carrier === 'UPS' ? '1Z' : ''}${String(Math.floor(rnd() * 9e12) + 1e12)}` : null;

        const source = weighted(rnd, SOURCES);
        const itemCountTotal = [...quantities.values()].reduce((a, b) => a + b, 0);

        const inserted = q.run(`
          INSERT INTO orders (
            order_number, customer_id, email, name, phone, address1, address2, city, state, postal_code, country,
            subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, currency,
            status, payment_method, payment_status, payment_ref, payment_brand, payment_last4,
            promo_code, carrier, tracking_number, source, item_count, delivery_method, placed_at, updated_at, paid_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'US', ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          number, customer.id, customer.email, customer.name, `(555) ${100 + Math.floor(rnd() * 899)}-${1000 + Math.floor(rnd() * 8999)}`,
          `${100 + Math.floor(rnd() * 8800)} ${pick(rnd, ['Maple', 'Cedar', 'Juniper', 'Sunset', 'Oak', 'Harbor', 'Pixel', 'Willow'])} ${pick(rnd, ['St', 'Ave', 'Rd', 'Ln', 'Blvd'])}`,
          rnd() > 0.7 ? `Apt ${1 + Math.floor(rnd() * 400)}` : null,
          customer.city, customer.state, String(10000 + Math.floor(rnd() * 89999)),
          pricing.subtotalCents, pricing.discountCents, pricing.shippingCents, pricing.taxCents, pricing.totalCents,
          effectiveStatus, isCard ? 'card' : 'cod', paymentStatus,
          isCard ? `pay_demo_${randomToken(6)}` : null, brand, last4,
          pricing.promoCode, carrier, tracking, source, itemCountTotal, deliveryMethod,
          placed, stamps.cancelled_at || Math.max(stamps.delivered_at || stamps.shipped_at || stamps.packed_at || paidOut || placed, placed),
          paidOut || null
        );

        const orderId = inserted.lastInsertRowid;
        for (const [productId, qty] of quantities.entries()) {
          const p = products.find((x) => x.id === productId);
          const line = p.price_cents * qty;
          q.run(`INSERT INTO order_items (order_id, product_id, name, slug, emoji, gradient, unit_price_cents, qty, line_total_cents)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            orderId, p.id, p.name, p.slug, p.emoji, p.gradient, p.price_cents, qty, line);
        }

        q.run(`INSERT INTO analytics_events (type, path, referrer, source, visitor_id, revenue_cents, created_at)
               VALUES ('purchase', '/checkout', ?, ?, ?, ?, ?)`,
          REFERRERS[source], source, randomToken(6), pricing.totalCents, placed);

        activityRows.push({
          kind: 'order.placed',
          message: `${number} — ${customer.name} · $${(pricing.totalCents / 100).toFixed(2)}`,
          meta: JSON.stringify({ orderNumber: number, total: pricing.totalCents, status: effectiveStatus }),
          actor: 'storefront', at: placed
        });
        if (stamps.shipped_at) {
          activityRows.push({
            kind: 'order.status', message: `${number}: Packed → Shipped`,
            meta: JSON.stringify({ orderNumber: number, to: 'shipped' }),
            actor: 'ops@confetticlub.shop', at: stamps.shipped_at
          });
        }
        if (stamps.delivered_at) {
          activityRows.push({
            kind: 'order.status', message: `${number}: Shipped → Delivered`,
            meta: JSON.stringify({ orderNumber: number, to: 'delivered' }),
            actor: 'ops@confetticlub.shop', at: stamps.delivered_at
          });
        }
        if (terminal) {
          activityRows.push({
            kind: 'order.status', message: `${number}: ${effectiveStatus === 'refunded' ? 'Refund issued' : 'Order cancelled'}`,
            meta: JSON.stringify({ orderNumber: number, to: effectiveStatus }),
            actor: 'ops@confetticlub.shop', at: stamps.cancelled_at || placed
          });
        }
        seededOrders++;
      }
    }

    /* activity log (chronological) */
    activityRows.sort((a, b) => a.at - b.at);
    const baseline = [
      { kind: 'settings.updated', message: 'Store settings configured', actor: 'system', at: dayStart(-14) },
      { kind: 'promo.created', message: 'Promo GIFT10 created', actor: 'system', at: dayStart(-14) + 1000 },
      { kind: 'product.created', message: 'Catalog published with 26 products', actor: 'system', at: dayStart(-14) + 2000 }
    ];
    for (const row of [...baseline, ...activityRows]) {
      q.run('INSERT INTO activity_log (kind, message, meta, actor, created_at) VALUES (?, ?, ?, ?, ?)',
        row.kind, row.message, row.meta || null, row.actor || null, row.at);
    }

    /* traffic history */
    const HOUR_WEIGHTS = Array.from({ length: 24 }, (_, h) => [h,
      h < 6 ? 1 : h < 9 ? 3 : h < 11 ? 5 : h < 13 ? 8 : h < 16 ? 6 : h < 18 ? 7 : h < 21 ? 10 : h < 23 ? 9 : 4]);
    const pathPairs = [['/', 30], ['/shop', 28], ['product', 24], ['/cart', 8], ['/track', 5], ['/checkout', 5]];
    const slugs = catalog.map((p) => `/product/${p.slug}`);

    for (let dayOffset = -13; dayOffset <= 0; dayOffset++) {
      const base = dayStart(dayOffset);
      const weekend = [0, 6].includes(new Date(base).getDay());
      const growth = (dayOffset + 13) * 6;
      const visits = 170 + Math.floor(rnd() * 140) + (weekend ? 80 : 0) + growth;
      const pool = Array.from({ length: Math.max(12, Math.floor(visits / 2.4)) }, () => ({
        id: randomToken(6),
        source: weighted(rnd, SOURCES)
      }));
      const dayEnd = dayOffset === 0 ? now : base + 86400000;

      for (let i = 0; i < visits; i++) {
        const visitor = pool[Math.floor(rnd() * pool.length)];
        const hour = weighted(rnd, HOUR_WEIGHTS);
        let ts = base + hour * 3600000 + Math.floor(rnd() * 3600000);
        if (ts > dayEnd) ts = dayEnd - Math.floor(rnd() * 600000);
        if (ts > now || ts < base) continue;
        let path = weighted(rnd, pathPairs);
        if (path === 'product') path = slugs[Math.floor(rnd() * slugs.length)];
        q.run(`INSERT INTO analytics_events (type, path, referrer, source, visitor_id, revenue_cents, created_at)
               VALUES ('pageview', ?, ?, ?, ?, 0, ?)`,
          path, REFERRERS[visitor.source], visitor.source, visitor.id, ts);

        if (path.startsWith('/product/') && rnd() > 0.35) {
          q.run(`INSERT INTO analytics_events (type, path, referrer, source, visitor_id, revenue_cents, created_at)
                 VALUES ('product_view', ?, ?, ?, ?, 0, ?)`, path, REFERRERS[visitor.source], visitor.source, visitor.id, ts);
        }
        if (rnd() < 0.17) {
          q.run(`INSERT INTO analytics_events (type, path, referrer, source, visitor_id, revenue_cents, created_at)
                 VALUES ('add_to_cart', '/cart', ?, ?, ?, 0, ?)`, REFERRERS[visitor.source], visitor.source, visitor.id, ts);
        }
        if (rnd() < 0.06) {
          q.run(`INSERT INTO analytics_events (type, path, referrer, source, visitor_id, revenue_cents, created_at)
                 VALUES ('checkout_start', '/checkout', ?, ?, ?, 0, ?)`, REFERRERS[visitor.source], visitor.source, visitor.id, ts);
        }
      }
    }
  });

  q.run("INSERT INTO settings (key, value) VALUES ('demo_seeded', '1') ON CONFLICT(key) DO UPDATE SET value = '1'");
  console.log(`[seed] demo history: ${seededOrders} orders, ${customerIds.length} customers, traffic for 14 days`);
}

function seedAll({ fresh = false, demo = true } = {}) {
  if (fresh) {
    tx(() => {
      for (const table of ['order_items', 'orders', 'customers', 'analytics_events', 'activity_log', 'stock_movements', 'products', 'promotions', 'settings', 'admins']) {
        q.run(`DELETE FROM ${table}`);
      }
    });
    console.log('[seed] wiped all tables');
  }
  ensureAdmin();
  seedProducts();
  seedPromos();

  if (demo) {
    const already = q.get("SELECT value FROM settings WHERE key = 'demo_seeded'");
    const orderCount = Number(q.get('SELECT COUNT(*) AS n FROM orders').n);
    if (!already && orderCount === 0) seedDemoData();
  }
}

module.exports = { seedAll, ensureAdmin, PRODUCTS };

if (require.main === module) {
  const fresh = process.argv.includes('--fresh');
  seedAll({ fresh, demo: !process.argv.includes('--no-demo') });
  console.log(`[seed] done — ${countProducts()} products, ${q.get('SELECT COUNT(*) AS n FROM orders').n} orders, ${q.get('SELECT COUNT(*) AS n FROM analytics_events').n} events`);
  close();
}
