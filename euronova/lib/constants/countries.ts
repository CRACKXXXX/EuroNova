export const EUROPEAN_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'MK', 'IS', 'LI', 'NO', 'RS', 'TR', 'GB',
  'CH', 'GE', 'AM', 'AZ', 'MD', 'UA', 'UK', 'AL', 'BA', 'ME', 'XK'
];

export const getFlag = (c: string): string => {
  const upper = c.toUpperCase();
  if (upper === 'UK') return '🇬🇧';
  return upper.replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const CUSTOM_COUNTRY_NAMES: Record<string, string> = {
  XK: 'Kosovo',
  UK: 'United Kingdom',
  BA: 'Bosnia and Herzegovina',
  MD: 'Moldova',
  TR: 'Türkiye',
  CZ: 'Czechia',
  MK: 'North Macedonia',
};

export const COUNTRIES = EUROPEAN_COUNTRY_CODES.map(code => ({
  code,
  name: CUSTOM_COUNTRY_NAMES[code] || regionNames.of(code) || code,
  flag: getFlag(code),
  flagUrl: code === 'UK' ? 'https://flagcdn.com/w20/gb.png' : `https://flagcdn.com/w20/${code.toLowerCase()}.png`
}));
