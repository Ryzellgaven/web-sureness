import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { dispatchNotification } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Send, AlertTriangle, Bell, Users } from 'lucide-react';

const schema = z.object({
  title: z.string().min(3, 'Title required'),
  body: z.string().min(5, 'Message body required'),
  channel: z.string().min(1),
  target_role: z.string(),
});
type FormData = z.infer<typeof schema>;

const QUICK_TEMPLATES = [
  { label: 'Flood Warning', title: '⚠️ Flood Warning', body: 'Water levels are rising in your area. Please move to higher ground or proceed to the nearest evacuation center immediately.' },
  { label: 'Evacuation Order', title: '🚨 Mandatory Evacuation', body: 'A mandatory evacuation order has been issued. Please evacuate immediately to the nearest designated evacuation center.' },
  { label: 'All Clear', title: '✅ All Clear', body: 'The threat level has been reduced to normal. You may return to your homes safely. Stay alert for further announcements.' },
  { label: 'Test Alert', title: '🔔 System Test', body: 'This is a scheduled system test of the LDRRMO Diplahan Emergency Alert System. No action required.' },
];

export default function BroadcastPage() {
  const [sending, setSending] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'in_app', target_role: 'all' },
  });

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    form.setValue('title', t.title);
    form.setValue('body', t.body);
  };

  const onSubmit = async (values: FormData) => {
    setSending(true);
    const { error } = await dispatchNotification({
      title: values.title,
      body: values.body,
      channel: values.channel,
      target_role: values.target_role === 'all' ? null : values.target_role,
    });
    setSending(false);
    if (error) { toast.error('Failed to dispatch notification'); return; }
    toast.success('Notification broadcast sent');
    form.reset({ channel: 'in_app', target_role: 'all', title: '', body: '' });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Operations Center</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary shrink-0" />
          Broadcast Alert
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send emergency notifications to residents and staff.
        </p>
      </div>

      {/* Quick templates */}
      <Card className="bg-card border-border mb-6">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map(t => (
              <Button key={t.label} variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyTemplate(t)}>
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compose form */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />Compose Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="Alert title…" className="px-3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Body</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Type the alert message…" className="px-3 min-h-[100px] resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="channel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="in_app">In-App</SelectItem>
                        <SelectItem value="push">Push + In-App</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="target_role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="resident">Residents Only</SelectItem>
                        <SelectItem value="ldrrmo_staff">LDRRMO Staff</SelectItem>
                        <SelectItem value="supervisor">Supervisors</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending
                  ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  : <><Send className="mr-2 h-4 w-4" />Send Broadcast</>
                }
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
