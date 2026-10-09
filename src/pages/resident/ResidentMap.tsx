import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/db/supabase';
import { getEvacuationCenters } from '@/lib/api';
import { findSafeRoute } from '@/lib/hazard-routing';
import { addBaseMapLayers, createMunicipalityBoundaryLayer, createQgisBoundaryLayer } from '@/lib/map-layers';
import { DIPLAHAN_BOUNDS } from '@/data/diplahan-municipality';
import type { EmergencyReport, EvacuationCenter } from '@/types/index';
import { AlertTriangle, Shield, Loader2, RefreshCw, Navigation, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string,unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e', moderate: '#eab308', high: '#f97316', critical: '#ef4444',
};

function makeMarker(color: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px ${color}88"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
const shelterIcon = L.divIcon({
  html: `<div style="background:#00bcd4;width:16px;height:16px;border-radius:3px;border:2px solid #fff;display:flex;align-items:center;justify-content:center">🏥</div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const myLocIcon = L.divIcon({
  html: `<div style="background:#00e5ff;width:12px;height:12px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 10px #00e5ff"></div>`,
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function ResidentMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const municipalityRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryRef = useRef<L.LayerGroup | null>(null);
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [destinationId, setDestinationId] = useState('');
  const [routeStatus, setRouteStatus] = useState<'idle' | 'loading' | 'ready' | 'blocked' | 'error'>('idle');
  const [routeSummary, setRouteSummary] = useState('');
  const [loading, setLoading] = useState(true);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      position => setMyPos([position.coords.latitude, position.coords.longitude]),
      () => setRouteStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const loadData = useCallback(async () => {
    const [rRes, cRes] = await Promise.all([
      supabase.from('emergency_reports').select('id,emergency_type,severity,latitude,longitude,address_text,status')
        .in('status', ['open','in_progress']).not('latitude','is',null).order('created_at',{ascending:false}).limit(100),
      getEvacuationCenters(),
    ]);
    setReports(Array.isArray(rRes.data) ? rRes.data as EmergencyReport[] : []);
    setCenters(cRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    captureLocation();
  }, [loadData, captureLocation]);

  // Init map
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    mapRef.current = L.map(mapDivRef.current, {
      center: [7.8123, 122.9456],
      zoom: 13,
      zoomControl: true,
    });
    addBaseMapLayers(mapRef.current);
    markersRef.current = L.layerGroup().addTo(mapRef.current);
    routeLayerRef.current = L.layerGroup().addTo(mapRef.current);

    // ── Barangay boundary layer ─────────────────────────────────────────────
    municipalityRef.current = createMunicipalityBoundaryLayer().addTo(mapRef.current);
    boundaryRef.current = createQgisBoundaryLayer();
    boundaryRef.current?.addTo(mapRef.current);

    // Fit map to Diplahan municipal bounds on load
    mapRef.current.fitBounds(DIPLAHAN_BOUNDS, { padding: [16, 16] });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    reports.forEach(r => {
      if (r.latitude && r.longitude) {
        const color = SEVERITY_COLORS[r.severity] ?? '#aaa';
        L.marker([r.latitude, r.longitude], { icon: makeMarker(color) })
          .bindPopup(`<b>${r.emergency_type.toUpperCase()}</b><br>Severity: ${r.severity}<br>Status: ${r.status}`)
          .addTo(markersRef.current!);
      }
    });

    centers.filter(c => c.status === 'active').forEach(c => {
      L.marker([c.latitude, c.longitude], { icon: shelterIcon })
        .bindPopup(`<b>${c.name}</b><br>${c.address}<br>Capacity: ${c.capacity}`)
        .addTo(markersRef.current!);
    });

    if (myPos) {
      L.marker(myPos, { icon: myLocIcon })
        .bindPopup('<b>Your Location</b>')
        .addTo(markersRef.current!);
      mapRef.current.setView(myPos, 14);
    }
  }, [reports, centers, myPos]);

  const activeCenters = centers.filter(center => center.status === 'active');
  const activeLandslides = reports.filter(report =>
    report.emergency_type === 'landslide'
    && report.latitude !== null
    && report.longitude !== null,
  );

  useEffect(() => {
    if (!myPos || destinationId || activeCenters.length === 0) return;
    const nearest = activeCenters.reduce((closest, center) => {
      const distance = L.latLng(myPos).distanceTo([center.latitude, center.longitude]);
      return distance < closest.distance ? { center, distance } : closest;
    }, {
      center: activeCenters[0],
      distance: L.latLng(myPos).distanceTo([activeCenters[0].latitude, activeCenters[0].longitude]),
    });
    setDestinationId(nearest.center.id);
  }, [myPos, destinationId, activeCenters]);

  useEffect(() => {
    const destination = activeCenters.find(center => center.id === destinationId);
    if (!myPos || !destination || !routeLayerRef.current) return;

    let cancelled = false;
    setRouteStatus('loading');
    setRouteSummary('Checking road routes around reported landslides');
    routeLayerRef.current.clearLayers();

    findSafeRoute(
      myPos,
      [destination.latitude, destination.longitude],
      activeLandslides.map(report => [report.latitude!, report.longitude!]),
    ).then(route => {
      if (cancelled || !routeLayerRef.current) return;
      routeLayerRef.current.clearLayers();
      if (!route) {
        setRouteStatus('blocked');
        setRouteSummary('No route alternative clears reported landslides. Contact LDRRMO before traveling.');
        return;
      }
      L.polyline(route.coordinates, { color: '#087f5b', weight: 6, opacity: 0.9 }).addTo(routeLayerRef.current);
      setRouteStatus('ready');
      const minutes = Math.max(1, Math.round(route.duration / 60));
      setRouteSummary(`${(route.distance / 1000).toFixed(1)} km · about ${minutes} min · ${activeLandslides.length} landslide reports avoided`);
    }).catch(() => {
      if (cancelled) return;
      setRouteStatus('error');
      setRouteSummary('Route service unavailable. Check road conditions with LDRRMO before traveling.');
    });

    return () => { cancelled = true; };
  }, [myPos, destinationId, centers, reports]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('resident-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_reports' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-sm font-bold">Incident Map</h1>
          <p className="text-xs text-muted-foreground">{reports.length} active incidents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(SEVERITY_COLORS).map(([k,v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{background:v}} />
                {k}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-primary/60" />shelter
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={captureLocation}>
            <LocateFixed className="h-3.5 w-3.5" />GPS
          </Button>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <div className="flex-1 min-h-0 w-full relative">
        <div ref={mapDivRef} className="absolute inset-0" />
        <section className="absolute left-3 top-3 z-[1000] w-[min(22rem,calc(100%-1.5rem))] rounded border border-border bg-card/95 p-3 shadow-md backdrop-blur">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <Navigation className="h-4 w-4 text-primary" />
            Suggested route
          </div>
          <label htmlFor="evacuation-destination" className="mb-1 block text-[11px] text-muted-foreground">Evacuation center</label>
          <select
            id="evacuation-destination"
            value={destinationId}
            onChange={event => setDestinationId(event.target.value)}
            className="h-9 w-full rounded border border-input bg-background px-2 text-xs"
          >
            <option value="">Select a center</option>
            {activeCenters.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}
          </select>
          <p className={`mt-2 text-[11px] ${routeStatus === 'blocked' || routeStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {routeStatus === 'loading' && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
            {myPos ? routeSummary || 'Preparing route options' : 'Allow location access to calculate a route'}
          </p>
          {activeLandslides.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-[hsl(var(--severity-high))]">
              <AlertTriangle className="h-3 w-3" />Route recalculates when new landslide reports arrive
            </p>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">Based on public road data and unverified reports. Confirm conditions with LDRRMO.</p>
        </section>
      </div>
    </div>
  );
}
