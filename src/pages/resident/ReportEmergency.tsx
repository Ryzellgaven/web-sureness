import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { submitReport } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { MapPin, Upload, Loader2, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

const EMERGENCY_TYPES = [
  { value: 'fire', label: 'Fire' },
  { value: 'flood', label: 'Flood' },
  { value: 'medical', label: 'Medical Emergency' },
  { value: 'accident', label: 'Accident' },
  { value: 'landslide', label: 'Landslide' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'text-[hsl(var(--severity-low))]' },
  { value: 'moderate', label: 'Moderate', color: 'text-[hsl(var(--severity-moderate))]' },
  { value: 'high', label: 'High', color: 'text-[hsl(var(--severity-high))]' },
  { value: 'critical', label: 'Critical', color: 'text-[hsl(var(--severity-critical))]' },
];

const schema = z.object({
  emergency_type: z.string().min(1, 'Select emergency type'),
  severity: z.string().min(1, 'Select severity level'),
  description: z.string().min(5, 'Describe the emergency'),
  address_text: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ReportEmergency() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locationFields, setLocationFields] = useState({ latitude: '', longitude: '' });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationFields({
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        });
        setGpsLoading(false);
        toast.success('Location captured');
      },
      () => { toast.warning('GPS unavailable — enter coordinates or an address manually'); setGpsLoading(false); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => { detectGPS(); }, [detectGPS]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: FormData) => {
    const latitude = locationFields.latitude === '' ? null : Number(locationFields.latitude);
    const longitude = locationFields.longitude === '' ? null : Number(locationFields.longitude);
    const validCoordinates = latitude !== null && longitude !== null
      && Number.isFinite(latitude) && Math.abs(latitude) <= 90
      && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
    if ((locationFields.latitude !== '' || locationFields.longitude !== '')
      && !validCoordinates) {
      toast.error('Enter valid latitude and longitude coordinates');
      return;
    }
    if (values.emergency_type === 'landslide' && !validCoordinates) {
      toast.error('Add the landslide location coordinates so the map can flag the road');
      return;
    }

    setSubmitting(true);
    try {
      let photo_url: string | null = null;

      // Upload photo if provided
      if (photoFile && user) {
        setUploading(true);
        const ext = photoFile.name.split('.').pop();
        const path = `reports/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('report-media')
          .upload(path, photoFile, { contentType: photoFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('report-media').getPublicUrl(path);
          photo_url = urlData.publicUrl;
        }
        setUploading(false);
      }

      const { error } = await submitReport({
        emergency_type: values.emergency_type as never,
        severity: values.severity as never,
        description: values.description,
        latitude,
        longitude,
        address_text: values.address_text ?? '',
        photo_url,
      });

      if (error) { toast.error(error.message); return; }
      toast.success('Emergency report submitted. LDRRMO has been notified.');
      navigate('/resident/my-reports');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Resident Portal</p>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--severity-critical))] shrink-0" />
          Report Emergency
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          LDRRMO responders will be notified immediately upon submission.
        </p>
      </div>

      {/* GPS status */}
      <div className={`mb-6 flex items-center gap-3 rounded border p-3 ${
        locationFields.latitude && locationFields.longitude ? 'border-[hsl(var(--severity-low)/0.4)] bg-[hsl(var(--severity-low)/0.08)]'
               : 'border-border bg-card'}`}>
        {gpsLoading
          ? <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          : locationFields.latitude && locationFields.longitude
          ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--severity-low))] shrink-0" />
          : <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        }
        <div className="flex-1 min-w-0">
          {gpsLoading ? (
            <p className="text-xs text-muted-foreground">Detecting your location…</p>
          ) : locationFields.latitude && locationFields.longitude ? (
            <p className="text-xs text-[hsl(var(--severity-low))] font-medium">
              Report location: {locationFields.latitude}, {locationFields.longitude}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">GPS unavailable — enter hazard coordinates or an address</p>
          )}
        </div>
        {(!locationFields.latitude || !locationFields.longitude) && !gpsLoading && (
          <Button variant="ghost" size="sm" className="shrink-0 text-xs h-7 px-2" onClick={detectGPS}>
            Retry
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="report-latitude" className="mb-1 block text-xs font-medium">Hazard latitude</label>
          <Input id="report-latitude" type="number" step="0.000001" value={locationFields.latitude} className="px-3" placeholder="7.812300" onChange={event => setLocationFields(fields => ({ ...fields, latitude: event.target.value }))} />
        </div>
        <div>
          <label htmlFor="report-longitude" className="mb-1 block text-xs font-medium">Hazard longitude</label>
          <Input id="report-longitude" type="number" step="0.000001" value={locationFields.longitude} className="px-3" placeholder="122.945600" onChange={event => setLocationFields(fields => ({ ...fields, longitude: event.target.value }))} />
        </div>
        <p className="col-span-2 text-[11px] text-muted-foreground">Use the hazard location, not your current position, when reporting a road blockage from a screenshot.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="emergency_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger></FormControl>
                <SelectContent>
                  {EMERGENCY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="severity" render={({ field }) => (
            <FormItem>
              <FormLabel>Severity Level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select severity…" /></SelectTrigger></FormControl>
                <SelectContent>
                  {SEVERITY_LEVELS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className={s.color}>{s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the emergency situation, number of people affected, and any other relevant details…"
                  className="px-3 min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="address_text" render={({ field }) => (
            <FormItem>
              <FormLabel>Location / Address</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Brgy. Poblacion, near the school" className="px-3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Photo upload */}
          <div>
            <p className="text-sm font-medium mb-2">Photo Evidence <span className="text-muted-foreground font-normal">(optional)</span></p>
            <p className="mb-2 text-xs text-muted-foreground">Photos help responders verify reports; the map location comes from the coordinates above.</p>
            {photoPreview ? (
              <div className="relative w-full aspect-video rounded border border-border overflow-hidden bg-muted">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-border rounded p-8 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Click to attach photo (max 5MB)</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading photo…
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/resident')}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting || uploading}>
              {submitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><AlertTriangle className="mr-2 h-4 w-4" />Submit Report</>
              }
            </Button>
          </div>
        </form>
      </Form>

      {/* Offline notice */}
      <p className="text-xs text-muted-foreground/60 mt-6 text-center">
        Reports are stored offline and auto-submitted when connectivity is restored.
      </p>
    </div>
  );
}
