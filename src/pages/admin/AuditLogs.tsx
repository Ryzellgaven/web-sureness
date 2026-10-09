import { useEffect, useState, useCallback } from 'react';
import { getAuditLogs } from '@/lib/api';
import type { AuditLog } from '@/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, RefreshCw, Download, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filtered, setFiltered] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 50;

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    const data = await getAuditLogs(p, PAGE_SIZE);
    setLogs(prev => p === 0 ? data : [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
  }, []);

  useEffect(() => { load(0); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(logs); return; }
    const q = search.toLowerCase();
    setFiltered(logs.filter(l =>
      l.action.toLowerCase().includes(q) ||
      l.table_name?.toLowerCase().includes(q) ||
      l.profiles?.full_name?.toLowerCase().includes(q) ||
      l.profiles?.email?.toLowerCase().includes(q) ||
      l.record_id?.includes(q)
    ));
  }, [logs, search]);

  const exportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Table', 'Record ID'];
    const rows = filtered.map(l => [
      format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss'),
      l.profiles?.full_name ?? l.user_id ?? '',
      l.action,
      l.table_name ?? '',
      l.record_id ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Admin Panel</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} entries</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8" onClick={exportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" /><span className="hidden md:inline">Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setPage(0); load(0); }} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, user, table…" className="pl-8 h-8 text-xs" />
      </div>

      {/* Table */}
      <div className="w-full max-w-full overflow-x-auto bg-card rounded border border-border">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {['Timestamp', 'User', 'Action', 'Table', 'Record ID'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              [0,1,2,3,4,5].map(i => (
                <tr key={i} className="border-b border-border last:border-0">
                  {[0,1,2,3,4].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-3.5 w-full" /></td>)}
                </tr>
              ))
            ) : filtered.map(l => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(l.created_at), 'MMM d, yyyy HH:mm:ss')}
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                  {l.profiles?.full_name ?? l.user_id?.slice(0, 8) ?? 'System'}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">{l.action}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{l.table_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-[11px] text-muted-foreground/60 font-mono whitespace-nowrap">
                  {l.record_id ? l.record_id.slice(0, 16) + '…' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && !search && (
        <Button variant="outline" className="w-full mt-4" onClick={() => { const np = page + 1; setPage(np); load(np); }} disabled={loading}>
          {loading ? <div className="h-4 w-4 rounded-full border-2 border-border border-t-foreground animate-spin" /> : <><ChevronDown className="mr-2 h-4 w-4" />Load More</>}
        </Button>
      )}
    </div>
  );
}
