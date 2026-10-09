import { useEffect, useState, useCallback } from 'react';
import { getIotDevices, getSensorReadings } from '@/lib/api';
import { supabase } from '@/db/supabase';
import type { IotDevice, SensorReading } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Activity, AlertTriangle, RefreshCw, Cpu, Droplets, CloudRain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

function DeviceIcon({ type }: { type: string }) {
  if (type === 'rainfall') return <CloudRain className="h-4 w-4 text-primary" />;
  return <Droplets className="h-4 w-4 text-primary" />;
}

function StatusDot({ status, isAlert }: { status: string; isAlert?: boolean }) {
  if (isAlert) return <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--severity-critical))] critical-pulse shrink-0" />;
  if (status === 'active') return <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--severity-low))] shrink-0" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40 shrink-0" />;
}

function SensorChart({ readings, threshold, unit }: { readings: SensorReading[]; threshold: number; unit: string }) {
  const data = [...readings].reverse().slice(-30).map(r => ({
    time: format(new Date(r.recorded_at), 'HH:mm'),
    value: r.value,
    alert: r.is_alert,
  }));

  return (
    <div className="h-28 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 4, fontSize: 11 }}
            formatter={(v: number) => [`${v} ${unit}`, 'Reading']}
          />
          <ReferenceLine y={threshold} stroke="hsl(var(--severity-critical))" strokeDasharray="3 3" label={{ value: 'Threshold', fill: 'hsl(var(--severity-critical))', fontSize: 9, position: 'insideTopRight' }} />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function IoTDashboard() {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [readings, setReadings] = useState<Record<string, SensorReading[]>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const devs = await getIotDevices();
    setDevices(devs);
    const readMap: Record<string, SensorReading[]> = {};
    await Promise.all(devs.map(async d => {
      readMap[d.id] = await getSensorReadings(d.id, 40);
    }));
    setReadings(readMap);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const ch = supabase.channel('iot-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, loadAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'iot_devices' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  const alertDevices = devices.filter(d => d.last_reading !== null && d.last_reading >= d.alert_threshold);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Operations Center</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary shrink-0" />
            IoT Flood Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{devices.length} sensor{devices.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Alert banner */}
      {alertDevices.length > 0 && (
        <div className="mb-6 rounded border border-[hsl(var(--severity-critical)/0.5)] bg-[hsl(var(--severity-critical)/0.1)] p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--severity-critical))] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--severity-critical))] mb-1">⚠️ Threshold Exceeded</p>
            {alertDevices.map(d => (
              <p key={d.id} className="text-xs text-muted-foreground">
                {d.name}: {d.last_reading} {d.alert_unit} (threshold: {d.alert_threshold} {d.alert_unit})
              </p>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-48 rounded" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map(d => {
            const devReadings = readings[d.id] ?? [];
            const isAlert = d.last_reading !== null && d.last_reading >= d.alert_threshold;
            return (
              <Card key={d.id} className={`bg-card border-border ${isAlert ? 'border-[hsl(var(--severity-critical)/0.5)]' : ''}`}>
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <StatusDot status={d.status} isAlert={isAlert} />
                    <DeviceIcon type={d.sensor_type} />
                    <span className="flex-1 min-w-0 truncate">{d.name}</span>
                    {isAlert && <Badge className="status-open text-[10px] shrink-0">ALERT</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="flex items-end justify-between gap-3 mb-1">
                    <div>
                      <p className="text-2xl font-bold">
                        {d.last_reading !== null ? d.last_reading.toFixed(2) : '—'}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{d.alert_unit}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Threshold: {d.alert_threshold} {d.alert_unit}
                        {d.last_reading_at && ` · ${format(new Date(d.last_reading_at), 'HH:mm')}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">{d.sensor_type.replace('_', ' ')}</p>
                      <p className="text-[10px] text-muted-foreground/60">{d.device_code}</p>
                    </div>
                  </div>
                  {devReadings.length > 0 ? (
                    <SensorChart readings={devReadings} threshold={d.alert_threshold} unit={d.alert_unit} />
                  ) : (
                    <div className="h-28 flex items-center justify-center text-xs text-muted-foreground/50">
                      <Cpu className="h-4 w-4 mr-2" />No readings yet
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
