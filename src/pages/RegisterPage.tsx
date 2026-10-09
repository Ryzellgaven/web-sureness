import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  address: z.string().min(5, 'Address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  agreed: z.literal(true, { errorMap: () => ({ message: 'You must agree to the terms' }) }),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name, role: 'resident' },
        },
      });
      if (error) { toast.error(error.message); return; }

      // Update profile extras
      if (data.user) {
        await supabase.from('profiles').update({
          full_name: values.full_name,
          phone: values.phone,
          address: values.address,
        }).eq('id', data.user.id);
      }

      toast.success('Account created! Welcome to LDRRMO Diplahan.');
      navigate('/resident', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-2/5 bg-card border-r border-border p-12 relative overflow-hidden">
        <div className="tactical-grid absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative">
          <img src="/images/logo/diplahan-seal.jpg" alt="LDRRMO Diplahan seal" className="mb-6 h-16 w-16 rounded-full bg-white object-contain ring-1 ring-border" />
          <h1 className="text-2xl font-bold mb-2">Register as Resident</h1>
          <p className="text-muted-foreground text-sm">
            Create your account to submit emergency reports, receive alerts, and view the live incident map.
          </p>
        </div>
        <div className="relative">
          <p className="text-xs text-muted-foreground/50">LDRRMO Diplahan · Zamboanga Sibugay</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="flex md:hidden items-center gap-3 mb-6">
            <img src="/images/logo/diplahan-seal.jpg" alt="LDRRMO Diplahan seal" className="h-9 w-9 rounded-full bg-white object-contain" />
            <span className="font-bold text-primary uppercase tracking-widest text-sm">LDRRMO</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Create Account</h2>
          <p className="text-sm text-muted-foreground mb-8">Resident self-registration</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Juan Dela Cruz" className="px-3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" className="px-3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="09XXXXXXXXX" className="px-3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Address</FormLabel>
                  <FormControl><Input placeholder="Barangay, Diplahan, Zamboanga Sibugay" className="px-3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" className="px-3 pr-10" {...field} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirm_password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type={showPw ? 'text' : 'password'} placeholder="Re-enter password" className="px-3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="agreed" render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      I agree to the{' '}
                      <span className="text-primary cursor-pointer hover:underline">User Agreement</span>
                      {' '}and{' '}
                      <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
                      {' '}of the LDRRMO Diplahan Emergency Response System.
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  : <><UserPlus className="mr-2 h-4 w-4" />Create Account</>
                }
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
            <Link to="/" className="text-xs text-muted-foreground/60 hover:text-muted-foreground">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
