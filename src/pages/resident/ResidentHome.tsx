import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileText, Map, Shield, Bell, ChevronRight, Phone } from 'lucide-react';

const actions = [
  { label: 'Report Emergency', href: '/resident/report', icon: AlertTriangle, color: 'text-[hsl(var(--severity-critical))]', desc: 'Submit a new emergency report with GPS coordinates' },
  { label: 'My Reports', href: '/resident/my-reports', icon: FileText, color: 'text-primary', desc: 'Track the status of your submitted reports' },
  { label: 'Incident Map', href: '/resident/map', icon: Map, color: 'text-primary', desc: 'View active incidents and your location on the map' },
  { label: 'Evacuation Centers', href: '/resident/evacuation', icon: Shield, color: 'text-[hsl(var(--severity-low))]', desc: 'Find the nearest safe shelter near you' },
  { label: 'Notifications', href: '/resident/notifications', icon: Bell, color: 'text-[hsl(var(--severity-moderate))]', desc: 'View alerts and broadcasts from LDRRMO' },
];

export default function ResidentHome() {
  const { profile } = useAuth();

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Resident Portal</p>
        <h1 className="text-2xl font-bold text-balance">
          Hello, {profile?.full_name?.split(' ')[0] ?? 'Resident'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          LDRRMO Diplahan Emergency Response System
        </p>
      </div>

      {/* Emergency CTA */}
      <div className="relative overflow-hidden rounded border border-[hsl(var(--severity-critical)/0.4)] bg-[hsl(var(--severity-critical)/0.08)] p-5 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[hsl(var(--severity-critical)/0.15)] border border-[hsl(var(--severity-critical)/0.3)]">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--severity-critical))]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm mb-1">Emergency? Report Now</p>
            <p className="text-xs text-muted-foreground mb-3">
              Submit an emergency report with your GPS location. LDRRMO responders will be notified immediately.
            </p>
            <Button size="sm" asChild className="bg-[hsl(var(--severity-critical))] hover:bg-[hsl(var(--severity-critical)/0.85)] text-white">
              <Link to="/resident/report">Submit Emergency Report</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Emergency hotline */}
      <div className="flex items-center gap-3 rounded border border-border bg-card p-4 mb-8">
        <Phone className="h-4 w-4 text-primary shrink-0" />
        <div>
          <p className="text-xs font-semibold">LDRRMO Hotline</p>
          <p className="text-xs text-muted-foreground">Call: (062) 000-0000 · Text: 0900-000-0000</p>
        </div>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map(a => (
          <Link key={a.href} to={a.href}>
            <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="flex items-center gap-3 text-sm font-semibold">
                  <a.icon className={`h-4 w-4 shrink-0 ${a.color}`} />
                  <span className="flex-1">{a.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
