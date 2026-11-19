import type { FoodListing } from '@prisma/client';
import { PrismaClient, type FoodCategory, type Dietary, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&q=75&auto=format&fit=crop`;
let s = 42; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const H = 3600_000, D = 24 * H;
const code = () => String(1000 + Math.floor(rnd() * 9000));

type Food = { title: string; description: string; category: FoodCategory; dietary: Dietary; image: string; unit: string; kg: number; provider: number };
const FOODS: Food[] = [
  { title: 'Veg Biryani with Raita', description: 'Fragrant basmati veg biryani from today\'s lunch service, packed in sealed trays with cucumber raita on the side.', category: 'MEALS', dietary: 'VEG', image: img('1589302168068-964664d93dc0'), unit: 'servings', kg: 0.4, provider: 0 },
  { title: 'Chicken Dum Biryani', description: 'Leftover dinner batch of chicken dum biryani. Kept hot in chafing dishes — bring your own container if possible.', category: 'MEALS', dietary: 'NON_VEG', image: img('1631515243349-e0cb75fb8d3a'), unit: 'servings', kg: 0.45, provider: 1 },
  { title: 'Paneer & Dal Thali Combo', description: 'Paneer butter masala, dal tadka and jeera rice. Surplus from the hostel mess evening service.', category: 'MEALS', dietary: 'VEG', image: img('1585937421612-70a008356fbe'), unit: 'servings', kg: 0.5, provider: 1 },
  { title: 'Rainbow Buddha Bowls', description: 'Quinoa, chickpeas, roasted veggies and avocado. Prepared for a cancelled catering order — fully fresh.', category: 'MEALS', dietary: 'VEGAN', image: img('1512621776951-a57141f2eefd'), unit: 'bowls', kg: 0.45, provider: 2 },
  { title: 'Garden Salad Boxes', description: 'Mixed greens, cherry tomatoes and vinaigrette, boxed individually. Best eaten today.', category: 'FRUITS_VEG', dietary: 'VEGAN', image: img('1540189549336-e6e99c3679fe'), unit: 'boxes', kg: 0.3, provider: 2 },
  { title: 'Artisan Sourdough Loaves', description: 'Day-old sourdough and multigrain loaves, still great for sandwiches and toast.', category: 'BAKERY', dietary: 'VEGAN', image: img('1509440159596-0249088772ff'), unit: 'loaves', kg: 0.6, provider: 3 },
  { title: 'Assorted Pastries & Buns', description: 'Croissants, cinnamon buns and veg puffs from the evening display counter.', category: 'BAKERY', dietary: 'VEG', image: img('1517433670267-08bbd4be890f'), unit: 'pieces', kg: 0.12, provider: 3 },
  { title: 'Glazed Donuts Box', description: 'Assorted glazed and sprinkle donuts. Boxes of 6.', category: 'DESSERTS', dietary: 'VEG', image: img('1551024601-bec78aea704b'), unit: 'boxes', kg: 0.5, provider: 3 },
  { title: 'Punjabi Samosas', description: 'Crispy potato-pea samosas with mint chutney, from the canteen snack counter.', category: 'SNACKS', dietary: 'VEG', image: img('1601050690597-df0568f70950'), unit: 'pieces', kg: 0.1, provider: 0 },
  { title: 'Grilled Veg Sandwiches', description: 'Grilled cheese & veggie sandwiches, individually wrapped.', category: 'SNACKS', dietary: 'VEG', image: img('1528735602780-2552fd46c7af'), unit: 'pieces', kg: 0.2, provider: 0 },
  { title: 'Seasonal Fruit Platter', description: 'Cut papaya, pineapple, melon and grapes in sealed cups from the breakfast buffet.', category: 'FRUITS_VEG', dietary: 'VEGAN', image: img('1490474418585-ba9bad8fd0ea'), unit: 'cups', kg: 0.25, provider: 1 },
  { title: 'Strawberry Yogurt Parfaits', description: 'Greek yogurt, granola and strawberry compote. Refrigerated.', category: 'DAIRY', dietary: 'VEG', image: img('1488477181946-6428a0291777'), unit: 'cups', kg: 0.2, provider: 2 },
  { title: 'Butter Chicken & Naan', description: 'Restaurant-quality butter chicken with two naans per portion. From a large party booking.', category: 'MEALS', dietary: 'NON_VEG', image: img('1585937421612-70a008356fbe'), unit: 'servings', kg: 0.5, provider: 4 },
  { title: 'Shrimp Garlic Pasta', description: 'Spaghetti with garlic shrimp and cherry tomatoes. Surplus from lunch buffet.', category: 'MEALS', dietary: 'NON_VEG', image: img('1563379926898-05f4575a45d8'), unit: 'servings', kg: 0.4, provider: 4 },
  { title: 'Mixed Kebab Platter', description: 'Seekh and tikka kebabs with onions and green chutney.', category: 'MEALS', dietary: 'NON_VEG', image: img('1555939594-58d7cb561ad1'), unit: 'platters', kg: 0.6, provider: 4 },
  { title: 'Cold Coffee Bottles', description: 'Sealed 300 ml cold coffee bottles nearing best-before date.', category: 'BEVERAGES', dietary: 'VEG', image: img('1495474472287-4d71bcdd2085'), unit: 'bottles', kg: 0.3, provider: 2 },
  { title: 'Red Velvet Cake Slices', description: 'Cake slices from a department event, kept refrigerated.', category: 'DESSERTS', dietary: 'VEG', image: img('1565958011703-44f9829ba187'), unit: 'slices', kg: 0.15, provider: 3 },
  { title: 'Fresh Veg Crate (Surplus Stock)', description: 'Tomatoes, capsicum, carrots and greens — excess from today\'s kitchen order. Ideal for NGO kitchens.', category: 'FRUITS_VEG', dietary: 'VEGAN', image: img('1488459716781-31db52582fe9'), unit: 'kg', kg: 1, provider: 1 },
  { title: 'Masala Pancake Stack', description: 'Breakfast surplus from the café — fluffy pancakes with honey.', category: 'BAKERY', dietary: 'VEG', image: img('1567620905732-2d1ec7ab7445'), unit: 'plates', kg: 0.3, provider: 2 },
  { title: 'Veggie Burgers', description: 'Grilled veggie patty burgers, assembled for a fest stall that closed early.', category: 'SNACKS', dietary: 'VEG', image: img('1571091718767-18b5b1457add'), unit: 'pieces', kg: 0.25, provider: 0 },
];

const LOCATIONS = [
  ['Central Cafeteria, Gate 2 counter', 'Central Cafeteria back entrance (loading bay)'],
  ['Hostel 7 Mess, kitchen side door', 'Hostel 7 Mess, dining hall entrance'],
  ['The Green Bowl Café, Academic Block C', 'Green Bowl Café pickup window'],
  ['Crust & Crumb Bakery, Campus Market Shop 4', 'Crust & Crumb, rear counter'],
  ['Spice Route Restaurant, 12 University Road', 'Spice Route, staff entrance'],
];

async function main() {
  await prisma.notification.deleteMany();
  await prisma.foodRequest.deleteMany();
  await prisma.foodListing.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);
  const mk = (name: string, email: string, role: Role, organization: string | null, campus: string | null) =>
    prisma.user.create({ data: { name, email, role, organization, campus, passwordHash, createdAt: new Date(Date.now() - 70 * D) } });

  const providers = await Promise.all([
    mk('Ravi Menon', 'cafeteria@foodwise.demo', 'PROVIDER', 'Central Cafeteria', 'North Campus'),
    mk('Anita Sharma', 'hostel@foodwise.demo', 'PROVIDER', 'Hostel 7 Mess', 'North Campus'),
    mk('Kabir Singh', 'greenbowl@foodwise.demo', 'PROVIDER', 'The Green Bowl Café', 'South Campus'),
    mk('Meera Iyer', 'bakery@foodwise.demo', 'PROVIDER', 'Crust & Crumb Bakery', 'Campus Market'),
    mk('Arjun Rao', 'restaurant@foodwise.demo', 'PROVIDER', 'Spice Route Restaurant', 'University Road'),
  ]);
  const students = await Promise.all([
    mk('Priya Patel', 'student@foodwise.demo', 'STUDENT', null, 'North Campus'),
    mk('Rahul Verma', 'rahul@foodwise.demo', 'STUDENT', null, 'North Campus'),
    mk('Sneha Reddy', 'sneha@foodwise.demo', 'STUDENT', null, 'South Campus'),
    mk('Aditya Kumar', 'aditya@foodwise.demo', 'STUDENT', null, 'South Campus'),
    mk('Fatima Khan', 'fatima@foodwise.demo', 'STUDENT', null, 'North Campus'),
    mk('Vikram Joshi', 'vikram@foodwise.demo', 'STUDENT', null, 'Campus Market'),
  ]);
  const ngos = await Promise.all([
    mk('Sunita Das', 'ngo@foodwise.demo', 'NGO', 'Annapurna Food Bank', 'City-wide'),
    mk('Joseph Mathew', 'feedinghands@foodwise.demo', 'NGO', 'Feeding Hands Foundation', 'City-wide'),
    mk('Neha Gupta', 'rotibank@foodwise.demo', 'NGO', 'Roti Bank Collective', 'East District'),
  ]);
  const recipients = [...students, ...ngos];

  // ---- History: completed listings over the last 8 weeks (growing trend) ----
  const now = Date.now();
  for (let day = 56; day >= 1; day--) {
    const perDay = day > 35 ? (rnd() < 0.6 ? 1 : 0) : day > 14 ? 1 + (rnd() < 0.4 ? 1 : 0) : 2 + (rnd() < 0.5 ? 1 : 0);
    for (let k = 0; k < perDay; k++) {
      const f = pick(FOODS);
      const created = now - day * D + (11 + Math.floor(rnd() * 8)) * H;
      const qty = f.unit === 'kg' ? 8 + Math.floor(rnd() * 15) : 10 + Math.floor(rnd() * 40);
      const expired = rnd() < 0.08;
      const listing = await prisma.foodListing.create({ data: {
        providerId: providers[f.provider].id, title: f.title, description: f.description, category: f.category, dietary: f.dietary,
        imageUrl: f.image, unit: f.unit, kgPerUnit: f.kg, quantity: qty, remaining: 0,
        preparedAt: new Date(created - 2 * H), createdAt: new Date(created), pickupLocation: pick(LOCATIONS[f.provider]),
        deadline: new Date(created + 4 * H), status: expired ? 'EXPIRED' : 'COMPLETED',
      } });
      let left = qty;
      if (expired) { await prisma.foodListing.update({ where: { id: listing.id }, data: { remaining: Math.ceil(qty * 0.6) } }); left = Math.floor(qty * 0.4); }
      while (left > 0) {
        const who = pick(recipients);
        const take = who.role === 'NGO' ? Math.min(left, 10 + Math.floor(rnd() * 20)) : Math.min(left, 1 + Math.floor(rnd() * 3));
        left -= take;
        const reqAt = created + (10 + Math.floor(rnd() * 60)) * 60_000;
        await prisma.foodRequest.create({ data: {
          listingId: listing.id, requesterId: who.id, quantity: take, pickupCode: code(), status: 'COLLECTED',
          createdAt: new Date(reqAt), decidedAt: new Date(reqAt + 10 * 60_000), collectedAt: new Date(reqAt + (40 + rnd() * 90) * 60_000),
        } });
      }
    }
  }

  // ---- Live listings (active now) ----
  const live: { f: number; qty: number; prepAgo: number; deadlineIn: number }[] = [
    { f: 0, qty: 40, prepAgo: 1.5, deadlineIn: 3 },
    { f: 1, qty: 25, prepAgo: 1, deadlineIn: 0.75 },
    { f: 3, qty: 18, prepAgo: 0.5, deadlineIn: 5 },
    { f: 5, qty: 30, prepAgo: 10, deadlineIn: 8 },
    { f: 6, qty: 45, prepAgo: 3, deadlineIn: 4 },
    { f: 8, qty: 60, prepAgo: 1, deadlineIn: 2.5 },
    { f: 10, qty: 24, prepAgo: 2, deadlineIn: 3.5 },
    { f: 12, qty: 35, prepAgo: 1, deadlineIn: 6 },
    { f: 15, qty: 20, prepAgo: 6, deadlineIn: 24 },
    { f: 17, qty: 15, prepAgo: 2, deadlineIn: 7 },
    { f: 19, qty: 22, prepAgo: 0.5, deadlineIn: 2 },
    { f: 11, qty: 16, prepAgo: 1, deadlineIn: 4.5 },
  ];
  const liveListings: FoodListing[] = [];
  for (const l of live) {
    const f = FOODS[l.f];
    liveListings.push(await prisma.foodListing.create({ data: {
      providerId: providers[f.provider].id, title: f.title, description: f.description, category: f.category, dietary: f.dietary,
      imageUrl: f.image, unit: f.unit, kgPerUnit: f.kg, quantity: l.qty, remaining: l.qty,
      preparedAt: new Date(now - l.prepAgo * H), createdAt: new Date(now - Math.min(l.prepAgo, 1) * H),
      pickupLocation: LOCATIONS[f.provider][0], deadline: new Date(now + l.deadlineIn * H),
    } }));
  }

  // Requests on live listings: pending, approved (reserved), collected
  const [priya] = students; const [annapurna] = ngos;
  async function req(listingIdx: number, user: typeof priya, qty: number, status: 'PENDING' | 'APPROVED' | 'COLLECTED' | 'REJECTED', message?: string) {
    const l = liveListings[listingIdx];
    const r = await prisma.foodRequest.create({ data: {
      listingId: l.id, requesterId: user.id, quantity: qty, message, pickupCode: code(), status,
      createdAt: new Date(now - (20 + rnd() * 30) * 60_000),
      decidedAt: status !== 'PENDING' ? new Date(now - 10 * 60_000) : null,
      collectedAt: status === 'COLLECTED' ? new Date(now - 5 * 60_000) : null,
    } });
    if (status === 'APPROVED' || status === 'COLLECTED') {
      await prisma.foodListing.update({ where: { id: l.id }, data: { remaining: { decrement: qty } } });
    }
    return r;
  }
  await req(0, priya, 2, 'APPROVED', 'Will come by after my 3pm lab!');
  await req(0, students[1], 3, 'PENDING', 'For me and my roommates');
  await req(0, annapurna, 20, 'PENDING', 'We can pick up with our van within the hour.');
  await req(1, ngos[1], 15, 'APPROVED', 'Sending a volunteer now.');
  await req(1, students[2], 2, 'COLLECTED');
  await req(2, students[3], 1, 'PENDING');
  await req(4, ngos[2], 20, 'PENDING', 'For our evening distribution at the shelter.');
  await req(5, priya, 3, 'PENDING');
  await req(5, students[4], 2, 'APPROVED');
  await req(6, students[5], 2, 'REJECTED');
  await req(7, annapurna, 15, 'APPROVED', 'Feeding 60 kids at our learning centre tonight.');

  // A couple of recently expired listings
  for (const fi of [13, 16]) {
    const f = FOODS[fi];
    await prisma.foodListing.create({ data: {
      providerId: providers[f.provider].id, title: f.title, description: f.description, category: f.category, dietary: f.dietary,
      imageUrl: f.image, unit: f.unit, kgPerUnit: f.kg, quantity: 12, remaining: 12,
      preparedAt: new Date(now - 9 * H), createdAt: new Date(now - 8 * H), pickupLocation: LOCATIONS[f.provider][0],
      deadline: new Date(now - 2 * H), status: 'EXPIRED',
    } });
  }

  // Notifications
  const n = (userId: string, type: string, title: string, body: string, link: string, minsAgo: number, read = false) =>
    prisma.notification.create({ data: { userId, type, title, body, link, read, createdAt: new Date(now - minsAgo * 60_000) } });
  await n(priya.id, 'APPROVED', 'Request approved 🎉', `Pick up 2 servings of "Veg Biryani with Raita" at Central Cafeteria, Gate 2 counter. Check the listing for your pickup code.`, `/food/${liveListings[0].id}`, 10);
  await n(priya.id, 'COLLECTED', 'Pickup confirmed ✅', 'You rescued 3 pieces of "Punjabi Samosas". Thank you for fighting food waste!', '/impact', 60 * 26, true);
  await n(annapurna.id, 'APPROVED', 'Request approved 🎉', `Pick up 15 servings of "Butter Chicken & Naan" at Spice Route Restaurant.`, `/food/${liveListings[7].id}`, 15);
  await n(providers[0].id, 'NEW_REQUEST', 'New food request', 'Sunita Das requested 20 servings of "Veg Biryani with Raita".', '/dashboard', 8);
  await n(providers[0].id, 'NEW_REQUEST', 'New food request', 'Rahul Verma requested 3 servings of "Veg Biryani with Raita".', '/dashboard', 18);
  await n(students[5].id, 'REJECTED', 'Request declined', 'Your request for "Seasonal Fruit Platter" was declined: Reserved for the hostel residents first.', `/food/${liveListings[6].id}`, 30);

  const counts = { users: await prisma.user.count(), listings: await prisma.foodListing.count(), requests: await prisma.foodRequest.count() };
  console.log('Seeded', counts);
}

main().finally(() => prisma.$disconnect());
