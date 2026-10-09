import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle, Map, Activity, Bell, Shield, Phone,
  ChevronRight, Cpu, Users, Radio,
} from 'lucide-react';

const features = [
  { icon: AlertTriangle, label: 'Emergency Reporting', desc: 'Submit geo-tagged emergency reports with photo evidence instantly.' },
  { icon: Map, label: 'GIS Incident Map', desc: 'Real-time Leaflet map with live incident markers and flood zone overlays.' },
  { icon: Activity, label: 'IoT Flood Monitoring', desc: 'Live water level and rainfall sensor data with threshold alerts.' },
  { icon: Bell, label: 'Emergency Alerts', desc: 'Instant broadcast notifications to all residents via multiple channels.' },
  { icon: Shield, label: 'Evacuation Centers', desc: 'Map and list of active evacuation centers with capacity tracking.' },
  { icon: Phone, label: 'Caller/SMS Tracking', desc: 'Log and track emergency calls and SMS reports from the field.' },
  { icon: Users, label: 'Responder Coordination', desc: 'Assign and track LDRRMO staff with real-time GPS positions.' },
  { icon: Radio, label: 'Incident Management', desc: 'Full incident lifecycle from open to resolved with after-action reports.' },
  { icon: Cpu, label: 'Admin Dashboard', desc: 'Complete system management with audit logs, analytics, and IoT device control.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo/diplahan-seal.jpg" alt="LDRRMO Diplahan seal" className="h-9 w-9 shrink-0 rounded-full bg-white object-contain ring-1 ring-border" />
            <div>
              <span className="text-sm font-bold uppercase tracking-widest text-primary">LDRRMO</span>
              <span className="hidden md:inline text-xs text-muted-foreground ml-2">Diplahan</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="tactical-grid absolute inset-0 opacity-30 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-24 md:py-32">
          <Badge className="mb-6 border-primary/40 bg-primary/10 text-primary text-xs tracking-widest uppercase">
            Production System · Diplahan, Zamboanga Sibugay
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight text-balance mb-6 max-w-3xl">
            GIS-Based Emergency Response System
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-10 text-pretty">
            A unified command platform for LDRRMO Diplahan. Real-time incident mapping,
            IoT flood monitoring, responder coordination, and resident emergency reporting —
            all in one production-ready system.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <Button size="lg" asChild>
              <Link to="/register">
                Register as Resident <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">LDRRMO Staff Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Status bar */}
      <section className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'System Status', value: 'OPERATIONAL', color: 'text-[hsl(var(--severity-low))]' },
              { label: 'Active Sensors', value: '3 Online', color: 'text-primary' },
              { label: 'Evacuation Centers', value: '3 Active', color: 'text-primary' },
              { label: 'Response Mode', value: 'Normal', color: 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <div className="mb-12 text-left md:text-center">
          <p className="text-xs uppercase tracking-widest text-primary mb-3">System Capabilities</p>
          <h2 className="text-2xl md:text-3xl font-bold text-balance">End-to-End Emergency Management</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <Card key={f.label} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 border border-primary/20 mt-0.5">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">{f.label}</p>
                    <p className="text-xs text-muted-foreground text-pretty">{f.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-balance">Ready to respond?</h2>
          <p className="text-muted-foreground mb-8 text-pretty max-w-md mx-auto">
            Residents can register to report emergencies. LDRRMO staff log in to access the operations center.
          </p>
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/register">Register as Resident</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">Staff / Admin Login</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} LDRRMO Diplahan Emergency Response System · Zamboanga Sibugay
        </p>
      </footer>
    </div>
  );
}
