/**
 * EuroNova — Mission Radar Coordinate Dispersion & Anti-Overlap Engine
 *
 * Implements deterministic Golden-Angle (Vogel/Sunflower) spiral dispersion
 * to prevent markers in the same city or coordinates from overlapping.
 *
 * Mathematical formula:
 *   theta = index * 2.39996 (Golden Angle in radians: pi * (3 - sqrt(5)))
 *   r = step * sqrt(index)
 */

export interface CoordinatedItem {
  id: string;
  lat: number;
  lng: number;
}

export const GOLDEN_ANGLE_RAD = 2.399963229728653; // pi * (3 - sqrt(5))
export const PROXIMITY_THRESHOLD_DEG = 0.02; // ~2.2 km threshold for clustering identical / near-identical pins
export const DISPERSION_STEP_DEG = 0.008; // ~850 meters step for clear visual separation

/**
 * Calculates equirectangular approximation distance between two coordinates in degrees.
 */
export function calculateDistanceDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Deterministically disperses multiple overlapping or near-identical coordinates
 * in a clean ring / sunflower pattern around the central anchor coordinate.
 */
export function disperseCoordinates<T extends CoordinatedItem>(
  items: T[],
  options: {
    proximityThreshold?: number;
    step?: number;
  } = {}
): T[] {
  const threshold = options.proximityThreshold ?? PROXIMITY_THRESHOLD_DEG;
  const step = options.step ?? DISPERSION_STEP_DEG;

  if (items.length <= 1) return [...items];

  // 1. Group items into proximity clusters
  const clusters: T[][] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (assigned.has(item.id)) continue;

    const cluster: T[] = [item];
    assigned.add(item.id);

    for (let j = i + 1; j < items.length; j++) {
      const other = items[j];
      if (assigned.has(other.id)) continue;

      const dist = calculateDistanceDeg(item.lat, item.lng, other.lat, other.lng);
      if (dist < threshold) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }
    clusters.push(cluster);
  }

  // 2. Disperse each cluster deterministically
  const results: T[] = [];

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      results.push({ ...cluster[0] });
      continue;
    }

    // Sort deterministically by id to guarantee immutability across renders
    const sorted = [...cluster].sort((a, b) => a.id.localeCompare(b.id));
    const baseLat = sorted[0].lat;
    const baseLng = sorted[0].lng;
    const latCos = Math.cos((baseLat * Math.PI) / 180);
    const lngScale = Math.abs(latCos) > 0.05 ? latCos : 1;

    for (let idx = 0; idx < sorted.length; idx++) {
      const current = sorted[idx];
      if (idx === 0) {
        // Anchor sits precisely at base location
        results.push({
          ...current,
          lat: Number(baseLat.toFixed(6)),
          lng: Number(baseLng.toFixed(6)),
        });
      } else {
        // Disperse along the golden angle spiral
        const theta = idx * GOLDEN_ANGLE_RAD;
        const r = step * Math.sqrt(idx);
        const dLat = r * Math.sin(theta);
        const dLng = (r * Math.cos(theta)) / lngScale;

        results.push({
          ...current,
          lat: Number((baseLat + dLat).toFixed(6)),
          lng: Number((baseLng + dLng).toFixed(6)),
        });
      }
    }
  }

  return results;
}
