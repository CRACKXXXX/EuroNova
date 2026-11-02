export const EUROPEAN_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'MK', 'IS', 'LI', 'NO', 'RS', 'TR', 'GB',
  'CH', 'GE', 'AM', 'AZ', 'MD', 'UA', 'UK', 'AL', 'BA', 'ME', 'XK'
];

/**
 * Converts a 2-letter ISO 3166-1 alpha-2 country code into its native Unicode Emoji Flag.
 * Regional Indicator Symbol Letter A is U+1F1E6 (127462).
 * 'A'.charCodeAt(0) is 65.
 * Offset: 127462 - 65 = 127397 (0x1F1A5).
 */
export const getFlag = (c: string): string => {
  if (!c || typeof c !== 'string') return '';
  const upper = c.trim().toUpperCase();
  if (upper === 'UK' || upper === 'GB') return '🇬🇧';
  if (upper === 'EU') return '🇪🇺';
  if (upper === 'XK') return '🇽🇰';
  if (upper.length !== 2) return upper;

  const codeA = upper.charCodeAt(0);
  const codeB = upper.charCodeAt(1);

  // Must be valid ASCII uppercase letters A-Z (65-90)
  if (codeA < 65 || codeA > 90 || codeB < 65 || codeB > 90) {
    return upper;
  }

  // Mathematically compute Regional Indicator Symbol code points
  return String.fromCodePoint(codeA + 127397, codeB + 127397);
};

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const CUSTOM_COUNTRY_NAMES: Record<string, string> = {
  XK: 'Kosovo',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  EU: 'European Union',
  BA: 'Bosnia and Herzegovina',
  MD: 'Moldova',
  TR: 'Türkiye',
  CZ: 'Czechia',
  MK: 'North Macedonia',
};

export const getFlagUrl = (c: string): string => {
  if (!c || typeof c !== 'string') return 'https://flagcdn.com/w20/eu.png';
  const upper = c.trim().toUpperCase();
  if (upper === 'UK' || upper === 'GB') return 'https://flagcdn.com/w20/gb.png';
  if (upper === 'EU') return 'https://flagcdn.com/w20/eu.png';
  if (upper === 'XK') return 'https://flagcdn.com/w20/xk.png';
  return `https://flagcdn.com/w20/${upper.toLowerCase()}.png`;
};

export const COUNTRIES = EUROPEAN_COUNTRY_CODES.map(code => ({
  code,
  name: CUSTOM_COUNTRY_NAMES[code] || regionNames.of(code) || code,
  flag: getFlag(code),
  flagUrl: getFlagUrl(code),
}));
