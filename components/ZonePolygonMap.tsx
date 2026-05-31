"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type { GeoPolygon } from "@/lib/zones";

// Interactive map where the admin draws / edits ONE coverage polygon per zone.
// Emits the polygon as GeoJSON (or null when cleared) via onChange.
//
// Leaflet uses [lat, lng]; GeoJSON uses [lng, lat]. We convert at the edges.

const DEFAULT_CENTER: [number, number] = [-34.47, -58.52]; // San Isidro-ish
const DEFAULT_ZOOM = 13;

export default function ZonePolygonMap({
  initial,
  onChange,
}: {
  initial: GeoPolygon | null;
  onChange: (polygon: GeoPolygon | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // The feature group that holds the (single) drawn polygon.
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  // Keep the latest onChange without re-running the setup effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;

    // Helper: read the single polygon back out as GeoJSON, or null.
    function emit() {
      const layers = drawnItems.getLayers();
      if (layers.length === 0) {
        onChangeRef.current(null);
        return;
      }
      const gj = (layers[0] as L.Polygon).toGeoJSON();
      const geom = gj.geometry;
      if (geom.type === "Polygon") {
        onChangeRef.current(geom as GeoPolygon);
      }
    }

    // Load the existing polygon, if any, and fit the view to it.
    if (initial && initial.coordinates?.[0]?.length >= 3) {
      const layer = L.geoJSON(
        { type: "Feature", geometry: initial, properties: {} } as GeoJSON.Feature
      );
      layer.eachLayer((l) => drawnItems.addLayer(l));
      try {
        map.fitBounds(drawnItems.getBounds(), { padding: [20, 20] });
      } catch {
        // empty bounds — ignore
      }
    }

    // Draw controls: only polygons; edit/delete the existing one.
    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: { allowIntersection: false, showArea: false },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: { featureGroup: drawnItems, remove: true },
    });
    map.addControl(drawControl);

    // Only one polygon per zone: replace any existing one when a new is drawn.
    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      drawnItems.clearLayers();
      drawnItems.addLayer((e as unknown as { layer: L.Layer }).layer);
      emit();
    });
    map.on(L.Draw.Event.EDITED, emit);
    map.on(L.Draw.Event.DELETED, emit);

    // Leaflet sometimes needs a nudge to size correctly inside flex/grid.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-lg border border-line"
      // Leaflet panes must sit above nothing in particular; keep it contained.
      style={{ zIndex: 0 }}
    />
  );
}
