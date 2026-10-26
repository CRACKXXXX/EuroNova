"use client";

import { useRef, useState, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations, useLocale, useFormatter } from "next-intl";
import { getFlag } from "@/lib/constants/countries";
import { MapPin, Clock, Calendar, ExternalLink, RotateCcw, Filter, Radio } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ProjectProperties {
  id: string;
  title: string;
  description: string;
  project_type: string;
  dest_country: string | null;
  exact_location: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  is_last_minute: boolean;
  covers_rup_flights: boolean;
  themes: string[] | null;
  financing_type: string | null;
}

interface PopupInfo {
  longitude: number;
  latitude: number;
  properties: ProjectProperties;
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: ProjectProperties;
}

interface GeoJSONData {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// ============================================================================
// PROJECT TYPE BADGE STYLES
// ============================================================================

const PROJECT_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ESC: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  YE: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  TC: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  PBA: { bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/40" },
  SV: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/40" },
  SE: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/40" },
  VET: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
  CBY: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/40" },
};

const FILTER_TYPES = ["ALL", "ESC", "YE", "TC", "PBA", "SV", "SE", "VET", "CBY"] as const;

// ============================================================================
// CLUSTER LAYERS STYLE DEFINITIONS (Neon Cosmic Dark)
// ============================================================================

const clusterGlowLayer: maplibregl.LayerSpecification = {
  id: "cluster-glow",
  type: "circle",
  source: "projects",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#00E5FF", // < 10: Plasma Cyan
      10,
      "#6366F1", // 10-25: Hyper Violet
      25,
      "#FF2E63", // 25+: Nova Flare
    ],
    "circle-radius": [
      "step",
      ["get", "point_count"],
      32,
      10,
      40,
      25,
      50,
    ],
    "circle-opacity": 0.25,
    "circle-blur": 0.8,
  },
};

const clusterLayer: maplibregl.LayerSpecification = {
  id: "clusters",
  type: "circle",
  source: "projects",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#00E5FF", // < 10
      10,
      "#6366F1", // 10-25
      25,
      "#FF2E63", // 25+
    ],
    "circle-radius": [
      "step",
      ["get", "point_count"],
      20,
      10,
      26,
      25,
      34,
    ],
    "circle-opacity": 0.9,
    "circle-stroke-width": 2.5,
    "circle-stroke-color": "#08090E",
  },
};

const clusterCountLayer: maplibregl.LayerSpecification = {
  id: "cluster-count",
  type: "symbol",
  source: "projects",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["Open Sans Bold"],
    "text-size": 13,
    "text-allow-overlap": true,
  },
  paint: {
    "text-color": "#08090E",
  },
};

const unclusteredGlowLayer: maplibregl.LayerSpecification = {
  id: "unclustered-glow",
  type: "circle",
  source: "projects",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "case",
      ["get", "is_last_minute"],
      "#FF2E63",
      "#00E5FF",
    ],
    "circle-radius": 16,
    "circle-opacity": 0.35,
    "circle-blur": 0.9,
  },
};

const unclusteredPointLayer: maplibregl.LayerSpecification = {
  id: "unclustered-point",
  type: "circle",
  source: "projects",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "case",
      ["get", "is_last_minute"],
      "#FF2E63",
      "#00E5FF",
    ],
    "circle-radius": 7,
    "circle-stroke-width": 2.5,
    "circle-stroke-color": [
      "case",
      ["get", "is_last_minute"],
      "#FF2E63",
      "#6366F1",
    ],
    "circle-opacity": 0.95,
  },
};

// ============================================================================
// HELPER: Format date
// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectsMap() {
  const t = useTranslations("Map");
  const locale = useLocale();
  const mapRef = useRef<MapRef>(null);

  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [geojsonData, setGeojsonData] = useState<GeoJSONData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
      } catch {
        // Fallback or ignore if already set
      }
    }
  }, []);

  // Fetch GeoJSON data on mount
  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/projects/geojson");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: GeoJSONData = await res.json();
        if (!isCancelled) {
          setGeojsonData(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Filter features according to selected project type
  const filteredGeoJSON = useMemo<GeoJSONData | null>(() => {
    if (!geojsonData) return null;
    if (selectedType === "ALL") return geojsonData;

    return {
      type: "FeatureCollection",
      features: geojsonData.features.filter(
        (f) => f.properties.project_type === selectedType
      ),
    };
  }, [geojsonData, selectedType]);

  const activeProjectCount = filteredGeoJSON?.features.length ?? 0;

  // Reset view to Europe center
  const handleResetView = useCallback(() => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance) return;

    mapInstance.flyTo({
      center: [15.2, 50.0],
      zoom: 3.8,
      duration: 1000,
      essential: true,
    });
  }, []);

  // Combined click handler using interactive features
  // Combined click handler with hit-box tolerance
  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance) return;

    // First check e.features, fallback to a small 8px bounding box query
    let feature = e.features?.[0];

    if (!feature) {
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - 10, e.point.y - 10],
        [e.point.x + 10, e.point.y + 10],
      ];
      const queryResults = mapInstance.queryRenderedFeatures(bbox, {
        layers: ["clusters", "cluster-glow", "unclustered-point", "unclustered-glow"],
      });
      feature = queryResults[0];
    }

    if (!feature) {
      setPopupInfo(null);
      return;
    }

    const layerId = feature.layer?.id;

    // 1. Cluster Click -> Zoom in smoothly
    if (layerId === "clusters" || layerId === "cluster-glow") {
      const clusterId = feature.properties?.cluster_id;
      if (!clusterId) return;

      const source = mapInstance.getSource("projects") as maplibregl.GeoJSONSource;
      if (!source) return;

      source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
        const geometry = feature?.geometry;
        if (geometry && geometry.type === "Point") {
          mapInstance.flyTo({
            center: geometry.coordinates as [number, number],
            zoom: Math.min(zoom, 17),
            duration: 800,
            essential: true,
          });
        }
      });
      return;
    }

    // 2. Unclustered Single Project Click -> Open sleek popup
    if (layerId === "unclustered-point" || layerId === "unclustered-glow") {
      const geometry = feature.geometry;
      if (geometry.type !== "Point") return;

      const props = feature.properties as Record<string, unknown>;

      let themes: string[] | null = null;
      if (typeof props.themes === "string") {
        try {
          themes = JSON.parse(props.themes);
        } catch {
          themes = null;
        }
      } else if (Array.isArray(props.themes)) {
        themes = props.themes;
      }

      const properties: ProjectProperties = {
        id: String(props.id ?? ""),
        title: String(props.title ?? ""),
        description: String(props.description ?? ""),
        project_type: String(props.project_type ?? ""),
        dest_country: props.dest_country ? String(props.dest_country) : null,
        exact_location: props.exact_location ? String(props.exact_location) : null,
        start_date: props.start_date ? String(props.start_date) : null,
        end_date: props.end_date ? String(props.end_date) : null,
        duration_days: props.duration_days ? Number(props.duration_days) : null,
        is_last_minute: props.is_last_minute === true || props.is_last_minute === "true",
        covers_rup_flights: props.covers_rup_flights === true || props.covers_rup_flights === "true",
        themes,
        financing_type: props.financing_type ? String(props.financing_type) : null,
      };

      setPopupInfo({
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
        properties,
      });
      return;
    }

    setPopupInfo(null);
  }, []);

  const onMouseEnter = useCallback(() => {
    const mapInstance = mapRef.current?.getMap();
    if (mapInstance) mapInstance.getCanvas().style.cursor = "pointer";
  }, []);

  const onMouseLeave = useCallback(() => {
    const mapInstance = mapRef.current?.getMap();
    if (mapInstance) mapInstance.getCanvas().style.cursor = "";
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-void-deep">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-plasma-cyan/20 border-t-plasma-cyan animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-void-deep">
        <div className="text-center space-y-4 p-8 max-w-md bg-void-surface border border-void-border rounded-2xl shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-nova-flare/10 border border-nova-flare/30 flex items-center justify-center">
            <MapPin className="w-7 h-7 text-nova-flare" />
          </div>
          <h3 className="text-lg font-bold text-white">{t("errorTitle")}</h3>
          <p className="text-gray-400 text-xs">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-plasma-cyan/10 hover:bg-plasma-cyan/20 border border-plasma-cyan/30 text-plasma-cyan text-xs font-bold rounded-lg transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden select-none">
      {/* Loading overlay with radar scanning animation */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-void-deep/90 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-plasma-cyan/30 animate-ping opacity-60" />
              <div className="absolute inset-2 rounded-full border border-hyper-violet/40 animate-pulse" />
              <div className="w-12 h-12 rounded-full border-2 border-t-plasma-cyan border-r-transparent border-b-hyper-violet border-l-transparent animate-spin" />
              <Radio className="w-6 h-6 text-plasma-cyan animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-extrabold text-sm tracking-wider uppercase">
                {t("title")}
              </p>
              <p className="text-plasma-cyan/80 text-xs font-mono animate-pulse">
                {t("loading")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Mission Radar status pill */}
        <div className="pointer-events-auto bg-void-surface/90 backdrop-blur-xl border border-void-border/80 rounded-2xl p-2.5 px-4 shadow-[0_0_25px_rgba(0,0,0,0.6)] flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-plasma-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-plasma-cyan" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
              {t("projectsOnMap")}
            </p>
            <p className="text-lg font-black text-white leading-none flex items-center gap-1.5">
              <span className="text-plasma-cyan">{activeProjectCount}</span>
              <span className="text-xs font-medium text-gray-400">active</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Project Type Filter Chips & Reset View */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          {/* Type filter scroll container */}
          <div className="bg-void-surface/90 backdrop-blur-xl border border-void-border/80 rounded-2xl p-1.5 shadow-[0_0_25px_rgba(0,0,0,0.6)] flex items-center gap-1 overflow-x-auto max-w-[85vw] sm:max-w-none">
            <div className="flex items-center gap-1 px-2 text-gray-400 text-xs shrink-0">
              <Filter className="w-3.5 h-3.5 text-plasma-cyan" />
            </div>
            {FILTER_TYPES.map((type) => {
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase transition-all duration-200 shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-plasma-cyan text-void-deep shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-105"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {/* Reset View Button */}
          <button
            type="button"
            onClick={handleResetView}
            title={t("resetView")}
            className="p-2.5 rounded-2xl bg-void-surface/90 backdrop-blur-xl border border-void-border/80 text-gray-400 hover:text-plasma-cyan hover:border-plasma-cyan/40 shadow-[0_0_25px_rgba(0,0,0,0.6)] transition-all cursor-pointer group"
          >
            <RotateCcw className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Bottom Left: Cosmic Legend Overlay */}
      <div className="absolute bottom-6 left-4 z-20 pointer-events-auto bg-void-surface/90 backdrop-blur-xl border border-void-border/80 rounded-2xl p-3.5 px-4 shadow-[0_0_25px_rgba(0,0,0,0.6)] hidden sm:block">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-2">
          {t("legend")}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.7)]" />
            <span className="text-xs text-gray-300 font-medium">{t("regularProject")}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#FF2E63] shadow-[0_0_8px_rgba(255,46,99,0.7)] animate-pulse" />
            <span className="text-xs text-gray-300 font-medium">{t("lastMinute")}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.7)]" />
            <span className="text-xs text-gray-300 font-medium">{t("cluster")}</span>
          </div>
        </div>
      </div>

      {/* MapLibre Map Container */}
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: 15.2,
          latitude: 50.0,
          zoom: 3.8,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        interactiveLayerIds={["clusters", "cluster-glow", "unclustered-point", "unclustered-glow"]}
        maxZoom={18}
        minZoom={2}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {filteredGeoJSON && (
          <Source
            id="projects"
            type="geojson"
            data={filteredGeoJSON}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={55}
          >
            <Layer {...clusterGlowLayer} />
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredGlowLayer} />
            <Layer {...unclusteredPointLayer} />
          </Source>
        )}

        {/* Sleek Dark Cosmic Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="euronova-popup"
            maxWidth="340px"
          >
            <ProjectPopupContent
              properties={popupInfo.properties}
              locale={locale}
              t={t}
            />
          </Popup>
        )}
      </Map>
    </div>
  );
}

// ============================================================================
// POPUP CONTENT COMPONENT
// ============================================================================

function ProjectPopupContent({
  properties,
  locale,
  t,
}: {
  properties: ProjectProperties;
  locale: string;
  t: ReturnType<typeof useTranslations<"Map">>;
}) {
  const format = useFormatter();

  const formatPopupDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return format.dateTime(d, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const typeStyle = PROJECT_TYPE_STYLES[properties.project_type] || {
    bg: "bg-gray-500/20",
    text: "text-gray-300",
    border: "border-gray-500/40",
  };

  const countryFlag = properties.dest_country
    ? getFlag(properties.dest_country)
    : null;

  return (
    <div className="space-y-3 p-1">
      {/* Header Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`px-2 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wider ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
        >
          {properties.project_type}
        </span>
        {properties.is_last_minute && (
          <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-[#FF2E63]/20 text-[#FF2E63] border border-[#FF2E63]/40 uppercase tracking-wider animate-pulse">
            ⚡ Last Minute
          </span>
        )}
        {properties.covers_rup_flights && (
          <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 uppercase tracking-wider">
            ✈ RUP
          </span>
        )}
      </div>

      {/* Project Title */}
      <h4 className="text-sm font-extrabold text-white leading-snug line-clamp-2">
        {properties.title}
      </h4>

      {/* Details Stack */}
      <div className="space-y-1.5 text-xs text-gray-300">
        {/* Country / Location */}
        <div className="flex items-center gap-1.5 text-gray-300">
          <MapPin className="w-3.5 h-3.5 text-plasma-cyan shrink-0" />
          <span className="flex items-center gap-1.5 flex-wrap font-medium">
            {countryFlag && <span className="text-sm leading-none">{countryFlag}</span>}
            {properties.exact_location && <span>{properties.exact_location}</span>}
            {properties.exact_location && properties.dest_country && <span>·</span>}
            {properties.dest_country && (
              <span className="text-gray-400 font-mono">[{properties.dest_country}]</span>
            )}
          </span>
        </div>

        {/* Dates */}
        {(properties.start_date || properties.end_date) && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Calendar className="w-3.5 h-3.5 text-hyper-violet shrink-0" />
            <span className="font-mono text-[11px]">
              {formatPopupDate(properties.start_date)} → {formatPopupDate(properties.end_date)}
            </span>
          </div>
        )}

        {/* Duration */}
        {properties.duration_days && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>
              {t("durationDaysCount", { count: properties.duration_days })}
            </span>
          </div>
        )}
      </div>

      {/* Primary Action Button: Routing to /[locale]/projects/[id] */}
      <a
        href={`/${locale}/projects/${properties.id}`}
        className="group mt-2 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all duration-300
          bg-plasma-cyan text-void-deep
          hover:bg-plasma-cyan/90 hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] hover:scale-[1.02] active:scale-[0.98]"
      >
        <span>{t("viewMission")}</span>
        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>
    </div>
  );
}
