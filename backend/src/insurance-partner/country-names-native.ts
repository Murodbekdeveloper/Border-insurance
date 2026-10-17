// Each country's name in its OWN primary/titular national language — not a
// translation into one of this app's 5 UI languages (compare
// country-names-en/ky/zh.ts, which translate every country's name into one
// fixed target language each). Used so the citizenship picker always shows
// e.g. Uzbekistan as "O‘zbekiston" and Japan as "日本", regardless of which
// UI language is active — see reference-translations.ts's
// translateCountryItems (nameNative) and frontend/src/app/resident-type/
// page.tsx's option label.
//
// Sourced from the "world-countries" npm package (name.native, MIT
// licensed) — same ids as COUNTRY_NAME_UZ. For a country with several
// genuinely co-official languages (e.g. Switzerland, Singapore), up to 3
// unique native names are joined with " / "; for a former-USSR state where
// world-countries also lists Russian as a co-official language alongside
// the titular one, only the titular language is kept (so Uzbekistan reads
// "O‘zbekiston", not "Узбекистан / O‘zbekiston"). Any id missing here
// (Antarctica, and a few non-national entries like "All countries") has no
// native-language name to show — callers fall back to the Uzbek name.
export const COUNTRY_NAME_NATIVE: Record<number, string> = {
  1: 'Australia', // Australia
  3: 'Österreich', // Austria
  4: 'Azərbaycan', // Azerbaijan
  6: 'Shqipëria', // Albania
  7: 'الجزائر', // Algeria
  9: 'Anguilla', // Anguilla
  10: 'Angola', // Angola
  11: 'Andorra', // Andorra
  13: 'Antigua and Barbuda', // Antigua and Barbuda
  15: 'Macau / 澳门', // Macau
  16: 'Argentina', // Argentina
  17: 'Հայաստան', // Armenia
  18: 'Aruba', // Aruba
  19: 'افغانستان / Owganystan', // Afghanistan
  20: 'Bahamas', // Bahamas
  21: 'বাংলাদেশ', // Bangladesh
  22: 'Barbados', // Barbados
  23: 'البحرين', // Bahrain
  24: 'Belize / Belice', // Belize
  25: 'Белару́сь', // Belarus
  26: 'Belgien / Belgique / België', // Belgium
  27: 'Bénin', // Benin
  28: 'Bermuda', // Bermuda
  29: 'България', // Bulgaria
  30: 'Wuliwya / Volívia / Buliwya', // Bolivia
  31: 'Bosna i Hercegovina / Боснa и Херцеговина', // Bosnia and Herzegovina
  32: 'Botswana', // Botswana
  33: 'Brasil', // Brazil
  34: 'British Indian Ocean Territory', // British Indian Ocean Territory
  35: 'Negara Brunei Darussalam', // Brunei
  36: 'Bouvetøya', // Bouvet Island
  37: 'Burkina Faso', // Burkina Faso
  38: 'Burundi / Uburundi', // Burundi
  39: 'འབྲུག་ཡུལ་', // Bhutan
  40: 'Vanuatu', // Vanuatu
  41: 'Vaticano / Vaticanæ', // Vatican City
  42: 'United Kingdom', // United Kingdom
  43: 'Magyarország', // Hungary
  44: 'Venezuela', // Venezuela
  45: 'United States Virgin Islands', // US Virgin Islands
  46: 'British Virgin Islands', // British Virgin Islands
  47: 'American Samoa / Sāmoa Amelika', // American Samoa
  48: 'Timor-Leste / Timór-Leste', // East Timor
  49: 'Việt Nam', // Vietnam
  50: 'Gabon', // Gabon
  51: 'Haïti / Ayiti', // Haiti
  52: 'Guyana', // Guyana
  53: 'Gambia', // Gambia
  54: 'Ghana', // Ghana
  55: 'Guadeloupe', // Guadeloupe
  56: 'Guatemala', // Guatemala
  57: 'Guyane française', // French Guiana
  58: 'Guinée', // Guinea
  59: 'Guiné-Bissau', // Guinea-Bissau
  60: 'Deutschland', // Germany
  61: 'Gibraltar', // Gibraltar
  62: 'Honduras', // Honduras
  63: 'Grenada', // Grenada
  64: 'Kalaallit Nunaat', // Greenland
  65: 'Ελλάδα', // Greece
  66: 'საქართველო', // Georgia
  67: 'Guåhån / Guam', // Guam
  68: 'Danmark', // Denmark
  69: 'جيبوتي / Djibouti', // Djibouti
  70: 'Dominica', // Dominica
  71: 'República Dominicana', // Dominican Republic
  72: 'مصر', // Egypt
  73: 'République du Congo / Repubilika ya Kongo / Republíki ya Kongó', // Congo
  74: 'Zambia', // Zambia
  75: 'Western Sahara / الصحراء الغربية / Sahara Occidental', // Western Sahara
  76: 'Samoa / Sāmoa', // Samoa
  77: 'Zimbabwe', // Zimbabwe
  78: 'إسرائيل / ישראל', // Israel
  79: 'India / भारत / இந்தியா', // India
  80: 'Indonesia', // Indonesia
  81: 'الأردن', // Jordan
  82: 'العراق / ܩܘܼܛܢܵܐ / کۆماری', // Iraq
  83: 'ایران', // Iran
  84: 'Ireland / Éire', // Ireland
  85: 'Ísland', // Iceland
  86: 'España', // Spain
  87: 'Italia', // Italy
  88: 'اليمن', // Yemen
  89: 'Cabo Verde', // Cape Verde
  90: 'Қазақстан', // Kazakhstan
  91: 'Cayman Islands', // Cayman Islands
  92: 'Kâmpŭchéa', // Cambodia
  93: 'Cameroon / Cameroun', // Cameroon
  94: 'Canada', // Canada
  95: 'قطر', // Qatar
  96: 'Kenya', // Kenya
  97: 'Κύπρος / Kıbrıs', // Cyprus
  98: 'Кыргызстан', // Kyrgyzstan
  99: 'Kiribati', // Kiribati
  100: '中国', // China
  101: 'Cocos (Keeling) Islands', // Cocos Islands
  102: 'Colombia', // Colombia
  103: 'جزر القمر / Comores / Komori', // Comoros
  104: '조선', // North Korea
  105: 'Costa Rica', // Costa Rica
  106: "Côte d'Ivoire", // Ivory Coast
  107: 'Cuba', // Cuba
  108: 'الكويت', // Kuwait
  109: 'ສປປລາວ', // Laos
  110: 'Latvija', // Latvia
  111: 'Lesotho', // Lesotho
  112: 'Liberia', // Liberia
  113: 'لبنان / Liban', // Lebanon
  114: 'ليبيا', // Libya
  115: 'Lietuva', // Lithuania
  116: 'Liechtenstein', // Liechtenstein
  117: 'Luxemburg / Luxembourg / Lëtzebuerg', // Luxembourg
  118: 'Mauritius / Maurice / Moris', // Mauritius
  119: 'موريتانيا', // Mauritania
  120: 'Madagascar / Madagasikara', // Madagascar
  121: 'Македонија', // North Macedonia
  122: 'Malawi / Malaŵi', // Malawi
  123: 'Malaysia / مليسيا', // Malaysia
  124: 'Mali', // Mali
  125: 'United States Minor Outlying Islands', // United States Minor Outlying Islands
  126: 'ދިވެހިރާއްޖޭގެ', // Maldives
  127: 'Malta', // Malta
  128: 'Northern Mariana Islands / Na Islas Mariånas', // Northern Mariana Islands
  129: 'المغرب / ⵍⵎⴰⵖⵔⵉⴱ', // Morocco
  130: 'Martinique', // Martinique
  131: 'Marshall Islands / M̧ajeļ', // Marshall Islands
  132: 'México', // Mexico
  133: 'Micronesia', // Micronesia
  134: 'Moçambique', // Mozambique
  135: 'Moldova', // Moldova
  136: 'Monaco', // Monaco
  137: 'Монгол улс', // Mongolia
  138: 'Montserrat', // Montserrat
  139: 'မြန်မာ', // Myanmar
  140: 'Namibië / Namibia', // Namibia
  141: 'Nauru', // Nauru
  142: 'नेपाल', // Nepal
  143: 'Niger', // Niger
  144: 'Nigeria', // Nigeria
  145: 'Nederland', // Netherlands
  146: 'Nicaragua', // Nicaragua
  147: 'Niue / Niuē', // Niue
  148: 'New Zealand / Aotearoa', // New Zealand
  149: 'Nouvelle-Calédonie', // New Caledonia
  150: 'Noreg / Norge / Norgga', // Norway
  151: "Norfolk Island / Norf'k Ailen", // Norfolk Island
  152: 'الإمارات', // United Arab Emirates
  153: 'عمان', // Oman
  154: 'Isle of Man / Mannin', // Isle of Man
  155: 'Christmas Island', // Christmas Island
  156: 'Saint Helena, Ascension and Tristan da Cunha', // Saint Helena
  157: "Cook Islands / Kūki 'Āirani", // Cook Islands
  158: 'Pakistan / پاكستان', // Pakistan
  159: 'Palau / Belau', // Palau
  160: 'Panamá', // Panama
  161: 'Papua New Guinea / Papua Niu Gini / Papua Niugini', // Papua New Guinea
  162: 'Paraguái / Paraguay', // Paraguay
  163: 'Piruw / Perú', // Peru
  164: 'Pitcairn Islands', // Pitcairn Islands
  165: 'Polska', // Poland
  166: 'Portugal', // Portugal
  167: 'Puerto Rico', // Puerto Rico
  168: '한국', // South Korea
  169: 'Guinée équatoriale / Guiné Equatorial / Guinea Ecuatorial', // Equatorial Guinea
  170: 'La Réunion', // Reunion
  171: 'Россия', // Russia
  172: 'Rwanda', // Rwanda
  173: 'România', // Romania
  174: 'El Salvador', // El Salvador
  175: 'San Marino', // San Marino
  176: 'São Tomé e Príncipe', // Sao Tome and Principe
  177: 'السعودية', // Saudi Arabia
  178: 'Eswatini / eSwatini', // Eswatini
  179: 'Sesel / Seychelles', // Seychelles
  180: 'Saint-Pierre-et-Miquelon', // Saint Pierre and Miquelon
  181: 'Sénégal', // Senegal
  182: 'Saint Vincent and the Grenadines', // Saint Vincent and the Grenadines
  183: 'Saint Kitts and Nevis', // Saint Kitts and Nevis
  184: 'Saint Lucia', // Saint Lucia
  185: 'Singapore / Singapura / சிங்கப்பூர்', // Singapore
  186: 'سوريا', // Syria
  187: 'Slovensko', // Slovakia
  188: 'Slovenija', // Slovenia
  189: 'Solomon Islands', // Solomon Islands
  190: 'الصومال / Soomaaliya', // Somalia
  191: 'السودان / Sudan', // Sudan
  192: 'Suriname', // Suriname
  193: 'United States', // United States
  194: 'Sierra Leone', // Sierra Leone
  195: 'Hong Kong / 香港', // Hong Kong
  196: 'Тоҷикистон', // Tajikistan
  197: 'ประเทศไทย', // Thailand
  198: '台灣', // Taiwan
  199: 'Tanzania', // Tanzania
  200: 'Turks and Caicos Islands', // Turks and Caicos Islands
  201: 'Togo', // Togo
  202: 'Tokelau', // Tokelau
  203: 'Tonga', // Tonga
  204: 'Trinidad and Tobago', // Trinidad and Tobago
  205: 'Tuvalu', // Tuvalu
  206: 'تونس', // Tunisia
  207: 'Türkmenistan', // Turkmenistan
  208: 'Türkiye', // Turkey
  209: 'Uganda', // Uganda
  210: 'O‘zbekiston', // Uzbekistan
  211: 'Україна', // Ukraine
  212: 'Wallis et Futuna', // Wallis and Futuna
  213: 'Uruguay', // Uruguay
  214: 'Færøerne / Føroyar', // Faroe Islands
  215: 'Fiji / Viti / फिजी', // Fiji
  216: 'Philippines / Pilipinas', // Philippines
  217: 'Suomi / Finland', // Finland
  218: 'Falkland Islands', // Falkland Islands
  219: 'France', // France
  220: 'Polynésie française', // French Polynesia
  221: 'Terres australes et antarctiques françaises', // French Southern Territories
  222: 'Heard Island and McDonald Islands', // Heard Island and McDonald Islands
  223: 'Hrvatska', // Croatia
  224: 'République centrafricaine / Bêafrîka', // Central African Republic
  225: 'تشاد / Tchad', // Chad
  226: 'Česko', // Czech Republic
  227: 'Chile', // Chile
  228: 'Suisse / Schweiz / Svizzera', // Switzerland
  229: 'Sverige', // Sweden
  230: 'Svalbard og Jan Mayen', // Svalbard and Jan Mayen
  231: 'ශ්‍රී ලංකාව / இலங்கை', // Sri Lanka
  232: 'Ecuador', // Ecuador
  233: 'إريتريا / Eritrea / ኤርትራ', // Eritrea
  234: 'Eesti', // Estonia
  235: 'ኢትዮጵያ', // Ethiopia
  236: 'South Africa / Sewula Afrika / Afrika-Borwa', // South Africa
  237: 'Jamaica', // Jamaica
  238: '日本', // Japan
  240: 'Mayotte', // Mayotte
  241: 'South Georgia', // South Georgia and the South Sandwich Islands
  242: 'Åland', // Aland Islands
  243: 'فلسطين', // Palestine
  244: 'Црна Гора', // Montenegro
  245: 'Србија', // Serbia
  246: 'Guernsey / Guernesey / Dgèrnésiais', // Guernsey
  247: 'Jersey / Jèrri', // Jersey
};
