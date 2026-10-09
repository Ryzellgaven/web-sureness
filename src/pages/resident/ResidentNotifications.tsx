import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications } from '@/lib/api';
import { supabase } from '@/db/supabase';
import type { Notification } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, AlertTriangle, Radio } from 'lucide-react';
import { format } from 'date-fns';

export default function ResidentNotifications() {
  const { user, profile } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user || !profile) return;
    getNotifications(user.id, profile.role, 0, 50).then(data => {
      setNotifs(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [user, profile]);

  useEffect(() => {
    const ch = supabase.channel('resident-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, profile]);

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Resident Portal</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-[hsl(var(--severity-moderate))] shrink-0" />
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{notifs.length} alert{notifs.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded" />)}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <Card key={n.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 border border-primary/20 mt-0.5">
                    {n.title.includes('Alert') || n.title.includes('⚠️')
                      ? <AlertTriangle className="h-4 w-4 text-[hsl(var(--severity-critical))]" />
                      : <Radio className="h-4 w-4 text-primary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-balance flex-1">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                        {format(new Date(n.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground text-pretty">{n.body}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
