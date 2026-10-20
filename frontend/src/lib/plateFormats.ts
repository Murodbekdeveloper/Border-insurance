// Real-world plate-number example per country, for vehicle-info's plate
// number field placeholder — once a non-resident applicant picks their
// citizenship, the example shown should match a format they'd actually
// recognize (e.g. Kyrgyzstan's own "01 123 ABC"), not always Uzbekistan's
// "01 A 123 AA". Verified against each country's own Wikipedia "Vehicle
// registration plates of ..." page (not guessed). Keyed by the same
// Apex_Box country id used throughout reference-translations.ts.
//
// Scope: only the Central Asian/CIS countries most relevant to this
// border-insurance app's actual traffic are covered — doing this reliably
// for all ~240 countries would mean guessing most of them, which is worse
// than a neutral, clearly-not-Uzbek-specific fallback. Add more here only
// once their format has actually been checked against a real source.
export const PLATE_NUMBER_EXAMPLE: Record<number, string> = {
  210: '01 A 123 BC', // Uzbekistan
  98: '01 123 ABC', // Kyrgyzstan
  90: '689 BAK 45', // Kazakhstan
  196: '1234 AB 01', // Tajikistan
  207: 'AB 12 34 MR', // Turkmenistan
  171: 'A 123 BC 777', // Russia
};

export const DEFAULT_PLATE_NUMBER_EXAMPLE = 'AB 123 CD';
