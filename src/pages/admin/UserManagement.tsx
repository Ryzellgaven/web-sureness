import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { getAllProfiles, logAudit } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, UserRole } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users, Plus, Search, Pencil, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const ROLES: UserRole[] = ['resident', 'ldrrmo_staff', 'supervisor', 'admin'];

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  phone: z.string().optional(),
  role: z.string().min(1),
});
type CreateData = z.infer<typeof createSchema>;

const editSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().optional(),
  role: z.string().min(1),
});
type EditData = z.infer<typeof editSchema>;

export default function UserManagement() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema), defaultValues: { role: 'resident' } });
  const editForm = useForm<EditData>({ resolver: zodResolver(editSchema) });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getAllProfiles(0, 200);
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = profiles;
    if (roleFilter !== 'all') result = result.filter(p => p.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    setFiltered(result);
  }, [profiles, search, roleFilter]);

  const handleCreate = async (values: CreateData) => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'create', email: values.email, password: values.password, full_name: values.full_name, phone: values.phone, role: values.role },
      method: 'POST',
    });
    setSaving(false);
    if (error || data?.error) { toast.error(data?.error || error?.message); return; }
    toast.success('User created');
    setCreateOpen(false);
    createForm.reset({ role: 'resident' });
    load();
  };

  const handleEdit = async (values: EditData) => {
    if (!user || !editTarget) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: values.full_name, phone: values.phone || null, role: values.role as UserRole,
    }).eq('id', editTarget.id);
    if (!error) await logAudit(user.id, 'user_updated', 'profiles', editTarget.id, { role: values.role });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('User updated');
    setEditTarget(null);
    load();
  };

  const toggleActive = async (p: Profile) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    await logAudit(user.id, p.is_active ? 'user_deactivated' : 'user_activated', 'profiles', p.id);
    toast.success(p.is_active ? 'User deactivated' : 'User activated');
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Admin Panel</p>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary shrink-0" />User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{profiles.length} users registered</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8"><Plus className="mr-1.5 h-4 w-4" />Add User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={createForm.control} name="full_name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={createForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={createForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace('_',' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : 'Create User'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="pl-8 h-8 text-xs" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace('_',' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="w-full max-w-full overflow-x-auto bg-card rounded border border-border">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'Email', 'Role', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [0,1,2,3,4].map(i => (
                <tr key={i} className="border-b border-border last:border-0">
                  {[0,1,2,3,4,5,6].map(j => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                </tr>
              ))
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">{p.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{p.email ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs capitalize font-medium">{p.role?.replace('_',' ')}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{p.phone ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${p.is_active ? 'status-resolved' : 'status-closed'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(p.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      setEditTarget(p);
                      editForm.reset({ full_name: p.full_name ?? '', phone: p.phone ?? '', role: p.role });
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(p)}>
                      {p.is_active ? <ToggleRight className="h-4 w-4 text-[hsl(var(--severity-low))]" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={o => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-3 mt-2">
              <FormField control={editForm.control} name="full_name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input className="px-3" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={editForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace('_',' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
