import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getEvacuationCenters, upsertEvacuationCenter, deleteEvacuationCenter } from '@/lib/api';
import type { EvacuationCenter } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Shield, Plus, Pencil, MapPin, Users, Phone, Trash2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  latitude: z.string().min(1),
  longitude: z.string().min(1),
  capacity: z.string().min(1),
  current_occupancy: z.string().min(1),
  contact_person: z.string().optional(),
  contact_number: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function EvacuationManagement() {
  const { user } = useAuth();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EvacuationCenter | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
  });

  const load = useCallback(() => {
    setLoading(true);
    getEvacuationCenters().then(d => { setCenters(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); form.reset({ current_occupancy: '0' }); setOpen(true); };
  const openEdit = (c: EvacuationCenter) => {
    setEditing(c);
    form.reset({
      name: c.name, address: c.address,
      latitude: String(c.latitude), longitude: String(c.longitude),
      capacity: String(c.capacity), current_occupancy: String(c.current_occupancy),
      contact_person: c.contact_person ?? '', contact_number: c.contact_number ?? '',
      notes: c.notes ?? '',
    });
    setOpen(true);
  };

  const onSubmit = async (values: FormData) => {
    if (!user) return;
    setSaving(true);
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      name: values.name, address: values.address,
      latitude: parseFloat(values.latitude), longitude: parseFloat(values.longitude),
      capacity: parseInt(values.capacity), current_occupancy: parseInt(values.current_occupancy),
      contact_person: values.contact_person || null, contact_number: values.contact_number || null,
      notes: values.notes || null, status: 'active', created_by: user.id,
    };
    const { error } = await upsertEvacuationCenter(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Center updated' : 'Center added');
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteEvacuationCenter(id);
    if (error) toast.error(error.message);
    else { toast.success('Center deactivated'); load(); }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Operations Center</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-[hsl(var(--severity-low))] shrink-0" />
            Evacuation Centers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{centers.length} center{centers.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0" onClick={openAdd}><Plus className="mr-1.5 h-4 w-4" />Add Center</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Evacuation Center</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="latitude" render={({ field }) => (
                    <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input className="px-3" placeholder="7.8123" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="longitude" render={({ field }) => (
                    <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input className="px-3" placeholder="122.9456" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="current_occupancy" render={({ field }) => (
                    <FormItem><FormLabel>Current Occupancy</FormLabel><FormControl><Input type="number" className="px-3" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="contact_person" render={({ field }) => (
                    <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="contact_number" render={({ field }) => (
                    <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : 'Save'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-28 rounded" />)}</div>
      ) : (
        <div className="space-y-3">
          {centers.map(c => (
            <Card key={c.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-semibold flex-1 text-balance">{c.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={c.status === 'active' ? 'status-resolved' : 'status-closed'}>{c.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 col-span-2"><MapPin className="h-3 w-3 shrink-0" />{c.address}</span>
                  <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{c.current_occupancy}/{c.capacity} occupancy</span>
                  {c.contact_number && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.contact_number}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
