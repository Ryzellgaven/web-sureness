import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyReports } from '@/lib/api';
import type { EmergencyReport } from '@/types/index';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin, Clock, ChevronDown, FileText } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
};
const TYPE_LABELS: Record<string, string> = {
  fire: 'Fire', flood: 'Flood', medical: 'Medical', accident: 'Accident',
  landslide: 'Landslide', earthquake: 'Earthquake', other: 'Other',
};
const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical',
};

function statusClass(s: string) {
  if (s === 'open') return 'status-open';
  if (s === 'in_progress') return 'status-in_progress';
  if (s === 'resolved') return 'status-resolved';
  return 'status-closed';
}
function severityClass(s: string) {
  return `severity-${s}`;
}

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMyReports(user.id, page, PAGE_SIZE).then(({ data, count }) => {
      setReports(prev => page === 0 ? data : [...prev, ...data]);
      setTotal(count ?? 0);
      setLoading(false);
    });
  }, [user, page]);

  const hasMore = reports.length < total;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Resident Portal</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          My Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} report{total !== 1 ? 's' : ''} submitted
        </p>
      </div>

      {loading && page === 0 ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reports yet. Submit your first emergency report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <Card key={r.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">{TYPE_LABELS[r.emergency_type] ?? r.emergency_type}</span>
                      <span className={`text-xs font-medium ${severityClass(r.severity)}`}>
                        {SEVERITY_LABELS[r.severity]}
                      </span>
                      <span className={`text-xs rounded px-2 py-0.5 font-medium ${statusClass(r.status)}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground/60">
                      {(r.address_text || r.latitude) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {r.address_text || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {format(new Date(r.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                  {r.photo_url && (
                    <div className="h-14 w-14 shrink-0 rounded overflow-hidden border border-border">
                      <img src={r.photo_url} alt="Report" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPage(p => p + 1)}
              disabled={loading}
            >
              {loading ? <div className="h-4 w-4 rounded-full border-2 border-border border-t-foreground animate-spin" /> : <><ChevronDown className="mr-2 h-4 w-4" />Load More</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
