import { useEffect, useState } from 'react';
import { getAnalyticsSummary } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart2, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from 'recharts';
import { format, subDays, isAfter } from 'date-fns';

const TYPE_COLORS: Record<string, string> = {
  fire: '#ef4444', flood: '#3b82f6', medical: '#22c55e',
  accident: '#f97316', landslide: '#a855f7', earthquake: '#eab308', other: '#6b7280',
};
const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444', in_progress: '#f97316', resolved: '#22c55e', closed: '#6b7280',
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getAnalyticsSummary().then(d => { setData(d); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Admin Panel</p>
        <h1 className="text-xl font-bold flex items-center gap-2"><BarChart2 className="h-5 w-5 text-primary shrink-0" />Analytics</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">{[0,1,2,3].map(i=><Skeleton key={i} className="h-20 rounded"/>)}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[0,1,2,3].map(i=><Skeleton key={i} className="h-48 rounded"/>)}</div>
    </div>
  );

  const reports = data?.reports ?? [];
  const profiles = data?.profiles ?? [];

  // Status distribution
  const statusCounts = ['open','in_progress','resolved','closed'].map(s => ({
    name: s.replace('_',' '), value: reports.filter(r => r.status === s).length, color: STATUS_COLORS[s],
  }));

  // Type distribution
  const typeCounts = Object.keys(TYPE_COLORS).map(t => ({
    name: t, value: reports.filter(r => r.emergency_type === t).length, fill: TYPE_COLORS[t],
  })).filter(t => t.value > 0);

  // Severity distribution
  const sevCounts = ['low','moderate','high','critical'].map(s => ({
    name: s, value: reports.filter(r => r.severity === s).length,
  }));

  // Trend — last 14 days
  const trendData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, 'MMM d');
    const count = reports.filter(r => {
      const d = new Date(r.created_at);
      return format(d, 'MMM d') === dateStr;
    }).length;
    return { date: dateStr, reports: count };
  });

  // Role distribution
  const roleCounts = ['resident','ldrrmo_staff','supervisor','admin'].map(r => ({
    name: r.replace('_',' '), value: profiles.filter(p => p.role === r).length,
  }));

  const stats = [
    { label: 'Total Reports', value: reports.length },
    { label: 'Open Incidents', value: reports.filter(r=>r.status==='open').length },
    { label: 'Registered Users', value: profiles.length },
    { label: 'Active Users', value: profiles.filter(p=>p.is_active).length },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Admin Panel</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary shrink-0" />Analytics Dashboard
          </h1>
        </div>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm">Incident Trend (14 Days)</CardTitle></CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="h-40 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, borderRadius: 4 }} />
                  <Line type="monotone" dataKey="reports" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm">Incident Status</CardTitle></CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="h-40 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={25}>
                    {statusCounts.map(s => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, borderRadius: 4 }} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By type */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm">Reports by Type</CardTitle></CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="h-40 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeCounts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, borderRadius: 4 }} />
                  <Bar dataKey="value" radius={[2,2,0,0]}>
                    {typeCounts.map(t => <Cell key={t.name} fill={t.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User roles */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm">Users by Role</CardTitle></CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="h-40 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleCounts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, borderRadius: 4 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
