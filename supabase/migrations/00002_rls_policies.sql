
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuation_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role (SECURITY DEFINER to avoid policy self-loop)
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_above(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('ldrrmo_staff','supervisor','admin') FROM public.profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('supervisor','admin') FROM public.profiles WHERE id = uid;
$$;

-- ============ PROFILES ============
CREATE POLICY "Admin full access profiles" ON public.profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

CREATE POLICY "Staff view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (is_staff_or_above(auth.uid()));

-- ============ EVACUATION CENTERS ============
CREATE POLICY "Anyone authenticated can view evacuation centers" ON public.evacuation_centers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can view evacuation centers" ON public.evacuation_centers
  FOR SELECT TO anon USING (true);

CREATE POLICY "Staff can manage evacuation centers" ON public.evacuation_centers
  FOR ALL TO authenticated USING (is_supervisor_or_above(auth.uid()));

-- ============ EMERGENCY REPORTS ============
CREATE POLICY "Residents view own reports" ON public.emergency_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

CREATE POLICY "Residents insert own reports" ON public.emergency_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Staff view all reports" ON public.emergency_reports
  FOR SELECT TO authenticated USING (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff update reports" ON public.emergency_reports
  FOR UPDATE TO authenticated USING (is_staff_or_above(auth.uid()));

CREATE POLICY "Admin delete reports" ON public.emergency_reports
  FOR DELETE TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- ============ REPORT ASSIGNMENTS ============
CREATE POLICY "Staff view assignments" ON public.report_assignments
  FOR SELECT TO authenticated USING (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff manage assignments" ON public.report_assignments
  FOR INSERT TO authenticated WITH CHECK (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff delete assignments" ON public.report_assignments
  FOR DELETE TO authenticated USING (is_staff_or_above(auth.uid()));

-- ============ STATUS UPDATES ============
CREATE POLICY "Staff view status updates" ON public.status_updates
  FOR SELECT TO authenticated USING (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff insert status updates" ON public.status_updates
  FOR INSERT TO authenticated WITH CHECK (is_staff_or_above(auth.uid()));

CREATE POLICY "Residents view own report status" ON public.status_updates
  FOR SELECT TO authenticated
  USING (report_id IN (SELECT id FROM public.emergency_reports WHERE reporter_id = auth.uid()));

-- ============ LOCATION UPDATES ============
CREATE POLICY "Users insert own location" ON public.location_updates
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff view all locations" ON public.location_updates
  FOR SELECT TO authenticated USING (is_staff_or_above(auth.uid()));

CREATE POLICY "Users view own locations" ON public.location_updates
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============ IOT DEVICES ============
CREATE POLICY "Anyone authenticated can view IoT devices" ON public.iot_devices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon view IoT devices" ON public.iot_devices
  FOR SELECT TO anon USING (true);

CREATE POLICY "Admin manage IoT devices" ON public.iot_devices
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- ============ SENSOR READINGS ============
CREATE POLICY "Anyone can view sensor readings" ON public.sensor_readings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon view sensor readings" ON public.sensor_readings
  FOR SELECT TO anon USING (true);

CREATE POLICY "Service role insert sensor readings" ON public.sensor_readings
  FOR INSERT TO authenticated WITH CHECK (is_staff_or_above(auth.uid()));

-- ============ NOTIFICATIONS ============
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    target_user_id = auth.uid()
    OR target_role = get_user_role(auth.uid())
    OR target_role IS NULL
  );

CREATE POLICY "Staff insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff update notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (is_staff_or_above(auth.uid()));

-- ============ NOTIFICATION READS ============
CREATE POLICY "Users manage own reads" ON public.notification_reads
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ CALLER LOGS ============
CREATE POLICY "Staff view caller logs" ON public.caller_logs
  FOR SELECT TO authenticated USING (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff insert caller logs" ON public.caller_logs
  FOR INSERT TO authenticated WITH CHECK (is_staff_or_above(auth.uid()));

CREATE POLICY "Staff update caller logs" ON public.caller_logs
  FOR UPDATE TO authenticated USING (is_staff_or_above(auth.uid()));

-- ============ AUDIT LOGS ============
CREATE POLICY "Admins view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============ SYSTEM CONFIG ============
CREATE POLICY "Admin manage system config" ON public.system_config
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Staff view system config" ON public.system_config
  FOR SELECT TO authenticated USING (is_staff_or_above(auth.uid()));

-- Public profiles view
CREATE VIEW public.public_profiles AS
  SELECT id, full_name, role, avatar_url FROM public.profiles;

-- Realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
