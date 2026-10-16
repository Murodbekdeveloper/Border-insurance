// Brend -> shu brendning O'zbekiston/MDH bozorida keng tarqalgan modellari.
// Ro'yxatda yo'q model uchun foydalanuvchi qo'lda ham kiritishi mumkin (BrandModelFields'dagi
// "qo'lda kiritish" varianti orqali), shuning uchun bu yerda dunyodagi *har bir* modelni
// sanab chiqish shart emas — faqat eng ko'p uchraydigan brend/modellar qamrab olingan.
export const CAR_MODELS_BY_BRAND: Record<string, string[]> = {
  Chevrolet: [
    'Cobalt', 'Nexia 3', 'Gentra', 'Malibu 2', 'Malibu XL', 'Spark', 'Lacetti',
    'Damas', 'Matiz', 'Onix', 'Tracker', 'Captiva', 'Equinox', 'Trailblazer',
    'Orlando', 'Aveo', 'Epica', 'Traverse',
  ],
  Daewoo: ['Tico', 'Nexia', 'Matiz', 'Damas', 'Lanos', 'Espero', 'Labo'],
  Ravon: ['R2', 'R4', 'Nexia R3', 'Matiz'],
  Lada: ['Granta', 'Vesta', 'Priora', 'Niva', 'Largus', 'Kalina', 'XRAY', '2107', '2114', '2110'],
  UAZ: ['Patriot', 'Hunter', 'Buxanka (452)', 'Pikap'],
  Toyota: [
    'Camry', 'Corolla', 'Land Cruiser', 'Land Cruiser Prado', 'RAV4', 'Highlander',
    'Avalon', 'Yaris', 'Hilux', 'Fortuner', 'C-HR', 'Prius',
  ],
  Lexus: ['RX', 'ES', 'LX', 'GX', 'NX', 'LS', 'IS'],
  Honda: ['Accord', 'Civic', 'CR-V', 'Pilot', 'Odyssey', 'HR-V'],
  Nissan: ['Altima', 'X-Trail', 'Patrol', 'Qashqai', 'Murano', 'Pathfinder', 'Sentra', 'Maxima'],
  Mazda: ['6', 'CX-5', 'CX-9', '3', 'CX-30'],
  Mitsubishi: ['Outlander', 'Pajero', 'Lancer', 'ASX', 'Pajero Sport'],
  Subaru: ['Forester', 'Outback', 'Legacy', 'XV', 'Impreza'],
  Suzuki: ['Vitara', 'Swift', 'Jimny', 'Grand Vitara'],
  Kia: [
    'Cerato', 'Sportage', 'Rio', 'K5', 'Sorento', 'Seltos', 'Optima', 'Soul', 'Picanto', 'Sonet',
  ],
  Hyundai: [
    'Solaris', 'Elantra', 'Tucson', 'Sonata', 'Santa Fe', 'Accent', 'Creta', 'Palisade', 'Starex', 'i30',
  ],
  BYD: ['Song Plus', 'Han', 'Tang', 'Atto 3', 'Qin Plus', 'Seal', 'Dolphin', 'F3'],
  Chery: ['Tiggo 7 Pro', 'Tiggo 8 Pro', 'Arrizo 5', 'Tiggo 4'],
  Haval: ['Jolion', 'F7', 'H6', 'Dargo'],
  Geely: ['Coolray', 'Monjaro', 'Emgrand', 'Atlas'],
  Changan: ['CS35 Plus', 'CS55 Plus', 'Eado', 'UNI-T'],
  Exeed: ['TXL', 'VX', 'LX'],
  JAC: ['JS4', 'JS8', 'S3'],
  GAC: ['GS4', 'GS8', 'Emzoom'],
  MG: ['ZS', 'HS', '5'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLE', 'GLC', 'Sprinter', 'Vito', 'Actros'],
  BMW: ['3 Series', '5 Series', 'X5', 'X3', '7 Series'],
  Audi: ['A4', 'A6', 'Q5', 'Q7'],
  Volkswagen: ['Passat', 'Tiguan', 'Polo', 'Jetta', 'Golf'],
  Skoda: ['Octavia', 'Rapid', 'Kodiaq', 'Fabia'],
  Ford: ['Focus', 'Explorer', 'Ranger', 'Transit'],
  Opel: ['Astra', 'Corsa', 'Vectra'],
  Renault: ['Duster', 'Logan', 'Sandero', 'Arkana'],
  Peugeot: ['408', '3008', '2008'],
  Volvo: ['XC60', 'XC90', 'S60'],
  'Land Rover': ['Range Rover', 'Discovery', 'Defender'],
  Jeep: ['Grand Cherokee', 'Wrangler', 'Compass'],
  Porsche: ['Cayenne', 'Macan', 'Panamera'],
  Fiat: ['Albea', 'Linea', 'Doblo'],
  Tesla: ['Model 3', 'Model Y', 'Model S'],
  Isuzu: ['NQR', 'Elf', 'Forward', 'D-Max'],
  GAZ: ['Gazelle Next', 'Gazelle Business', 'Sobol'],
  KamAZ: ['5320', '65115', '43118'],
  MAN: ['TGX', 'TGS', 'TGL'],
  Scania: ['R-series', 'P-series'],
  // NHTSA's vPIC database is US-market-only, so it has no entries for
  // Volvo Trucks' European/global lineup (FH, FM, ...) — only this curated
  // list covers them. A completely separate brand from "Volvo" (passenger
  // cars) despite the shared name prefix; see findBrand's longest-match
  // comment for why that distinction matters here.
  'Volvo Truck': ['FH', 'FM', 'FMX', 'FL', 'FE'],
  // Not sold in the US either (PACCAR's DAF brand is Europe/CIS-only —
  // its US range is sold as Kenworth/Peterbilt instead), so same NHTSA gap
  // as Volvo Truck above.
  DAF: ['XF', 'CF', 'LF'],
};

export const CAR_BRANDS = Object.keys(CAR_MODELS_BY_BRAND);

// Butun brendi yuk mashinasi/og'ir texnika bo'lgan brendlar — shu brenddagi
// har qanday model "og'ir" hisoblanadi.
const HEAVY_VEHICLE_BRANDS = new Set<string>(['Isuzu', 'GAZ', 'KamAZ', 'MAN', 'Scania', 'Volvo Truck', 'DAF']);

// Aksariyat modeli yengil avtomobil bo'lgan brendlarda ham ayrim aniq
// modellar (furgon/pikap/yuk mashinasi) og'ir hisoblanadi — shuning uchun
// tekshiruv faqat brend emas, aniq "Brend Model" qiymati darajasida ishlaydi.
const HEAVY_VEHICLE_MODELS = new Set<string>([
  'Mercedes-Benz Sprinter',
  'Mercedes-Benz Vito',
  'Mercedes-Benz Actros',
  'Ford Transit',
  'Ford Ranger',
  'UAZ Buxanka (452)',
  'UAZ Pikap',
  'Toyota Hilux',
]);

// Picks the longest (most specific) CAR_BRANDS entry matching the start of
// fullModelValue, not just the first one in list order — needed because one
// brand name can be a prefix of another, unrelated brand (e.g. "Volvo"
// passenger cars vs. "Volvo Truck", a completely different, heavy-vehicle
// manufacturer). A first-match search would stop at "Volvo" for a value
// like "Volvo Truck FH" and misclassify a semi-truck as a light car.
function findBrand(fullModelValue: string): string | undefined {
  const matches = CAR_BRANDS.filter(
    (b) => fullModelValue === b || fullModelValue.startsWith(`${b} `),
  );
  return matches.sort((a, b) => b.length - a.length)[0];
}

export function getVehicleDefaultsForModel(fullModelValue: string): {
  vehicleType: 'yengil_avtomobil' | 'yuk_mashinasi';
  weightCategory: 'yengil' | 'og\'ir';
} {
  const brand = findBrand(fullModelValue);
  const isHeavy =
    (brand && HEAVY_VEHICLE_BRANDS.has(brand)) ||
    HEAVY_VEHICLE_MODELS.has(fullModelValue);
  if (isHeavy) {
    return { vehicleType: 'yuk_mashinasi', weightCategory: 'og\'ir' };
  }
  return { vehicleType: 'yengil_avtomobil', weightCategory: 'yengil' };
}

// Og'irlik toifasi narx hisob-kitobi uchun backendga kerak, lekin transport
// turidan to'g'ridan-to'g'ri kelib chiqadi — foydalanuvchidan alohida
// so'ralmaydi.
const HEAVY_VEHICLE_TYPES = new Set<string>([
  'yuk_mashinasi',
  'avtobus',
  'pritsep',
  'maxsus_texnika',
]);

export function getWeightCategoryForVehicleType(vehicleType: string): 'yengil' | 'og\'ir' {
  return HEAVY_VEHICLE_TYPES.has(vehicleType) ? 'og\'ir' : 'yengil';
}

export function guessBrand(value: string): string | null {
  return findBrand(value) ?? null;
}
