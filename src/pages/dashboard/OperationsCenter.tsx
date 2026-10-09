import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { getIotDevices } from '@/lib/api';
import type { EmergencyReport, IotDevice } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle, Activity, MapPin, Clock, ChevronRight, Radio,
} from 'lucide-react';
import { format } from 'date-fns';

export default function OperationsCenter() {
  const [recentReports, setRecentReports] = useState<EmergencyReport[]>([]);
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [rRes, devData] = await Promise.all([
      supabase.from('emergency_reports')
        .select('id,emergency_type,severity,status,address_text,latitude,longitude,created_at,profiles!reporter_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
      getIotDevices(),
    ]);
    const reports = Array.isArray(rRes.data) ? rRes.data as unknown as EmergencyReport[] : [];
    setRecentReports(reports);
    setDevices(devData);

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel('ops-center-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_reports' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const alertDevices = devices.filter(d => d.last_reading !== null && d.last_reading >= d.alert_threshold);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">LDRRMO Dashboard</p>
        <h1 className="text-xl font-bold">Operations Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time emergency response overview</p>
      </div>

      {/* IoT Alert Banner */}
      {alertDevices.length > 0 && (
        <div className="mb-6 rounded border border-[hsl(var(--severity-critical)/0.5)] bg-[hsl(var(--severity-critical)/0.08)] p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--severity-critical))] shrink-0 mt-0.5 critical-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[hsl(var(--severity-critical))] mb-1">Sensor Threshold Exceeded</p>
            <div className="flex flex-wrap gap-2">
              {alertDevices.map(d => (
                <span key={d.id} className="text-xs text-muted-foreground">{d.name}: <b>{d.last_reading} {d.alert_unit}</b></span>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 h-7 text-xs">
            <Link to="/dashboard/iot">View IoT</Link>
          </Button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Live Map', href: '/dashboard/map', icon: MapPin },
          { label: 'Reports', href: '/dashboard/reports', icon: AlertTriangle },
          { label: 'IoT Monitor', href: '/dashboard/iot', icon: Activity },
          { label: 'Broadcast', href: '/dashboard/broadcast', icon: Radio },
        ].map(a => (
          <Button key={a.href} variant="outline" asChild className="h-16 flex-col gap-1.5 text-xs">
            <Link to={a.href}>
              <a.icon className="h-5 w-5 text-primary" />
              {a.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Recent reports */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Reports</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs h-7">
            <Link to="/dashboard/reports">View All <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentReports.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No reports yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentReports.map(r => (
                <div key={r.id} className="py-3 flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: { low:'#22c55e',moderate:'#eab308',high:'#f97316',critical:'#ef4444' }[r.severity] ?? '#aaa' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium capitalize">{r.emergency_type}</span>
                      <span className={`text-[10px] rounded px-1 py-0.5 font-medium status-${r.status}`}>{r.status.replace('_',' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 mt-0.5">
                      {r.profiles?.full_name && <span>{r.profiles.full_name}</span>}
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{format(new Date(r.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
