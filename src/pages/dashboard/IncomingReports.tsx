import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllReports, updateReportStatus, assignResponder, getReportAssignments, getReportStatusHistory, getStaffProfiles } from '@/lib/api';
import { supabase } from '@/db/supabase';
import type { EmergencyReport, ReportAssignment, StatusUpdate, Profile, IncidentStatus } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText, Filter, MapPin, Clock, User, ChevronRight,
  RefreshCw, AlertTriangle, CheckCircle2, UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'fire', label: 'Fire' },
  { value: 'flood', label: 'Flood' },
  { value: 'medical', label: 'Medical' },
  { value: 'accident', label: 'Accident' },
  { value: 'landslide', label: 'Landslide' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'other', label: 'Other' },
];
const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Severity' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function IncomingReports() {
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selected, setSelected] = useState<EmergencyReport | null>(null);
  const [assignments, setAssignments] = useState<ReportAssignment[]>([]);
  const [history, setHistory] = useState<StatusUpdate[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [assignTo, setAssignTo] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [newStatus, setNewStatus] = useState<IncidentStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [aarText, setAarText] = useState('');
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 20;

  const isSupervisor = profile?.role === 'supervisor' || profile?.role === 'admin';

  const loadReports = useCallback(async () => {
    setLoading(true);
    const filters = {
      ...(statusFilter !== 'all' ? { status: statusFilter as IncidentStatus } : {}),
      ...(typeFilter !== 'all' ? { emergency_type: typeFilter as never } : {}),
      ...(severityFilter !== 'all' ? { severity: severityFilter as never } : {}),
    };
    const { data, count } = await getAllReports(page, PAGE_SIZE, filters);
    setReports(prev => page === 0 ? data : [...prev, ...data]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter, typeFilter, severityFilter]);

  useEffect(() => { setPage(0); setReports([]); }, [statusFilter, typeFilter, severityFilter]);
  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => {
    getStaffProfiles().then(setStaff);
  }, []);

  useEffect(() => {
    const ch = supabase.channel('incoming-reports-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_reports' }, () => { setPage(0); setReports([]); loadReports(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadReports]);

  const openDetail = async (r: EmergencyReport) => {
    setSelected(r);
    setNewStatus('');
    setStatusNote('');
    setAarText(r.after_action_report ?? '');
    setAssignTo('');
    const [asgn, hist] = await Promise.all([
      getReportAssignments(r.id),
      getReportStatusHistory(r.id),
    ]);
    setAssignments(asgn);
    setHistory(hist);
  };

  const handleAssign = async () => {
    if (!user || !selected || !assignTo) return;
    setSaving(true);
    const { error } = await assignResponder(selected.id, assignTo, user.id, assignNote);
    if (error) toast.error(error.message);
    else { toast.success('Responder assigned'); await openDetail(selected); setAssignTo(''); setAssignNote(''); }
    setSaving(false);
  };

  const handleStatusUpdate = async () => {
    if (!user || !selected || !newStatus) return;
    setSaving(true);
    const { error } = await updateReportStatus(selected.id, newStatus, user.id, statusNote, aarText || undefined);
    if (error) toast.error(error.message);
    else {
      toast.success('Status updated');
      setSelected(prev => prev ? { ...prev, status: newStatus, after_action_report: aarText || prev.after_action_report } : null);
      await openDetail({ ...selected, status: newStatus });
    }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Operations Center</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          Incoming Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{total} report{total !== 1 ? 's' : ''} found</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>{SEVERITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8" onClick={() => { setPage(0); setReports([]); loadReports(); }} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Report list */}
      {loading && reports.length === 0 ? (
        <div className="space-y-2">{[0,1,2,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reports match the current filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {reports.map(r => (
              <button key={r.id} className="w-full text-left" onClick={() => openDetail(r)}>
                <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5`}
                        style={{ background: { low: '#22c55e', moderate: '#eab308', high: '#f97316', critical: '#ef4444' }[r.severity] ?? '#aaa' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold capitalize">{r.emergency_type}</span>
                          <span className={`text-xs font-medium severity-${r.severity} capitalize`}>{r.severity}</span>
                          <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium status-${r.status}`}>{r.status.replace('_',' ')}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground/70">
                          {r.profiles?.full_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.profiles.full_name}</span>}
                          {(r.address_text || r.latitude) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.address_text || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(r.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
          {reports.length < total && (
            <Button variant="outline" className="w-full mt-4" onClick={() => setPage(p => p + 1)} disabled={loading}>
              Load More
            </Button>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize text-balance">
                  {selected.emergency_type} Emergency — {selected.severity} severity
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ['Status', <span key="s" className={`rounded px-1.5 py-0.5 font-medium status-${selected.status}`}>{selected.status.replace('_',' ')}</span>],
                    ['Reporter', selected.profiles?.full_name ?? '—'],
                    ['Phone', selected.profiles?.phone ?? '—'],
                    ['Location', selected.address_text || (selected.latitude ? `${selected.latitude.toFixed(5)}, ${selected.longitude?.toFixed(5)}` : '—')],
                    ['Assigned To', selected.assigned_profile?.full_name ?? 'Unassigned'],
                    ['Reported', format(new Date(selected.created_at), 'MMM d, yyyy h:mm a')],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <p className="text-muted-foreground mb-0.5">{k}</p>
                      <p className="font-medium">{v as React.ReactNode}</p>
                    </div>
                  ))}
                </div>
                {selected.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm bg-muted/30 rounded p-3">{selected.description}</p>
                  </div>
                )}
                {selected.photo_url && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Photo Evidence</p>
                    <img src={selected.photo_url} alt="Evidence" className="w-full max-h-48 object-cover rounded border border-border" />
                  </div>
                )}

                {/* Assign Responder */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" />Assign Responder</p>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={assignTo} onValueChange={setAssignTo}>
                      <SelectTrigger className="flex-1 min-w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Select staff member…" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name} ({s.role?.replace('_',' ')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleAssign} disabled={!assignTo || saving}>
                      Assign
                    </Button>
                  </div>
                  {assignments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {assignments.map(a => (
                        <p key={a.id} className="text-[11px] text-muted-foreground">
                          ✓ {a.profiles?.full_name} · {format(new Date(a.created_at), 'MMM d, h:mm a')}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Update (supervisor+) */}
                {isSupervisor && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Update Status</p>
                    <div className="space-y-2">
                      <Select value={newStatus} onValueChange={v => setNewStatus(v as IncidentStatus)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select new status…" /></SelectTrigger>
                        <SelectContent>
                          {['open','in_progress','resolved','closed'].map(s => (
                            <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Status update note…" className="px-3 text-xs min-h-[60px] resize-none" />
                      {(newStatus === 'resolved' || newStatus === 'closed') && (
                        <Textarea value={aarText} onChange={e => setAarText(e.target.value)} placeholder="After-action report (required for resolved/closed)…" className="px-3 text-xs min-h-[80px] resize-none" />
                      )}
                      <Button size="sm" className="w-full h-8 text-xs" onClick={handleStatusUpdate} disabled={!newStatus || saving}>
                        {saving ? <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : 'Save Status Update'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status history */}
                {history.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs font-semibold mb-2">Status History</p>
                    <div className="space-y-1.5">
                      {history.map(h => (
                        <div key={h.id} className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className={`rounded px-1 py-0.5 font-medium status-${h.new_status} text-[10px]`}>{h.new_status.replace('_',' ')}</span>
                          <span>by {h.profiles?.full_name ?? '—'}</span>
                          <span>· {format(new Date(h.created_at), 'MMM d, h:mm a')}</span>
                          {h.notes && <span className="truncate opacity-70">· {h.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
