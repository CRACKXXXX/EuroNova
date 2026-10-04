import React from 'react';

const COUNTRIES = [
  // 27 Estados Miembros de la UE
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'HR', name: 'Croacia', flag: '🇭🇷' },
  { code: 'CY', name: 'Chipre', flag: '🇨🇾' },
  { code: 'CZ', name: 'Chequia', flag: '🇨🇿' },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'FI', name: 'Finlandia', flag: '🇫🇮' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
  { code: 'HU', name: 'Hungría', flag: '🇭🇺' },
  { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'LV', name: 'Letonia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lituania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxemburgo', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'RO', name: 'Rumanía', flag: '🇷🇴' },
  { code: 'SK', name: 'Eslovaquia', flag: '🇸🇰' },
  { code: 'SI', name: 'Eslovenia', flag: '🇸🇮' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'SE', name: 'Suecia', flag: '🇸🇪' },
  // Países Asociados a Erasmus+ / CES
  { code: 'MK', name: 'Macedonia del Norte', flag: '🇲🇰' },
  { code: 'IS', name: 'Islandia', flag: '🇮🇸' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'TR', name: 'Turquía', flag: '🇹🇷' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
];

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
      <select
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        className={`w-full bg-void-surface border border-void-border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-plasma-cyan focus:ring-1 focus:ring-plasma-cyan transition-all appearance-none cursor-pointer ${className || ''}`}
        {...props}
      >
        <option value="" disabled className="text-gray-500">{placeholder}</option>
        <option value="">Cualquier país / Todos</option>
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
