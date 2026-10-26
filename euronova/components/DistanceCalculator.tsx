"use client";

import { useState, useMemo } from "react";
import { Plane, Compass, Sparkles, Leaf, Info, ChevronDown, Euro } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { COUNTRIES } from "@/lib/constants/countries";

export interface DistanceCalculatorProps {
  userCountryCode?: string;
  destCountryCode?: string;
  className?: string;
}

// Approximate central coordinates (latitude, longitude) for European and partner countries
export const EUROPEAN_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  ES: { lat: 40.4637, lng: -3.7492, name: "Spain" },
  FR: { lat: 46.2276, lng: 2.2137, name: "France" },
  DE: { lat: 51.1657, lng: 10.4515, name: "Germany" },
  IT: { lat: 41.8719, lng: 12.5674, name: "Italy" },
  PT: { lat: 39.3999, lng: -8.2245, name: "Portugal" },
  PL: { lat: 51.9194, lng: 19.1451, name: "Poland" },
  RO: { lat: 45.9432, lng: 24.9668, name: "Romania" },
  NL: { lat: 52.1326, lng: 5.2913, name: "Netherlands" },
  BE: { lat: 50.5039, lng: 4.4699, name: "Belgium" },
  CZ: { lat: 49.8175, lng: 15.4730, name: "Czech Republic" },
  EL: { lat: 39.0742, lng: 21.8243, name: "Greece" },
  GR: { lat: 39.0742, lng: 21.8243, name: "Greece" },
  SE: { lat: 60.1282, lng: 18.6435, name: "Sweden" },
  AT: { lat: 47.5162, lng: 14.5501, name: "Austria" },
  HU: { lat: 47.1625, lng: 19.5033, name: "Hungary" },
  DK: { lat: 56.2639, lng: 9.5018, name: "Denmark" },
  FI: { lat: 61.9241, lng: 25.7482, name: "Finland" },
  SK: { lat: 48.6690, lng: 19.6990, name: "Slovakia" },
  IE: { lat: 53.1424, lng: -7.6921, name: "Ireland" },
  HR: { lat: 45.1000, lng: 15.2000, name: "Croatia" },
  LT: { lat: 55.1694, lng: 23.8813, name: "Lithuania" },
  SI: { lat: 46.1512, lng: 14.9955, name: "Slovenia" },
  LV: { lat: 56.8796, lng: 24.6032, name: "Latvia" },
  EE: { lat: 58.5953, lng: 25.0136, name: "Estonia" },
  CY: { lat: 35.1264, lng: 33.4299, name: "Cyprus" },
  LU: { lat: 49.8153, lng: 6.1296, name: "Luxembourg" },
  MT: { lat: 35.9375, lng: 14.3754, name: "Malta" },
  BG: { lat: 42.7339, lng: 25.4858, name: "Bulgaria" },
  TR: { lat: 38.9637, lng: 35.2433, name: "Turkey" },
  NO: { lat: 60.4720, lng: 8.4689, name: "Norway" },
  IS: { lat: 64.9631, lng: -19.0208, name: "Iceland" },
  LI: { lat: 47.1660, lng: 9.5554, name: "Liechtenstein" },
  MK: { lat: 41.6086, lng: 21.7453, name: "North Macedonia" },
  RS: { lat: 44.0165, lng: 21.0059, name: "Serbia" },
  UK: { lat: 55.3781, lng: -3.4360, name: "United Kingdom" },
  CH: { lat: 46.8182, lng: 8.2275, name: "Switzerland" },
  GE: { lat: 42.3154, lng: 43.3569, name: "Georgia" },
  AM: { lat: 40.0691, lng: 45.0382, name: "Armenia" },
  AZ: { lat: 40.1431, lng: 47.5769, name: "Azerbaijan" },
  MD: { lat: 47.4116, lng: 28.3699, name: "Moldova" },
  UA: { lat: 48.3794, lng: 31.1656, name: "Ukraine" },
  AL: { lat: 41.1533, lng: 20.1683, name: "Albania" },
  BA: { lat: 43.9159, lng: 17.6791, name: "Bosnia and Herzegovina" },
  ME: { lat: 42.7087, lng: 19.3744, name: "Montenegro" },
  XK: { lat: 42.6026, lng: 20.9030, name: "Kosovo" },
};

/**
 * Calculates Great-Circle distance using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Maps distance in km to official Erasmus+ Travel Grant Distance Bands
 */
export function getErasmusBandInfo(distanceKm: number): {
  band: string;
  standardGrant: string;
  greenGrant: string;
} {
  if (distanceKm < 10) {
    return { band: "< 10 km", standardGrant: "€0", greenGrant: "€0" };
  }
  if (distanceKm <= 99) {
    return { band: "10 - 99 km", standardGrant: "€28", greenGrant: "€56" };
  }
  if (distanceKm <= 499) {
    return { band: "100 - 499 km", standardGrant: "€211", greenGrant: "€285" };
  }
  if (distanceKm <= 1999) {
    return { band: "500 - 1999 km", standardGrant: "€309", greenGrant: "€417" };
  }
  if (distanceKm <= 2999) {
    return { band: "2000 - 2999 km", standardGrant: "€395", greenGrant: "€535" };
  }
  if (distanceKm <= 3999) {
    return { band: "3000 - 3999 km", standardGrant: "€580", greenGrant: "€785" };
  }
  if (distanceKm <= 7999) {
    return { band: "4000 - 7999 km", standardGrant: "€1,188", greenGrant: "€1,188" };
  }
  return { band: "8000+ km", standardGrant: "€1,735", greenGrant: "€1,735" };
}

export function DistanceCalculator({
  userCountryCode = "ES",
  destCountryCode,
  className = "",
}: DistanceCalculatorProps) {
  const t = useTranslations("ProjectDetails");
  const format = useFormatter();

  const [originCode, setOriginCode] = useState<string>(userCountryCode || "ES");
  const [isChangingOrigin, setIsChangingOrigin] = useState<boolean>(false);

  const normalizedDest = destCountryCode ? destCountryCode.toUpperCase().trim() : "";
  const normalizedOrigin = originCode.toUpperCase().trim();

  const originCoords = EUROPEAN_COORDINATES[normalizedOrigin];
  const destCoords = EUROPEAN_COORDINATES[normalizedDest];

  const originCountryObj = COUNTRIES.find((c) => c.code === normalizedOrigin);
  const destCountryObj = COUNTRIES.find((c) => c.code === normalizedDest);

  const calculation = useMemo(() => {
    if (!originCoords || !destCoords) return null;
    if (normalizedOrigin === normalizedDest) {
      return {
        distanceKm: 0,
        isSameCountry: true,
        bandInfo: { band: "National / Local", standardGrant: "€28 - €211", greenGrant: "Green Bonus" },
      };
    }
    const distanceKm = calculateHaversineDistance(
      originCoords.lat,
      originCoords.lng,
      destCoords.lat,
      destCoords.lng
    );
    const bandInfo = getErasmusBandInfo(distanceKm);
    return {
      distanceKm,
      isSameCountry: false,
      bandInfo,
    };
  }, [originCoords, destCoords, normalizedOrigin, normalizedDest]);

  if (!destCountryCode || !destCoords) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-void-surface to-void-deep border border-plasma-cyan/30 p-5 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,229,255,0.08)] transition-all duration-300 max-w-lg mx-auto w-full ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-plasma-cyan/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 pb-3 mb-4 border-b border-void-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-plasma-cyan/15 border border-plasma-cyan/30 flex items-center justify-center shrink-0">
            <Plane className="w-3.5 h-3.5 text-plasma-cyan" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <span>{t("distanceCalculator")}</span>
              <Sparkles className="w-3 h-3 text-plasma-cyan shrink-0" />
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsChangingOrigin((prev) => !prev)}
          className="text-[10px] font-bold text-plasma-cyan hover:text-white px-2.5 py-1 rounded-md bg-plasma-cyan/10 hover:bg-plasma-cyan/20 border border-plasma-cyan/30 transition-all cursor-pointer flex items-center gap-1 shrink-0"
        >
          <span>{t("changeOrigin")}</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isChangingOrigin ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* 2. Origin Dropdown (When open) */}
      {isChangingOrigin && (
        <div className="relative z-10 mb-4 p-3 rounded-xl bg-void-deep/90 border border-plasma-cyan/30 animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg">
          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">
            {t("originCountry")}
          </label>
          <select
            value={originCode}
            onChange={(e) => {
              setOriginCode(e.target.value);
              setIsChangingOrigin(false);
            }}
            className="w-full bg-void-surface border border-void-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-plasma-cyan transition-colors cursor-pointer"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-void-surface text-white">
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Hero Distance Value */}
      {calculation && (
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            {t("estimatedDistance")}
          </span>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(0,229,255,0.4)]">
            <span className="text-plasma-cyan">
              {calculation.isSameCountry ? "< 50 km" : `~${format.number(calculation.distanceKm)} km`}
            </span>
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-plasma-cyan/10 border border-plasma-cyan/30 text-plasma-cyan text-xs font-bold">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>EU Band: {calculation.bandInfo.band}</span>
          </div>
        </div>
      )}

      {/* 4. Balanced 3-Column Flight Route Segment (Never squishes, never stretches infinitely) */}
      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 p-3.5 rounded-xl bg-void-deep/80 border border-void-border my-4 shadow-inner">
        {/* Origin Column */}
        <div className="flex flex-col items-center text-center px-1 min-w-0">
          {originCountryObj && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={originCountryObj.flagUrl}
              alt={originCountryObj.name}
              className="w-6 h-auto rounded-[2px] mb-1 shadow-sm shrink-0"
            />
          )}
          <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
            Origin
          </span>
          <span className="text-xs font-bold text-white leading-snug break-words max-w-full block text-center" title={originCountryObj?.name || normalizedOrigin}>
            {originCountryObj?.name || normalizedOrigin}
          </span>
        </div>

        {/* Center Flight Icon */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1">
          <div className="w-8 h-8 rounded-full bg-plasma-cyan/10 border border-plasma-cyan/40 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.2)]">
            <Plane className="w-4 h-4 text-plasma-cyan -rotate-12" />
          </div>
          <span className="text-[9px] text-plasma-cyan/80 font-bold uppercase tracking-wider mt-1">{t("flightDirect")}</span>
        </div>

        {/* Destination Column */}
        <div className="flex flex-col items-center text-center px-1 min-w-0">
          {destCountryObj && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={destCountryObj.flagUrl}
              alt={destCountryObj.name}
              className="w-6 h-auto rounded-[2px] mb-1 shadow-sm shrink-0"
            />
          )}
          <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
            {t("destinationLabel")}
          </span>
          <span className="text-xs font-bold text-white leading-snug break-words max-w-full block text-center" title={destCountryObj?.name || normalizedDest}>
            {destCountryObj?.name || normalizedDest}
          </span>
        </div>
      </div>

      {/* 5. Erasmus+ Grant Estimation Cards */}
      {calculation && (
        <div className="relative z-10 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Standard Travel Grant */}
            <div className="p-2.5 rounded-xl bg-void-deep/70 border border-void-border flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Euro className="w-3 h-3 text-gray-400" />
                <span>{t("standardGrant")}</span>
              </span>
              <span className="text-sm font-extrabold text-rup-emerald mt-1">
                {calculation.bandInfo.standardGrant}
              </span>
            </div>

            {/* Green Travel Grant */}
            <div className="p-2.5 rounded-xl bg-void-deep/70 border border-void-border flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Leaf className="w-3 h-3 text-rup-emerald" />
                <span>{t("greenTravel")}</span>
              </span>
              <span className="text-sm font-extrabold text-rup-emerald mt-1">
                {calculation.bandInfo.greenGrant}
              </span>
            </div>
          </div>

          <p className="text-[9px] text-gray-500 text-center flex items-center justify-center gap-1 pt-1">
            <Info className="w-3 h-3 shrink-0 text-gray-400" />
            <span>{t("geodeticCalculation")}</span>
          </p>
        </div>
      )}
    </div>
  );
}
