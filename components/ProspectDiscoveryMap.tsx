"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapProspect = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  score: number;
  status: string;
  categoryKey: string;
};

type MapZone = {
  id: string;
  name: string;
  tier: string;
  polygon: string;
};

type CoverageCell = {
  scanId: string;
  pointIndex: number;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: string;
};

function markerColor(score: number, status: string): string {
  if (status === "DISCARDED" || status === "DUPLICATE") return "#8c8580";
  if (status === "EXISTING_CLIENT") return "#2563eb";
  if (score >= 80) return "#b42318";
  if (score >= 60) return "#d97706";
  return "#2f6b4f";
}

function zoneColor(tier: string): string {
  if (tier === "A") return "#9f3026";
  if (tier === "B") return "#b7791f";
  if (tier === "C") return "#3f6f5b";
  return "#6b6560";
}

function coverageColor(status: string): string {
  if (status === "COMPLETED") return "#2f6b4f";
  if (status === "FAILED") return "#b42318";
  if (status === "RUNNING") return "#2563eb";
  return "#8c8580";
}

function popupNode(prospect: MapProspect): HTMLElement {
  const container = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = prospect.name;
  const address = document.createElement("div");
  address.textContent = prospect.address;
  address.style.marginTop = "4px";
  const score = document.createElement("div");
  score.textContent = `Score ${prospect.score}/100 · ${prospect.categoryKey}`;
  score.style.marginTop = "4px";
  const link = document.createElement("a");
  link.href = `/admin/potenciales/${prospect.id}`;
  link.textContent = "Abrir ficha";
  link.style.display = "inline-block";
  link.style.marginTop = "7px";
  link.style.fontWeight = "700";
  container.append(title, address, score, link);
  return container;
}

export default function ProspectDiscoveryMap({
  prospects,
  zones,
  coverage,
  selectedId,
  onSelect,
  previewPoints = [],
}: {
  prospects: MapProspect[];
  zones: MapZone[];
  coverage: CoverageCell[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  previewPoints?: { latitude: number; longitude: number }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const prospectsLayerRef = useRef<L.LayerGroup | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const coverageLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef(new Map<string, L.CircleMarker>());
  const fittedRef = useRef(false);
  const [showZones, setShowZones] = useState(true);
  const [showCoverage, setShowCoverage] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const markers = markerByIdRef.current;
    const map = L.map(containerRef.current, {
      zoomControl: true,
    }).setView([-34.48, -58.55], 11);
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    prospectsLayerRef.current = L.layerGroup().addTo(map);
    zonesLayerRef.current = L.layerGroup().addTo(map);
    coverageLayerRef.current = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      mapRef.current = null;
      prospectsLayerRef.current = null;
      zonesLayerRef.current = null;
      coverageLayerRef.current = null;
      markers.clear();
      map.stop();
      map.off();
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = prospectsLayerRef.current;
    if (!map || !layer) return;

    const renderClusters = () => {
      if (
        mapRef.current !== map ||
        !map.getContainer().isConnected
      ) {
        return;
      }
      layer.clearLayers();
      markerByIdRef.current.clear();
      const buckets = new Map<string, MapProspect[]>();
      const clusterPixels = map.getZoom() >= 15 ? 35 : 65;
      for (const prospect of prospects) {
        const point = map.latLngToContainerPoint([
          prospect.latitude,
          prospect.longitude,
        ]);
        const key = `${Math.floor(point.x / clusterPixels)}:${Math.floor(point.y / clusterPixels)}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(prospect);
        buckets.set(key, bucket);
      }
      for (const bucket of buckets.values()) {
        if (bucket.length === 1) {
          const prospect = bucket[0];
          const selected = prospect.id === selectedId;
          const marker = L.circleMarker(
            [prospect.latitude, prospect.longitude],
            {
              radius: selected ? 10 : 7,
              color: "#ffffff",
              weight: selected ? 3 : 2,
              fillColor: markerColor(prospect.score, prospect.status),
              fillOpacity: 0.95,
            }
          )
            .bindPopup(popupNode(prospect))
            .on("click", () => onSelect?.(prospect.id))
            .addTo(layer);
          markerByIdRef.current.set(prospect.id, marker);
        } else {
          const latitude =
            bucket.reduce((sum, item) => sum + item.latitude, 0) / bucket.length;
          const longitude =
            bucket.reduce((sum, item) => sum + item.longitude, 0) / bucket.length;
          const bestScore = Math.max(...bucket.map((item) => item.score));
          const cluster = L.circleMarker([latitude, longitude], {
            radius: Math.min(20, 9 + Math.log2(bucket.length) * 2),
            color: "#ffffff",
            weight: 2,
            fillColor: markerColor(bestScore, ""),
            fillOpacity: 0.9,
          });
          cluster
            .bindTooltip(String(bucket.length), {
              permanent: true,
              direction: "center",
              className: "font-bold",
            })
            .on("click", () => {
              map.fitBounds(
                L.latLngBounds(
                  bucket.map((item) => [item.latitude, item.longitude])
                ),
                { padding: [50, 50], maxZoom: 17 }
              );
            })
            .addTo(layer);
        }
      }
    };
    renderClusters();
    map.on("zoomend moveend", renderClusters);
    return () => {
      map.off("zoomend moveend", renderClusters);
    };
  }, [prospects, selectedId, onSelect]);

  useEffect(() => {
    const layer = zonesLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!showZones) return;
    for (const zone of zones) {
      try {
        const geometry = JSON.parse(zone.polygon) as GeoJSON.Polygon;
        L.geoJSON(
          { type: "Feature", properties: {}, geometry } as GeoJSON.Feature,
          {
            style: {
              color: zoneColor(zone.tier),
              fillColor: zoneColor(zone.tier),
              fillOpacity: 0.08,
              weight: 2,
              dashArray: zone.tier === "EXCLUDED" ? "5 6" : undefined,
            },
          }
        )
          .bindTooltip(`${zone.name} · Tier ${zone.tier}`)
          .addTo(layer);
      } catch {
        // Un polígono corrupto se ignora en el mapa; la edición server lo valida.
      }
    }
  }, [zones, showZones]);

  useEffect(() => {
    const layer = coverageLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showCoverage) return;
    for (const cell of coverage) {
      L.circle([cell.latitude, cell.longitude], {
        radius: Math.min(cell.radiusMeters, 1_000),
        color: coverageColor(cell.status),
        fillColor: coverageColor(cell.status),
        fillOpacity: 0.025,
        weight: 1,
        opacity: 0.3,
      }).addTo(layer);
    }
    for (const point of previewPoints) {
      L.circleMarker([point.latitude, point.longitude], {
        radius: 4,
        color: "#0a0a0a",
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: 2,
      }).addTo(layer);
    }
  }, [coverage, previewPoints, showCoverage]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current) return;
    const points: [number, number][] = [
      ...prospects.map(
        (prospect) =>
          [prospect.latitude, prospect.longitude] as [number, number]
      ),
      ...previewPoints.map(
        (point) => [point.latitude, point.longitude] as [number, number]
      ),
    ];
    for (const zone of zones) {
      try {
        const geometry = JSON.parse(zone.polygon) as GeoJSON.Polygon;
        for (const [longitude, latitude] of geometry.coordinates[0] ?? []) {
          points.push([latitude, longitude]);
        }
      } catch {
        // Ignorar geometría corrupta.
      }
    }
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [35, 35],
        maxZoom: 15,
      });
      fittedRef.current = true;
    }
  }, [prospects, previewPoints, zones]);

  useEffect(() => {
    if (!selectedId) return;
    const map = mapRef.current;
    const marker = markerByIdRef.current.get(selectedId);
    if (
      !marker ||
      !map ||
      !map.getContainer().isConnected ||
      !map.hasLayer(marker)
    ) {
      return;
    }
    marker.openPopup();
  }, [selectedId]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Color por score · azul = cliente · áreas suaves = cobertura
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowZones((value) => !value)}
            aria-pressed={showZones}
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              showZones ? "border-black bg-black text-white" : "border-line bg-white text-muted"
            }`}
          >
            Zonas
          </button>
          <button
            type="button"
            onClick={() => setShowCoverage((value) => !value)}
            aria-pressed={showCoverage}
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              showCoverage ? "border-black bg-black text-white" : "border-line bg-white text-muted"
            }`}
          >
            Cobertura
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[460px] w-full overflow-hidden rounded-lg border border-line bg-white"
        style={{ zIndex: 0 }}
        aria-label="Mapa de puntos potenciales de venta"
      />
    </div>
  );
}
