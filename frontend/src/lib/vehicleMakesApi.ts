// NHTSA'ning bepul, ochiq vPIC avtomobil ma'lumotlar bazasi
// (vpic.nhtsa.dot.gov) — CAR_MODELS_BY_BRAND'dagi O'zbekiston bozori uchun
// qo'lda tuzilgan ro'yxatni TO'LDIRISH uchun, uni almashtirmaydi. Ro'yxatda
// yo'q brend/model uchun foydalanuvchi baribir qo'lda kirita olardi
// (BrandModelFields) — bu faqat shu tanlovni kengaytiradi va osonlashtiradi.
// Natijalar sahifa sessiyasi davomida xotirada keshlanadi.

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// NHTSA'ning "barcha markalar" ro'yxati (GetAllMakes) o'n mingdan ortiq
// yozuvdan iborat va asosan haqiqiy avtomobil ishlab chiqaruvchilari emas
// (masalan mayda tirkama/furgon ustaxonalari) — shuning uchun faqat
// nisbatan toza natija beradigan transport turlari bo'yicha so'raladi.
const VEHICLE_TYPES_FOR_MAKES = ['car', 'truck', 'bus', 'multipurpose passenger vehicle (mpv)'];

// NHTSA markalarni katta harflarda qaytaradi (masalan "MERCEDES-BENZ").
// Aksariyat uchun oddiy "Title Case" yetarli, lekin bir nechta mashhur
// qisqartma brendlar katta harfda qolishi kerak.
const KNOWN_ACRONYMS = new Set(['BMW', 'GMC', 'MG', 'RAM', 'AMC', 'FAW', 'BAIC', 'SAIC', 'JAC', 'GAC', 'BYD', 'DS']);

function toTitleCase(name: string): string {
  const upper = name.toUpperCase();
  if (KNOWN_ACRONYMS.has(upper)) return upper;
  return name
    .toLowerCase()
    .split(/([\s-])/)
    .map((part) => (part === ' ' || part === '-' || part === '' ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

interface NhtsaMakeResult {
  MakeName: string;
}

interface NhtsaModelResult {
  Model_Name: string;
}

interface NhtsaResponse<T> {
  Results: T[];
}

let makesPromise: Promise<string[]> | null = null;

// NHTSA'dan bir nechta transport turi bo'yicha markalarni oladi, takrorlanishni
// olib tashlaydi va alifbo tartibida qaytaradi. Tarmoq xatosi bo'lsa bo'sh
// ro'yxat qaytaradi (chaqiruvchi tomon buni mavjud qo'lda tuzilgan ro'yxat
// bilan birlashtiradi, shuning uchun bu xato emas — shunchaki kengaytirish
// bo'lmaydi).
export function fetchAllCarMakes(): Promise<string[]> {
  if (!makesPromise) {
    makesPromise = Promise.all(
      VEHICLE_TYPES_FOR_MAKES.map((type) =>
        fetch(`${NHTSA_BASE}/GetMakesForVehicleType/${encodeURIComponent(type)}?format=json`)
          .then((res) => (res.ok ? (res.json() as Promise<NhtsaResponse<NhtsaMakeResult>>) : { Results: [] }))
          .then((data) => data.Results.map((r) => r.MakeName))
          .catch(() => [] as string[]),
      ),
    ).then((lists) => {
      const unique = new Map<string, string>();
      for (const list of lists) {
        for (const raw of list) {
          const key = raw.toLowerCase();
          if (!unique.has(key)) unique.set(key, toTitleCase(raw));
        }
      }
      return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
    });
  }
  return makesPromise;
}

const modelsCache = new Map<string, Promise<string[]>>();

// Berilgan marka uchun NHTSA'dan modellar ro'yxatini oladi (har bir marka
// uchun faqat bir marta so'raladi, natija keshlanadi).
export function fetchModelsForMake(make: string): Promise<string[]> {
  const key = make.trim().toLowerCase();
  if (!key) return Promise.resolve([]);
  if (!modelsCache.has(key)) {
    modelsCache.set(
      key,
      fetch(`${NHTSA_BASE}/GetModelsForMake/${encodeURIComponent(make)}?format=json`)
        .then((res) => (res.ok ? (res.json() as Promise<NhtsaResponse<NhtsaModelResult>>) : { Results: [] }))
        .then((data) => {
          const unique = new Map<string, string>();
          for (const r of data.Results) {
            const name = r.Model_Name.trim();
            if (!name) continue;
            const normalizedKey = name.toLowerCase();
            if (!unique.has(normalizedKey)) unique.set(normalizedKey, name);
          }
          return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
        })
        .catch(() => [] as string[]),
    );
  }
  return modelsCache.get(key) as Promise<string[]>;
}
