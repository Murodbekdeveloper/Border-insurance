import {
  COUNTRY_NAME_UZ,
  FOREIGN_VEHICLE_DURATION_NAME_UZ,
  FOREIGN_VEHICLE_DURATION_NAME_EN,
  FOREIGN_VEHICLE_DURATION_NAME_KY,
  FOREIGN_VEHICLE_DURATION_NAME_ZH,
  PERIOD_NAME_UZ,
  PERIOD_NAME_EN,
  PERIOD_NAME_KY,
  PERIOD_NAME_ZH,
  RELATIVE_NAME_UZ,
  RELATIVE_NAME_EN,
  RELATIVE_NAME_KY,
  RELATIVE_NAME_ZH,
} from './reference-translations';
import { COUNTRY_NAME_EN } from './country-names-en';
import { COUNTRY_NAME_KY } from './country-names-ky';
import { COUNTRY_NAME_ZH } from './country-names-zh';

// Each *_NAME_UZ map is the source of truth for which ids a reference list
// covers; the EN/KY/ZH siblings must cover exactly the same ids, or
// localizedName() on the frontend silently falls back to Uzbek for
// whichever ids were missed — see MultiLangMaps' own comment on why that's
// not caught by the type system. This test is the catch for it: it fails
// loudly instead, naming exactly which ids are missing, on any map edit
// (including a future 6th language) that doesn't keep all four in sync.
function expectSameKeys(
  label: string,
  uz: Record<number, unknown>,
  others: Record<string, Record<number, unknown>>,
) {
  const uzKeys = Object.keys(uz).sort();
  for (const [lang, map] of Object.entries(others)) {
    const keys = Object.keys(map).sort();
    const missing = uzKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !uzKeys.includes(k));
    expect({ label, lang, missing, extra }).toEqual({
      label,
      lang,
      missing: [],
      extra: [],
    });
  }
}

describe('reference-translations key-set parity', () => {
  it('COUNTRY_NAME_*: en/ky/zh cover exactly the same ids as uz', () => {
    expectSameKeys('country', COUNTRY_NAME_UZ, {
      en: COUNTRY_NAME_EN,
      ky: COUNTRY_NAME_KY,
      zh: COUNTRY_NAME_ZH,
    });
  });

  it('FOREIGN_VEHICLE_DURATION_NAME_*: en/ky/zh cover exactly the same ids as uz', () => {
    expectSameKeys('foreignVehicleDuration', FOREIGN_VEHICLE_DURATION_NAME_UZ, {
      en: FOREIGN_VEHICLE_DURATION_NAME_EN,
      ky: FOREIGN_VEHICLE_DURATION_NAME_KY,
      zh: FOREIGN_VEHICLE_DURATION_NAME_ZH,
    });
  });

  it('PERIOD_NAME_*: en/ky/zh cover exactly the same ids as uz', () => {
    expectSameKeys('period', PERIOD_NAME_UZ, {
      en: PERIOD_NAME_EN,
      ky: PERIOD_NAME_KY,
      zh: PERIOD_NAME_ZH,
    });
  });

  it('RELATIVE_NAME_*: en/ky/zh cover exactly the same ids as uz', () => {
    expectSameKeys('relative', RELATIVE_NAME_UZ, {
      en: RELATIVE_NAME_EN,
      ky: RELATIVE_NAME_KY,
      zh: RELATIVE_NAME_ZH,
    });
  });
});
