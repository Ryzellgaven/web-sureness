import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { getProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff, LogIn } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

function getAuthErrorMessage(error: unknown): string {
  const message = typeof error === 'object' && error !== null && 'message' in error
    && typeof error.message === 'string'
    ? error.message.trim()
    : '';
  if (!message || message === '{}' || message === '[object Object]') {
    return 'Unable to reach the sign-in service. Check the Supabase connection and try again.';
  }
  return message;
}

const roleRedirect: Record<string, string> = {
  resident: '/resident',
  ldrrmo_staff: '/dashboard',
  supervisor: '/dashboard',
  admin: '/dashboard',
};

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) { toast.error(getAuthErrorMessage(error)); return; }
      const profile = await getProfile(data.user.id);
      const dest = from || roleRedirect[profile?.role ?? 'resident'] || '/resident';
      toast.success('Welcome back!');
      navigate(dest, { replace: true });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-card border-r border-border p-12 relative overflow-hidden">
        <div className="tactical-grid absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative">
          <img src="/images/logo/diplahan-seal.jpg" alt="LDRRMO Diplahan seal" className="mb-6 h-16 w-16 rounded-full bg-white object-contain ring-1 ring-border" />
          <h1 className="text-2xl font-bold mb-2">LDRRMO Diplahan</h1>
          <p className="text-muted-foreground text-sm">Emergency Response System</p>
        </div>
        <div className="relative space-y-6">
          {['Real-time GIS incident mapping', 'IoT flood sensor monitoring', 'Role-based responder coordination'].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-sm text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
        <p className="relative text-xs text-muted-foreground/50">
          Zamboanga Sibugay · Philippines
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex md:hidden items-center gap-3 mb-6">
              <img src="/images/logo/diplahan-seal.jpg" alt="LDRRMO Diplahan seal" className="h-9 w-9 rounded-full bg-white object-contain" />
              <span className="font-bold text-primary uppercase tracking-widest text-sm">LDRRMO</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Sign In</h2>
            <p className="text-sm text-muted-foreground">Access the emergency response system</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" className="px-3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="px-3 pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> Sign In</>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              New resident?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
            <Link to="/" className="text-xs text-muted-foreground/60 hover:text-muted-foreground">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
