import { useEffect, useState } from 'react';
import { getEvacuationCenters } from '@/lib/api';
import type { EvacuationCenter } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, MapPin, Users, Phone } from 'lucide-react';

export default function EvacuationCentersResident() {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvacuationCenters().then(data => { setCenters(data); setLoading(false); });
  }, []);

  const active = centers.filter(c => c.status === 'active');
  const inactive = centers.filter(c => c.status !== 'active');

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Resident Portal</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-[hsl(var(--severity-low))] shrink-0" />
          Evacuation Centers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {active.length} active center{active.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-28 w-full rounded" />)}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-3">Active</p>
              <div className="space-y-3">
                {active.map(c => <CenterCard key={c.id} center={c} />)}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-3">Inactive</p>
              <div className="space-y-3 opacity-50">
                {inactive.map(c => <CenterCard key={c.id} center={c} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CenterCard({ center }: { center: EvacuationCenter }) {
  const pct = center.capacity > 0 ? Math.round((center.current_occupancy / center.capacity) * 100) : 0;
  const isActive = center.status === 'active';

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-balance flex-1">{center.name}</h3>
          <Badge className={isActive ? 'status-resolved' : 'status-closed'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{center.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Capacity: {center.current_occupancy} / {center.capacity}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(pct,100)}%`,
                  background: pct > 80 ? 'hsl(var(--severity-critical))' : pct > 60 ? 'hsl(var(--severity-high))' : 'hsl(var(--severity-low))',
                }}
              />
            </div>
            <span>{pct}%</span>
          </div>
          {center.contact_person && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{center.contact_person}{center.contact_number ? ` · ${center.contact_number}` : ''}</span>
            </div>
          )}
          {center.latitude && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <a
                href={`https://www.openstreetmap.org/?mlat=${center.latitude}&mlon=${center.longitude}&zoom=16`}
                target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View on map
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
