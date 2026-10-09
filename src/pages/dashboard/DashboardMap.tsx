import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { assignResponder, getAllReports, getEvacuationCenters, getStaffProfiles } from '@/lib/api';
import { addBaseMapLayers, createMunicipalityBoundaryLayer, createQgisBoundaryLayer, hasQgisBoundaryLayer } from '@/lib/map-layers';
import { DIPLAHAN_BOUNDS } from '@/data/diplahan-municipality';
import type { EmergencyReport, EvacuationCenter, Profile } from '@/types/index';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Layers, X, LocateFixed, MapPinned, UserRound, Phone, Send } from 'lucide-react';
import { format } from 'date-fns';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e', moderate: '#eab308', high: '#f97316', critical: '#ef4444',
};

function incidentIcon(severity: string, status: string) {
  const c = SEVERITY_COLORS[severity] ?? '#aaa';
  const alertClass = status === 'open' ? ' incident-marker--alert' : '';
  return L.divIcon({
    html: `<span class="incident-marker${alertClass}" style="--incident-color:${c}"><span class="incident-marker__pulse"></span><span class="incident-marker__dot"></span></span>`,
    className: 'incident-map-icon', iconSize: [28, 28], iconAnchor: [14, 14],
  });
}
const shelterIcon = L.divIcon({
  html: `<div style="background:#0891b2;width:18px;height:18px;border-radius:4px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px">🏥</div>`,
  className: '', iconSize: [18, 18], iconAnchor: [9, 9],
});
const responderIcon = L.divIcon({
  html: `<div style="background:#7c3aed;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px #7c3aed"></div>`,
  className: '', iconSize: [14, 14], iconAnchor: [7, 7],
});

interface SelectedReport extends EmergencyReport { _selected?: boolean }

export default function DashboardMap() {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const municipalityRef = useRef<L.LayerGroup | null>(null);
  const boundaryRef = useRef<L.LayerGroup | null>(null);
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<SelectedReport | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rRes, cData] = await Promise.all([
      getAllReports(0, 200, {}),
      getEvacuationCenters(),
    ]);
    setReports(rRes.data.filter(r => r.latitude && r.longitude));
    setCenters(cData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { getStaffProfiles().then(setStaff); }, []);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    mapRef.current = L.map(mapDivRef.current, { center: [7.8123, 122.9456], zoom: 13 });
    addBaseMapLayers(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);

    // ── Barangay boundary layer ─────────────────────────────────────────────
    municipalityRef.current = createMunicipalityBoundaryLayer().addTo(mapRef.current);
    boundaryRef.current = createQgisBoundaryLayer();
    boundaryRef.current?.addTo(mapRef.current);

    // Fit map to Diplahan municipal bounds on load
    mapRef.current.fitBounds(DIPLAHAN_BOUNDS, { padding: [16, 16] });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !boundaryRef.current) return;
    if (showBoundaries) {
      municipalityRef.current?.addTo(mapRef.current);
      boundaryRef.current?.addTo(mapRef.current);
    } else {
      if (municipalityRef.current) mapRef.current.removeLayer(municipalityRef.current);
      if (boundaryRef.current) mapRef.current.removeLayer(boundaryRef.current);
    }
  }, [showBoundaries]);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();
    reports.forEach(r => {
      if (!r.latitude || !r.longitude) return;
      L.marker([r.latitude, r.longitude], { icon: incidentIcon(r.severity, r.status) })
        .bindTooltip(`${r.emergency_type.toUpperCase()} · ${r.severity}`, { direction: 'top' })
        .on('click', () => { setSelected(r); setAssignTo(r.assigned_to ?? ''); })
        .addTo(layerRef.current!);
    });
    centers.filter(c => c.status === 'active').forEach(c => {
      L.marker([c.latitude, c.longitude], { icon: shelterIcon })
        .bindTooltip(c.name, { direction: 'top' })
        .addTo(layerRef.current!);
    });
  }, [reports, centers]);

  const handleDispatch = async () => {
    if (!user || !selected || !assignTo || dispatching) return;
    const responder = staff.find(member => member.id === assignTo);
    if (!responder) return;

    setDispatching(true);
    const { error } = await assignResponder(selected.id, assignTo, user.id, 'Dispatched from live incident map');
    if (error) {
      toast.error(error.message);
      setDispatching(false);
      return;
    }

    const location = selected.address_text
      || (selected.latitude !== null && selected.longitude !== null
        ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
        : 'Location not provided');
    const { error: notificationError } = await supabase.from('notifications').insert({
      title: `Rescue dispatch: ${selected.emergency_type}`,
      body: `${selected.severity.toUpperCase()} incident at ${location}. ${selected.description ?? ''}`.trim(),
      channel: 'in_app',
      status: 'sent',
      target_user_id: assignTo,
      sent_by: user.id,
      sent_at: new Date().toISOString(),
    });

    const updated = {
      ...selected,
      assigned_to: assignTo,
      assigned_profile: { full_name: responder.full_name },
      status: 'in_progress' as const,
    };
    setSelected(updated);
    setReports(current => current.map(report => report.id === updated.id ? updated : report));
    if (notificationError) {
      toast.warning('Responder assigned, but the in-app alert could not be saved.');
    } else {
      toast.success(`${responder.full_name ?? 'Responder'} assigned and alerted`);
    }
    setDispatching(false);
  };

  useEffect(() => {
    const ch = supabase.channel('dashboard-map-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_reports' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  const openCount = reports.filter(r => r.status === 'open').length;
  const inProgressCount = reports.filter(r => r.status === 'in_progress').length;

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0 gap-3">
        <div>
          <h1 className="text-sm font-bold">Live Incident Map</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              <span className="text-[hsl(var(--severity-critical))] font-medium">{openCount}</span> open ·{' '}
              <span className="text-[hsl(var(--severity-high))] font-medium">{inProgressCount}</span> in progress
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => setShowLegend(v => !v)}>
            <Layers className="h-3.5 w-3.5 mr-1" />Legend
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Fit Diplahan area" aria-label="Fit Diplahan area" onClick={() => mapRef.current?.fitBounds(DIPLAHAN_BOUNDS, { padding: [24, 24] })}>
            <LocateFixed className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div ref={mapDivRef} className="absolute inset-0" />

        {/* Legend */}
        {showLegend && (
          <div className="absolute top-3 right-3 z-[1000] bg-card/95 border border-border rounded-md p-3 shadow-lg backdrop-blur min-w-[190px]">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <MapPinned className="h-3.5 w-3.5 text-primary" />Map layers
            </div>
            {hasQgisBoundaryLayer() ? (
              <label className="mb-3 flex cursor-pointer items-center gap-2 border-b border-border pb-2 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={showBoundaries} onChange={event => setShowBoundaries(event.target.checked)} className="accent-primary" />
                Diplahan municipal boundary
              </label>
            ) : (
              <label className="mb-3 flex cursor-pointer items-center gap-2 border-b border-border pb-2 text-[11px] text-muted-foreground">
                <input type="checkbox" checked={showBoundaries} onChange={event => setShowBoundaries(event.target.checked)} className="accent-primary" />
                Diplahan municipal boundary
              </label>
            )}
            <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">Municipality outline only; official barangay divisions are not included.</p>
            {Object.entries(SEVERITY_COLORS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: v }} />
                {k} severity
              </div>
            ))}
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative ml-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-[hsl(var(--severity-critical))] after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-[hsl(var(--severity-critical)/0.3)]" />
              Open alert · click for details
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="h-3.5 w-3.5 rounded-sm bg-[#0891b2] shrink-0" />
              Evacuation Center
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-full bg-[#7c3aed] shrink-0" />
              Responder
            </div>
          </div>
        )}

        {/* Selected report panel */}
        {selected && (
          <section className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[23rem] max-h-[min(70vh,38rem)] overflow-y-auto z-[1000] bg-card/95 backdrop-blur border border-border rounded-md p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold capitalize">{selected.emergency_type} emergency</span>
                  <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium status-${selected.status}`}>{selected.status.replace('_', ' ')}</span>
                </div>
                <p className={`text-xs font-semibold capitalize severity-${selected.severity}`}>{selected.severity} severity</p>
              </div>
              <button aria-label="Close incident details" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>{selected.profiles?.full_name ?? 'Reporter details unavailable'}</span></div>
              {selected.profiles?.phone && <a href={`tel:${selected.profiles.phone}`} className="flex items-center gap-2 text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{selected.profiles.phone}</a>}
              <div className="flex items-start gap-2"><MapPinned className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>{selected.address_text || (selected.latitude !== null && selected.longitude !== null ? `${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}` : 'Location not provided')}</span></div>
              {selected.description && <p className="rounded bg-muted/70 p-2.5 leading-relaxed">{selected.description}</p>}
              <p className="text-[11px] text-muted-foreground">Reported {format(new Date(selected.created_at), 'MMM d, yyyy · h:mm a')}</p>
              {selected.photo_url && <a href={selected.photo_url} target="_blank" rel="noreferrer" className="block text-primary underline">Open submitted photo</a>}
              {selected.assigned_profile?.full_name && <p className="text-xs text-muted-foreground">Assigned to {selected.assigned_profile.full_name}</p>}
            </div>

            {selected.status !== 'resolved' && selected.status !== 'closed' && (
              <div className="mt-4 border-t border-border pt-3">
                <label htmlFor="map-dispatch-responder" className="mb-1.5 block text-xs font-semibold">Dispatch rescue response</label>
                <div className="flex gap-2">
                  <select id="map-dispatch-responder" value={assignTo} onChange={event => setAssignTo(event.target.value)} className="h-9 min-w-0 flex-1 rounded border border-input bg-background px-2 text-xs">
                    <option value="">Select responder</option>
                    {staff.map(member => <option key={member.id} value={member.id}>{member.full_name ?? member.email ?? 'Staff member'} · {member.role.replace('_', ' ')}</option>)}
                  </select>
                  <Button size="sm" className="h-9 shrink-0 px-3 text-xs" onClick={handleDispatch} disabled={!assignTo || dispatching}>
                    <Send className="mr-1.5 h-3.5 w-3.5" />{dispatching ? 'Sending…' : 'Dispatch'}
                  </Button>
                </div>
                {staff.length === 0 && <p className="mt-1.5 text-[11px] text-muted-foreground">No active responders are available to assign.</p>}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
