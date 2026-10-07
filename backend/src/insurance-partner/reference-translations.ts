import { COUNTRY_NAME_EN } from './country-names-en';
import { COUNTRY_NAME_KY } from './country-names-ky';
import { COUNTRY_NAME_ZH } from './country-names-zh';

// Asia Insurance's own reference endpoints (both osago_v3 and Apex_Box)
// return these names in Russian only — confirmed against their live
// responses, there is no Uzbek field anywhere in this data. These static
// id -> name maps translate them before they reach the frontend. Any id not
// in a map falls back to the original (Russian) name rather than
// disappearing — covers an item Asia Insurance adds on their side later.
// Countries and the smaller reference lists (durations/periods/relatives)
// all get EN/KY/ZH translations too, since the app's UI supports 5
// languages — see translateMultiLang below. Countries' EN/KY/ZH live in
// their own files (country-names-en/ky/zh.ts, 247 entries each); the
// smaller lists keep theirs inline next to the Uzbek map below.

// GET /apex-box/countries (Apex_Box's /countries) — for a non-resident
// applicant's citizenshipId. Keyed by their numeric id, not the name, since
// that's stable across languages.
export const COUNTRY_NAME_UZ: Record<number, string> = {
  1: 'Avstraliya',
  3: 'Avstriya',
  4: 'Ozarbayjon',
  6: 'Albaniya',
  7: 'Jazoir',
  9: 'Angilya',
  10: 'Angola',
  11: 'Andorra',
  12: 'Antarktida',
  13: 'Antigua va Barbuda',
  14: 'Niderlandiya Antil orollari',
  15: 'Makao',
  16: 'Argentina',
  17: 'Armaniston',
  18: 'Aruba',
  19: "Afg'oniston",
  20: 'Bagama orollari',
  21: 'Bangladesh',
  22: 'Barbados',
  23: 'Bahrayn',
  24: 'Beliz',
  25: 'Belarus',
  26: 'Belgiya',
  27: 'Benin',
  28: 'Bermuda orollari',
  29: 'Bolgariya',
  30: 'Boliviya',
  31: 'Bosniya va Gersegovina',
  32: 'Botsvana',
  33: 'Braziliya',
  34: 'Britaniyaning Hind okeanidagi hududi',
  35: 'Bruney',
  36: 'Buve oroli',
  37: 'Burkina-Faso',
  38: 'Burundi',
  39: 'Butan',
  40: 'Vanuatu',
  41: 'Vatikan',
  42: 'Buyuk Britaniya (Birlashgan Qirollik)',
  43: 'Vengriya',
  44: 'Venesuela',
  45: 'Virjiniya orollari (AQSH)',
  46: 'Britaniya Virjiniya orollari',
  47: 'Sharqiy Samoa',
  48: 'Sharqiy Timor',
  49: 'Vetnam',
  50: 'Gabon',
  51: 'Gaiti',
  52: 'Gayana',
  53: 'Gambiya',
  54: 'Gana',
  55: 'Gvadelupa',
  56: 'Gvatemala',
  57: 'Gviana',
  58: 'Gvineya',
  59: 'Gvineya-Bisau',
  60: 'Germaniya',
  61: 'Gibraltar',
  62: 'Gonduras',
  63: 'Grenada',
  64: 'Grenlandiya',
  65: 'Gretsiya',
  66: 'Gruziya',
  67: 'Guam',
  68: 'Daniya',
  69: 'Jibuti',
  70: 'Dominika',
  71: 'Dominikan Respublikasi',
  72: 'Misr',
  73: 'Kongo',
  74: 'Zambiya',
  75: "G'arbiy Sahroi Kabir",
  76: 'Samoa',
  77: 'Zimbabve',
  78: 'Isroil',
  79: 'Hindiston',
  80: 'Indoneziya',
  81: 'Iordaniya',
  82: 'Iroq',
  83: 'Eron',
  84: 'Irlandiya',
  85: 'Islandiya',
  86: 'Ispaniya',
  87: 'Italiya',
  88: 'Yaman',
  89: 'Kabo-Verde',
  90: "Qozog'iston",
  91: 'Kayman orollari',
  92: 'Kambodja',
  93: 'Kamerun',
  94: 'Kanada',
  95: 'Qatar',
  96: 'Keniya',
  97: 'Kipr',
  98: "Qirg'iziston",
  99: 'Kiribati',
  100: 'Xitoy',
  101: 'Kokos orollari',
  102: 'Kolumbiya',
  103: 'Komor orollari',
  104: 'Koreya Xalq Demokratik Respublikasi (Shimoliy Koreya)',
  105: 'Kosta-Rika',
  106: "Kot-d'Ivuar",
  107: 'Kuba',
  108: 'Kuvayt',
  109: 'Laos',
  110: 'Latviya',
  111: 'Lesoto',
  112: 'Liberiya',
  113: 'Livan',
  114: 'Liviya',
  115: 'Litva',
  116: 'Lixtenshteyn',
  117: 'Lyuksemburg',
  118: 'Mavrikiy',
  119: 'Mavritaniya',
  120: 'Madagaskar',
  121: 'Makedoniya (Shimoliy Makedoniya)',
  122: 'Malavi',
  123: 'Malayziya',
  124: 'Mali',
  125: 'Kichik Tinch okeani orollari',
  126: 'Maldiv orollari',
  127: 'Malta',
  128: 'Mariana orollari',
  129: 'Marokash',
  130: 'Martinika',
  131: 'Marshall orollari',
  132: 'Meksika',
  133: 'Mikroneziya',
  134: 'Mozambik',
  135: 'Moldova',
  136: 'Monako',
  137: 'Mongoliya',
  138: 'Monserrat',
  139: 'Myanma',
  140: 'Namibiya',
  141: 'Nauru',
  142: 'Nepal',
  143: 'Niger',
  144: 'Nigeriya',
  145: 'Niderlandiya',
  146: 'Nikaragua',
  147: 'Niue',
  148: 'Yangi Zelandiya',
  149: 'Yangi Kaledoniya',
  150: 'Norvegiya',
  151: 'Norfolk oroli',
  152: 'Birlashgan Arab Amirliklari',
  153: 'Ummon',
  154: 'Men oroli',
  155: 'Rojdestvo oroli',
  156: 'Muqaddas Yelena oroli',
  157: 'Kuk orollari',
  158: 'Pokiston',
  159: 'Palau',
  160: 'Panama',
  161: 'Papua-Yangi Gvineya',
  162: 'Paragvay',
  163: 'Peru',
  164: 'Pitkern',
  165: 'Polsha',
  166: 'Portugaliya',
  167: 'Puerto-Riko',
  168: 'Koreya (Janubiy Koreya)',
  169: 'Ekvatorial Gvineya',
  170: 'Reyunon',
  171: 'Rossiya',
  172: 'Ruanda',
  173: 'Ruminiya',
  174: 'El-Salvador',
  175: 'San-Marino',
  176: 'San-Tome va Prinsipi',
  177: 'Saudiya Arabistoni',
  178: 'Svazilend (Esvatini)',
  179: 'Seyshel orollari',
  180: 'Sen-Pyer va Mikelon',
  181: 'Senegal',
  182: 'Sent-Vinsent va Grenadin',
  183: 'Sent-Kits va Nevis',
  184: 'Sent-Lyusiya',
  185: 'Singapur',
  186: 'Suriya',
  187: 'Slovakiya',
  188: 'Sloveniya',
  189: 'Solomon orollari',
  190: 'Somali',
  191: 'Sudan',
  192: 'Surinam',
  193: "Amerika Qo'shma Shtatlari",
  194: 'Syerra-Leone',
  195: 'Gonkong',
  196: 'Tojikiston',
  197: 'Tailand',
  198: 'Tayvan',
  199: 'Tanzaniya',
  200: 'Terks va Kaykos orollari',
  201: 'Togo',
  202: 'Tokelau',
  203: 'Tonga',
  204: 'Trinidad va Tobago',
  205: 'Tuvalu',
  206: 'Tunis',
  207: 'Turkmaniston',
  208: 'Turkiya',
  209: 'Uganda',
  210: "O'zbekiston",
  211: 'Ukraina',
  212: 'Uollis va Futuna',
  213: 'Urugvay',
  214: 'Farer orollari',
  215: 'Fiji',
  216: 'Filippin',
  217: 'Finlyandiya',
  218: 'Folklend orollari',
  219: 'Fransiya',
  220: 'Fransuz Polineziyasi',
  221: 'Fransiyaning janubiy hududlari',
  222: 'Xerd va Makdonald orollari',
  223: 'Xorvatiya',
  224: 'Markaziy Afrika Respublikasi',
  225: 'Chad',
  226: 'Chexiya',
  227: 'Chili',
  228: 'Shveytsariya',
  229: 'Shvetsiya',
  230: 'Shpitsbergen va Yan-Mayen',
  231: 'Shri-Lanka',
  232: 'Ekvador',
  233: 'Eritreya',
  234: 'Estoniya',
  235: 'Efiopiya',
  236: 'Janubiy Afrika Respublikasi',
  237: 'Yamayka',
  238: 'Yaponiya',
  239: "Noma'lum",
  240: 'Mayotta',
  241: 'Janubiy Georgiya va Janubiy Sendvich orollari',
  242: 'Oland orollari',
  243: 'Falastin hududi',
  244: 'Chernogoriya',
  245: 'Serbiya',
  246: 'Gernsi',
  247: 'Jersi',
  248: 'Boshqa',
  249: 'Yevropa Ittifoqi',
  9999: 'Barcha davlatlar',
};

// GET /apex-box/foreign-vehicle-durations (Apex_Box's
// /osago_references_foreign_vehicles_policy_duration) — for
// cost.foreignVehicleId, the foreign-vehicle policy duration.
export const FOREIGN_VEHICLE_DURATION_NAME_UZ: Record<number, string> = {
  1: '15 kungacha',
  2: '16 kundan 2 oygacha',
  13: '1 yil',
};
export const FOREIGN_VEHICLE_DURATION_NAME_EN: Record<number, string> = {
  1: 'Up to 15 days',
  2: '16 days to 2 months',
  13: '1 year',
};
export const FOREIGN_VEHICLE_DURATION_NAME_KY: Record<number, string> = {
  1: '15 күнгө чейин',
  2: '16 күндөн 2 айга чейин',
  13: '1 жыл',
};
export const FOREIGN_VEHICLE_DURATION_NAME_ZH: Record<number, string> = {
  1: '15天以内',
  2: '16天至2个月',
  13: '1年',
};

// GET /insurance-partner/periods (osago_v3's /get-period) — domestic
// policy duration. CONFIRMED 2026-09-16 against the live endpoint: only
// "Один год"/"Шесть месяцев" observed so far (period ids 1/2) — any other
// id falls back to their raw Russian name, same as every other map here.
export const PERIOD_NAME_UZ: Record<number, string> = {
  1: '1 yil',
  2: '6 oy',
};
export const PERIOD_NAME_EN: Record<number, string> = {
  1: '1 year',
  2: '6 months',
};
export const PERIOD_NAME_KY: Record<number, string> = {
  1: '1 жыл',
  2: '6 ай',
};
export const PERIOD_NAME_ZH: Record<number, string> = {
  1: '1年',
  2: '6个月',
};

// GET /insurance-partner/relatives (osago_v3's /get-relative) — driver's
// degree of kinship to the vehicle owner.
export const RELATIVE_NAME_UZ: Record<number, string> = {
  0: '-',
  1: 'Ota',
  2: 'Ona',
  3: 'Er',
  4: 'Xotin',
  5: "O'g'il",
  6: 'Qiz',
  7: 'Aka',
  8: 'Uka',
  9: 'Opa',
  10: 'Singil',
};
export const RELATIVE_NAME_EN: Record<number, string> = {
  0: '-',
  1: 'Father',
  2: 'Mother',
  3: 'Husband',
  4: 'Wife',
  5: 'Son',
  6: 'Daughter',
  7: 'Older brother',
  8: 'Younger brother',
  9: 'Older sister',
  10: 'Younger sister',
};
export const RELATIVE_NAME_KY: Record<number, string> = {
  0: '-',
  1: 'Ата',
  2: 'Эне',
  3: 'Күйөө',
  4: 'Аял',
  5: 'Уул',
  6: 'Кыз',
  7: 'Ага',
  8: 'Ини',
  9: 'Эже',
  10: 'Сиңди',
};
export const RELATIVE_NAME_ZH: Record<number, string> = {
  0: '-',
  1: '父亲',
  2: '母亲',
  3: '丈夫',
  4: '妻子',
  5: '儿子',
  6: '女儿',
  7: '哥哥',
  8: '弟弟',
  9: '姐姐',
  10: '妹妹',
};

// Value type is explicitly `| undefined` (rather than relying on
// noUncheckedIndexedAccess, which isn't enabled project-wide) so
// `maps.en[key]` etc. below is honestly typed as possibly-missing instead
// of silently claiming every id is covered — each map only covers the ids
// actually observed from Asia Insurance/Apex_Box, not every id that could
// ever appear.
export interface MultiLangMaps {
  uz: Record<number, string | undefined>;
  en: Record<number, string | undefined>;
  ky: Record<number, string | undefined>;
  zh: Record<number, string | undefined>;
}

export type WithMultiLangNames<T> = T & {
  nameRu: string;
  nameEn?: string;
  nameKy?: string;
  nameZh?: string;
};

// Shared by every reference list this app shows in all 5 supported UI
// languages (see LanguageSwitcher/useTranslation): keeps every language's
// name on the item instead of discarding everything but one — nameRu is
// Asia Insurance's own original (their API only ever returns Russian),
// nameEn/nameKy/nameZh are our static translations. `getKey` extracts
// whichever field each list is actually keyed by (id for countries/
// durations, relative/period for the other two — Asia Insurance's own
// inconsistent field naming, not ours). The frontend's localizedName()/
// localizedSearchText() (lib/i18n/multiLang.ts) pick the right one to
// display/search by the active locale.
function translateMultiLang<T extends { name: string }>(
  items: T[],
  getKey: (item: T) => number,
  maps: MultiLangMaps,
): WithMultiLangNames<T>[] {
  return items.map((item) => {
    const key = getKey(item);
    const translatedUz = maps.uz[key];
    return {
      ...item,
      name: translatedUz ?? item.name,
      nameRu: item.name,
      nameEn: maps.en[key],
      nameKy: maps.ky[key],
      nameZh: maps.zh[key],
    };
  });
}

const COUNTRY_MAPS: MultiLangMaps = {
  uz: COUNTRY_NAME_UZ,
  en: COUNTRY_NAME_EN,
  ky: COUNTRY_NAME_KY,
  zh: COUNTRY_NAME_ZH,
};

const FOREIGN_VEHICLE_DURATION_MAPS: MultiLangMaps = {
  uz: FOREIGN_VEHICLE_DURATION_NAME_UZ,
  en: FOREIGN_VEHICLE_DURATION_NAME_EN,
  ky: FOREIGN_VEHICLE_DURATION_NAME_KY,
  zh: FOREIGN_VEHICLE_DURATION_NAME_ZH,
};

const PERIOD_MAPS: MultiLangMaps = {
  uz: PERIOD_NAME_UZ,
  en: PERIOD_NAME_EN,
  ky: PERIOD_NAME_KY,
  zh: PERIOD_NAME_ZH,
};

const RELATIVE_MAPS: MultiLangMaps = {
  uz: RELATIVE_NAME_UZ,
  en: RELATIVE_NAME_EN,
  ky: RELATIVE_NAME_KY,
  zh: RELATIVE_NAME_ZH,
};

export function translateCountryItems<T extends { id: number | string; name: string }>(
  items: T[],
): WithMultiLangNames<T>[] {
  return translateMultiLang(items, (item) => Number(item.id), COUNTRY_MAPS);
}

export function translateForeignVehicleDurationItems<
  T extends { id: number | string; name: string },
>(items: T[]): WithMultiLangNames<T>[] {
  return translateMultiLang(items, (item) => Number(item.id), FOREIGN_VEHICLE_DURATION_MAPS);
}

export function translatePeriodItems<T extends { period: number; name: string }>(
  items: T[],
): WithMultiLangNames<T>[] {
  return translateMultiLang(items, (item) => item.period, PERIOD_MAPS);
}

export function translateRelativeItems<T extends { relative: number; name: string }>(
  items: T[],
): WithMultiLangNames<T>[] {
  return translateMultiLang(items, (item) => item.relative, RELATIVE_MAPS);
}
