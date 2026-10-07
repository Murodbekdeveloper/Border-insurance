import type { Locale } from '@/store/localeStore';

// Shared by every backend reference list that comes back with a name per
// supported UI language (countries, insurance durations/periods, kinship
// degrees — see backend's reference-translations.ts MultiLangMaps/
// translateMultiLang). `name` is always the Uzbek translation; the rest are
// optional since a few of the smaller lists only cover the ids actually
// observed from Asia Insurance so far.
export interface MultiLangNamed {
  name: string;
  nameRu?: string;
  nameEn?: string;
  nameKy?: string;
  nameZh?: string;
}

// Picks the right display name for the active UI locale, falling back to
// the Uzbek `name` for any language we don't have a static translation for.
export function localizedName(item: MultiLangNamed, locale: Locale): string {
  switch (locale) {
    case 'ru':
      return item.nameRu ?? item.name;
    case 'en':
      return item.nameEn ?? item.name;
    case 'ky':
      return item.nameKy ?? item.name;
    case 'zh':
      return item.nameZh ?? item.name;
    default:
      return item.name;
  }
}

// All known names joined, so typing in any script/language this app
// supports finds the right item regardless of the active UI locale.
export function localizedSearchText(item: MultiLangNamed): string {
  return [item.name, item.nameRu, item.nameEn, item.nameKy, item.nameZh].filter(Boolean).join(' ');
}
