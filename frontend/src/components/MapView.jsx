import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useDetectionStore } from '../store/detectionStore';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../utils/colorMap';

export default function MapView() {
  const { detectionResult, selectedCategories, confidenceThreshold } = useDetectionStore();

  // Build GeoJSON from detections that have geo coordinates
  const geojsonData = useMemo(() => {
    if (!detectionResult?.detections) return null;

    const activeCats = selectedCategories ||
      [...new Set(detectionResult.detections.map(d => d.category))];

    const features = detectionResult.detections
      .filter(det => {
        if (det.confidence < confidenceThreshold) return false;
        if (!activeCats.includes(det.category)) return false;
        if (!det.bbox_geo) return false;
        return true;
      })
      .map((det, i) => {
        const [lon1, lat1, lon2, lat2] = det.bbox_geo;
        return {
          type: 'Feature',
          id: i,
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [lon1, lat1], [lon2, lat1],
              [lon2, lat2], [lon1, lat2], [lon1, lat1],
            ]],
          },
          properties: {
            category: det.category,
            confidence: det.confidence,
            area_sqm: det.area_sqm,
            color: det.color,
          },
        };
      });

    if (features.length === 0) return null;

    return { type: 'FeatureCollection', features };
  }, [detectionResult, selectedCategories, confidenceThreshold]);

  // Calculate center from geo data
  const center = useMemo(() => {
    if (!geojsonData?.features?.length) return [20.5937, 78.9629]; // Default: India center
    const lats = [];
    const lons = [];
    geojsonData.features.forEach(f => {
      f.geometry.coordinates[0].forEach(([lon, lat]) => {
        lats.push(lat);
        lons.push(lon);
      });
    });
    return [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lons.reduce((a, b) => a + b, 0) / lons.length,
    ];
  }, [geojsonData]);

  if (!detectionResult) return null;

  const hasGeoData = geojsonData && geojsonData.features.length > 0;

  const styleFeature = (feature) => ({
    color: feature.properties.color || '#6366f1',
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.25,
    fillColor: feature.properties.color || '#6366f1',
  });

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    const label = CATEGORY_LABELS[p.category] || p.category;
    layer.bindPopup(`
      <div style="font-family: Avenir Next, Avenir, Segoe UI, sans-serif; font-size: 13px; line-height: 1.6;">
        <strong style="font-size: 14px;">${label}</strong><br/>
        Confidence: <b>${Math.round(p.confidence * 100)}%</b><br/>
        ${p.area_sqm ? `Area: <b>${p.area_sqm.toLocaleString()} m²</b>` : ''}
      </div>
    `);
  };

  return (
    <div className="w-full animate-fade-in" id="map-view">
      {hasGeoData ? (
        <div className="rounded-2xl overflow-hidden border border-surface-700/30" style={{ height: '500px' }}>
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              key={JSON.stringify(geojsonData)}
              data={geojsonData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>
      ) : (
        <div className="glass-card-static p-10 text-center">
          <div className="mb-4 inline-flex rounded-2xl border border-brand-500/18 bg-brand-500/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-200">
            Map mode standby
          </div>
          <p className="text-lg font-semibold text-white">
            No geographic data available yet
          </p>
          <p className="mt-2 text-xs leading-6 text-surface-300/60">
            Upload a GeoTIFF or any image with CRS metadata to unlock the premium GIS review surface.
          </p>
        </div>
      )}
    </div>
  );
}
