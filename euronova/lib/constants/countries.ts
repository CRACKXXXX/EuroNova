export const EUROPEAN_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'MK', 'IS', 'LI', 'NO', 'RS', 'TR', 'GB'
];

export const getFlag = (c: string) => c.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const COUNTRIES = EUROPEAN_COUNTRY_CODES.map(code => ({
  code,
  name: regionNames.of(code) || code,
  flag: getFlag(code),
  flagUrl: `https://flagcdn.com/w20/${code.toLowerCase()}.png`
}));
