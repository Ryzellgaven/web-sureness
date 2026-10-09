import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getCallerLogs, createCallerLog } from '@/lib/api';
import type { CallerLog } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Plus, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

const EMERGENCY_TYPES = ['fire','flood','medical','accident','landslide','earthquake','other'];

const schema = z.object({
  caller_phone: z.string().min(7, 'Phone number required'),
  caller_name: z.string().optional(),
  emergency_type: z.string().min(1),
  reported_location: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CallerLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CallerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { emergency_type: 'other' } });

  const load = () => {
    setLoading(true);
    getCallerLogs(0, 50).then(data => { setLogs(data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (values: FormData) => {
    if (!user) return;
    setSaving(true);
    const { error } = await createCallerLog({
      caller_phone: values.caller_phone,
      caller_name: values.caller_name || null,
      emergency_type: values.emergency_type as never,
      reported_location: values.reported_location || null,
      latitude: values.latitude ? parseFloat(values.latitude) : null,
      longitude: values.longitude ? parseFloat(values.longitude) : null,
      description: values.description || null,
      logged_by: user.id,
      report_id: null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Caller log saved');
    setOpen(false);
    form.reset({ emergency_type: 'other' });
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Operations Center</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary shrink-0" />
            Caller / SMS Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{logs.length} logged call{logs.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />Log Call
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Emergency Call</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="caller_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caller Name</FormLabel>
                      <FormControl><Input placeholder="Optional" className="px-3" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="caller_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl><Input placeholder="09XXXXXXXXX" className="px-3" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="emergency_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {EMERGENCY_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="reported_location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reported Location</FormLabel>
                    <FormControl><Input placeholder="Barangay, address, landmark…" className="px-3" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="latitude" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl><Input placeholder="7.8123" className="px-3" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="longitude" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl><Input placeholder="122.9456" className="px-3" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Details of the emergency reported by caller…" className="px-3 min-h-[80px] resize-none" {...field} />
                    </FormControl>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : 'Save Log Entry'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Phone className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No caller logs yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(l => (
            <Card key={l.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 border border-primary/20">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold capitalize">{l.emergency_type}</span>
                      {l.caller_name && <span className="text-xs text-muted-foreground">{l.caller_name}</span>}
                      <span className="text-xs text-muted-foreground font-medium">{l.caller_phone}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground/70">
                      {l.reported_location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.reported_location}</span>}
                      {l.profiles?.full_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />Logged by {l.profiles.full_name}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(l.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    {l.description && <p className="text-xs text-muted-foreground/60 mt-1.5 line-clamp-1">{l.description}</p>}
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
