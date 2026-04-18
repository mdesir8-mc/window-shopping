// Window Shopping — data model and seed content
// Hierarchy: Closet → Section → Item. Seasons are a mandatory tag.

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'F/W', 'S/S'];

// Warm-toned placeholder palette (for product tile gradients)
const PLACEHOLDER_TONES = [
  ['#E8DDD0', '#C9B8A4'], // cream
  ['#D9CFC0', '#A8957E'], // taupe
  ['#EADFD0', '#D4B896'], // sand
  ['#C5B5A0', '#8E7A63'], // bronze
  ['#E5D9C8', '#B09A7F'], // wheat
  ['#D1C2AE', '#9A8569'], // stone
  ['#F0E6D6', '#CBB99F'], // bone
  ['#BCA890', '#7D6B54'], // walnut
  ['#DFD2BE', '#B59E82'], // linen
  ['#C9BBA3', '#8A7860'], // oat
  ['#E2D3BD', '#A88B6A'], // camel
  ['#B8A488', '#73604A'], // espresso
];

const CLOSETS = [
  {
    id: 'main',
    name: 'Main Wardrobe',
    subtitle: 'Everyday staples & repeat-wears',
    itemCount: 47,
    cover: 0,
    accent: '#8B7A63',
    tags: ['minimalist', 'neutrals', 'investment'],
    sections: [
      {
        id: 's1', name: 'Knitwear', count: 12,
        tags: ['wool', 'cashmere'],
      },
      {
        id: 's2', name: 'Denim', count: 8,
        tags: ['raw', 'vintage'],
      },
      {
        id: 's3', name: 'Outerwear', count: 6,
        tags: ['structured'],
      },
      {
        id: 's4', name: 'Shoes', count: 9,
        tags: ['leather', 'flats'],
      },
    ],
  },
  {
    id: 'wishlist',
    name: 'Wishlist',
    subtitle: 'Saved for later',
    itemCount: 23,
    cover: 1,
    accent: '#A89684',
    tags: ['dreaming'],
    sections: [
      { id: 'w1', name: 'Splurges', count: 5, tags: ['investment'] },
      { id: 'w2', name: 'On Sale', count: 11, tags: ['watch-price'] },
      { id: 'w3', name: 'Someday', count: 7, tags: [] },
    ],
  },
  {
    id: 'occasion',
    name: 'Occasion',
    subtitle: 'Weddings, events, travel',
    itemCount: 18,
    cover: 2,
    accent: '#9B8878',
    tags: ['formal', 'eveningwear'],
    sections: [
      { id: 'o1', name: 'Black Tie', count: 4, tags: ['formal'] },
      { id: 'o2', name: 'Cocktail', count: 7, tags: ['semi-formal'] },
      { id: 'o3', name: 'Travel Fits', count: 7, tags: ['vacation'] },
    ],
  },
  {
    id: 'vintage',
    name: 'Vintage Hunt',
    subtitle: 'Grails & one-of-a-kinds',
    itemCount: 14,
    cover: 3,
    accent: '#735F4A',
    tags: ['archive', 'rare'],
    sections: [
      { id: 'v1', name: 'Archive', count: 6, tags: ['90s', '2000s'] },
      { id: 'v2', name: 'Thrifted', count: 8, tags: [] },
    ],
  },
];

// Items — using realistic fashion inventory names, placeholder imagery
const ITEMS = [
  {
    id: 'i1', closet: 'main', section: 's1',
    brand: 'Toteme', name: 'Oversized Wool Cardigan',
    price: '$690', currency: 'USD',
    source: 'toteme-studio.com', addedAt: '3d ago',
    season: 'F/W', tags: ['wool', 'oversized', 'cream', 'layering'],
    tone: 0,
    desc: 'Dropped shoulder, ribbed cuff, single-breasted.',
    colors: ['Cream', 'Oat'],
  },
  {
    id: 'i2', closet: 'main', section: 's1',
    brand: 'The Row', name: 'Cashmere Crewneck',
    price: '$1,290', source: 'therow.com', addedAt: '1w ago',
    season: 'Winter', tags: ['cashmere', 'neutral', 'basic'],
    tone: 1,
    desc: 'Grade-A Mongolian cashmere. Relaxed boyfriend fit.',
    colors: ['Camel'],
  },
  {
    id: 'i3', closet: 'main', section: 's1',
    brand: "Lauren Manoogian", name: 'Alpaca Pullover',
    price: '$520', source: 'laurenmanoogian.com', addedAt: '2w ago',
    season: 'F/W', tags: ['alpaca', 'handknit'],
    tone: 2,
    colors: ['Stone'],
  },
  {
    id: 'i4', closet: 'main', section: 's2',
    brand: 'Khaite', name: 'Danielle High-Rise',
    price: '$480', source: 'khaite.com', addedAt: '5d ago',
    season: 'S/S', tags: ['denim', 'straight-leg', 'raw'],
    tone: 3,
    colors: ['Indigo'],
  },
  {
    id: 'i5', closet: 'main', section: 's2',
    brand: 'Agolde', name: 'Criss Cross Upsize',
    price: '$248', source: 'agolde.com', addedAt: '1mo ago',
    season: 'Spring', tags: ['denim', 'vintage-wash'],
    tone: 4,
    colors: ['Faded Blue'],
  },
  {
    id: 'i6', closet: 'main', section: 's3',
    brand: 'Lemaire', name: 'Wool Raglan Coat',
    price: '$1,860', source: 'lemaire.fr', addedAt: '2d ago',
    season: 'Winter', tags: ['wool', 'oversized', 'investment'],
    tone: 5,
    desc: 'Italian wool-blend, hidden placket, raglan sleeve.',
    colors: ['Dark Ash'],
  },
  {
    id: 'i7', closet: 'main', section: 's3',
    brand: 'Arket', name: 'Belted Trench',
    price: '$299', source: 'arket.com', addedAt: '3w ago',
    season: 'S/S', tags: ['cotton', 'classic'],
    tone: 6,
    colors: ['Beige'],
  },
  {
    id: 'i8', closet: 'main', section: 's4',
    brand: 'Margaux', name: 'The Demi Flat',
    price: '$245', source: 'margauxny.com', addedAt: '4d ago',
    season: 'S/S', tags: ['leather', 'flats', 'everyday'],
    tone: 7,
    colors: ['Buttermilk'],
  },
  {
    id: 'i9', closet: 'main', section: 's4',
    brand: 'Dragon Diffusion', name: 'Santa Croce Basket',
    price: '$395', source: 'dragondiffusion.com', addedAt: '6d ago',
    season: 'Summer', tags: ['leather', 'woven', 'bag'],
    tone: 8,
    colors: ['Tan'],
  },
  // Wishlist
  {
    id: 'i10', closet: 'wishlist', section: 'w1',
    brand: 'Loro Piana', name: 'Summer Walk Loafer',
    price: '$895', source: 'loropiana.com', addedAt: '2d ago',
    season: 'S/S', tags: ['suede', 'grail', 'splurge'],
    tone: 9,
    colors: ['Charcoal'],
  },
  {
    id: 'i11', closet: 'wishlist', section: 'w2',
    brand: 'Ganni', name: 'Ruched Midi Dress',
    price: '$325', originalPrice: '$465', source: 'ganni.com', addedAt: '1w ago',
    season: 'Spring', tags: ['cotton', 'on-sale', 'print'],
    tone: 10,
    colors: ['Buttercream'],
  },
  {
    id: 'i12', closet: 'wishlist', section: 'w3',
    brand: 'Hermès', name: 'Oran Sandal',
    price: '$760', source: 'hermes.com', addedAt: '1mo ago',
    season: 'Summer', tags: ['leather', 'someday', 'grail'],
    tone: 11,
    colors: ['Gold'],
  },
];

// Tag library — user's collected tags across the app, with counts
const TAG_LIBRARY = [
  { name: 'wool', count: 8, color: '#8B7A63' },
  { name: 'cashmere', count: 5, color: '#A89684' },
  { name: 'leather', count: 12, color: '#735F4A' },
  { name: 'denim', count: 9, color: '#6B7D8F' },
  { name: 'oversized', count: 7, color: '#9B8878' },
  { name: 'minimalist', count: 14, color: '#8B7A63' },
  { name: 'neutral', count: 22, color: '#B09A7F' },
  { name: 'vintage', count: 6, color: '#735F4A' },
  { name: 'investment', count: 11, color: '#5A4A38' },
  { name: 'grail', count: 4, color: '#2A2018' },
  { name: 'on-sale', count: 8, color: '#8A6B4F' },
  { name: 'layering', count: 6, color: '#A89684' },
];

Object.assign(window, {
  SEASONS, PLACEHOLDER_TONES, CLOSETS, ITEMS, TAG_LIBRARY,
});
