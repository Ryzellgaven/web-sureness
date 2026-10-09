import { useEffect, useState } from 'react';
import { getSystemConfig, updateSystemConfig } from '@/lib/api';
import type { SystemConfig } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Settings, Save, RefreshCw } from 'lucide-react';

export default function SystemConfiguration() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getSystemConfig().then(data => {
      setConfigs(data);
      const init: Record<string, string> = {};
      data.forEach(c => { init[c.key] = c.value; });
      setEdits(init);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    const { error } = await updateSystemConfig(key, edits[key] ?? '');
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success(`Config "${key}" updated`);
  };

  const isDirty = (key: string) => {
    const orig = configs.find(c => c.key === key);
    return orig?.value !== edits[key];
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Admin Panel</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary shrink-0" />System Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage system-wide settings and thresholds.</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded" />)}</div>
      ) : (
        <div className="space-y-3">
          {configs.map(c => (
            <Card key={c.key} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-primary mb-0.5">{c.key}</p>
                    {c.description && <p className="text-xs text-muted-foreground mb-2">{c.description}</p>}
                    <Input
                      value={edits[c.key] ?? ''}
                      onChange={e => setEdits(prev => ({ ...prev, [c.key]: e.target.value }))}
                      className="px-3 text-xs h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 shrink-0 mt-6"
                    disabled={!isDirty(c.key) || saving === c.key}
                    onClick={() => handleSave(c.key)}
                  >
                    {saving === c.key
                      ? <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                      : <><Save className="mr-1 h-3.5 w-3.5" />Save</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
