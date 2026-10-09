import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart2, Users, Cpu, BookOpen, Settings, ChevronRight, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const sections = [
  { label: 'Analytics Dashboard', href: '/admin', icon: BarChart2, desc: 'System-wide statistics, incident trends, and user analytics.' },
  { label: 'User Management', href: '/admin/users', icon: Users, desc: 'Create, edit, and manage all user accounts and roles.' },
  { label: 'IoT Device Management', href: '/admin/iot-devices', icon: Cpu, desc: 'Register and configure IoT flood monitoring sensor devices.' },
  { label: 'Audit Logs', href: '/admin/audit', icon: BookOpen, desc: 'View and export a full chronological log of system actions.' },
  { label: 'System Configuration', href: '/admin/config', icon: Settings, desc: 'Manage SMS gateway, alert thresholds, and system parameters.' },
];

export default function AdminHome() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Administrator Panel</p>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary shrink-0" />
          System Administration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Full access to all system management functions.</p>
      </div>
      <div className="space-y-3">
        {sections.map(s => (
          <Link key={s.href} to={s.href}>
            <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 border border-primary/20">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
