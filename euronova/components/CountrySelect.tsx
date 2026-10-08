import React from 'react';

const EUROPEAN_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'MK', 'IS', 'LI', 'NO', 'RS', 'TR', 'GB'
];

export const getFlag = (c: string) => c.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const COUNTRIES = EUROPEAN_COUNTRY_CODES.map(code => ({
  code,
  name: regionNames.of(code) || code,
  flag: getFlag(code)
}));

interface CountrySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  defaultValue?: string;
  name?: string;
  placeholder?: string;
}

export function CountrySelect({ value, onChange, defaultValue, name, placeholder = "Selecciona un país", className, ...props }: CountrySelectProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-base">
        {COUNTRIES.find(c => c.code === (value || defaultValue))?.flag}
      </div>
      <select
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        className={`w-full bg-void-surface border border-void-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all appearance-none cursor-pointer ${className || ''}`}
        {...props}
      >
        <option value="" disabled className="text-gray-500">{placeholder}</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code} className="text-white bg-void-deep">
            {country.flag} {country.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
      </div>
    </div>
  );
}
