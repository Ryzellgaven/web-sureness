import L from 'leaflet';
import { diplomahanMunicipalityBoundary } from '@/data/diplahan-municipality';

export function addBaseMapLayers(map: L.Map): void {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

}

export function hasQgisBoundaryLayer(): boolean {
  return Boolean(import.meta.env.VITE_QGIS_WMS_URL?.trim() && import.meta.env.VITE_QGIS_WMS_LAYERS?.trim());
}

export function createMunicipalityBoundaryLayer(): L.LayerGroup {
  const outline = L.geoJSON(diplomahanMunicipalityBoundary as never, {
    style: { color: '#ffffff', weight: 6, opacity: 0.95, fillOpacity: 0 },
    interactive: false,
  });
  const boundary = L.geoJSON(diplomahanMunicipalityBoundary as never, {
    style: { color: '#7a263a', weight: 2.5, opacity: 1, fillColor: '#7a263a', fillOpacity: 0.045 },
    onEachFeature: (_feature, layer) => {
      layer.bindTooltip('Diplahan Municipality', { sticky: true, className: 'barangay-label' });
      layer.bindPopup('<strong>Diplahan Municipality</strong><br>Boundary: geoBoundaries, based on NAMRIA / PSA / OCHA Philippines<br>License: CC BY 3.0 IGO');
    },
  });
  return L.layerGroup([outline, boundary]);
}

export function createQgisBoundaryLayer(): L.LayerGroup | null {
  const url = import.meta.env.VITE_QGIS_WMS_URL?.trim();
  const layers = import.meta.env.VITE_QGIS_WMS_LAYERS?.trim();
  if (!url || !layers) return null;
  return L.layerGroup([L.tileLayer.wms(url, {
    layers,
    format: 'image/png',
    transparent: true,
    attribution: 'QGIS Server',
  })]);
}