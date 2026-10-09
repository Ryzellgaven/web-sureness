
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Roles ENUM
CREATE TYPE public.user_role AS ENUM ('resident', 'ldrrmo_staff', 'supervisor', 'admin');
CREATE TYPE public.incident_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.emergency_type AS ENUM ('fire', 'flood', 'medical', 'accident', 'landslide', 'earthquake', 'other');
CREATE TYPE public.severity_level AS ENUM ('low', 'moderate', 'high', 'critical');
CREATE TYPE public.sensor_type AS ENUM ('water_level', 'rainfall', 'wind_speed', 'temperature');
CREATE TYPE public.notification_channel AS ENUM ('in_app', 'push', 'sms', 'email');
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'failed');

-- Profiles table (synced from auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  phone text,
  address text,
  role public.user_role NOT NULL DEFAULT 'resident',
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-sync new users to profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'resident'::public.user_role)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Evacuation centers
CREATE TABLE public.evacuation_centers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  capacity integer NOT NULL DEFAULT 0,
  current_occupancy integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  contact_person text,
  contact_number text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER update_evacuation_centers_updated_at BEFORE UPDATE ON evacuation_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Emergency reports (incident submissions)
CREATE TABLE public.emergency_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  emergency_type public.emergency_type NOT NULL DEFAULT 'other',
  severity public.severity_level NOT NULL DEFAULT 'moderate',
  description text,
  latitude double precision,
  longitude double precision,
  address_text text,
  photo_url text,
  video_url text,
  status public.incident_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES public.profiles(id),
  after_action_report text,
  is_caller_report boolean NOT NULL DEFAULT false,
  caller_name text,
  caller_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER update_emergency_reports_updated_at BEFORE UPDATE ON emergency_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Responder assignments
CREATE TABLE public.report_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid NOT NULL REFERENCES public.emergency_reports(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_by uuid NOT NULL REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Status update log
CREATE TABLE public.status_updates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id uuid NOT NULL REFERENCES public.emergency_reports(id) ON DELETE CASCADE,
  updated_by uuid NOT NULL REFERENCES public.profiles(id),
  old_status public.incident_status,
  new_status public.incident_status NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Real-time location tracking
CREATE TABLE public.location_updates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  report_id uuid REFERENCES public.emergency_reports(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- IoT sensor devices
CREATE TABLE public.iot_devices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_code text NOT NULL UNIQUE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  sensor_type public.sensor_type NOT NULL DEFAULT 'water_level',
  alert_threshold double precision NOT NULL DEFAULT 5.0,
  alert_unit text NOT NULL DEFAULT 'm',
  status text NOT NULL DEFAULT 'active',
  last_reading double precision,
  last_reading_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER update_iot_devices_updated_at BEFORE UPDATE ON iot_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- IoT sensor readings
CREATE TABLE public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id uuid NOT NULL REFERENCES public.iot_devices(id),
  value double precision NOT NULL,
  unit text NOT NULL DEFAULT 'm',
  is_alert boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  body text NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  status public.notification_status NOT NULL DEFAULT 'pending',
  target_role public.user_role,
  target_user_id uuid REFERENCES public.profiles(id),
  sent_by uuid REFERENCES public.profiles(id),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- User notification reads
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Caller/SMS log (manually entered)
CREATE TABLE public.caller_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_name text,
  caller_phone text NOT NULL,
  emergency_type public.emergency_type NOT NULL DEFAULT 'other',
  reported_location text,
  latitude double precision,
  longitude double precision,
  description text,
  logged_by uuid NOT NULL REFERENCES public.profiles(id),
  report_id uuid REFERENCES public.emergency_reports(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- System configuration
CREATE TABLE public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed initial config
INSERT INTO public.system_config (key, value, description) VALUES
  ('sms_gateway_url', '', 'SMS gateway API endpoint'),
  ('sms_api_key', '', 'SMS gateway API key'),
  ('alert_email', 'ldrrmo@diplahan.gov.ph', 'Alert notification email'),
  ('system_name', 'LDRRMO Diplahan Emergency Response System', 'System display name'),
  ('flood_alert_message', 'FLOOD ALERT: Water levels are rising. Please proceed to the nearest evacuation center immediately.', 'Default flood alert message');

-- Seed evacuation centers
INSERT INTO public.evacuation_centers (name, address, latitude, longitude, capacity, status) VALUES
  ('Diplahan Central Elementary School', 'Barangay Poblacion, Diplahan, Zamboanga Sibugay', 7.8123, 122.9456, 500, 'active'),
  ('Diplahan Municipal Gymnasium', 'Rizal St., Diplahan, Zamboanga Sibugay', 7.8145, 122.9478, 800, 'active'),
  ('San Antonio Barangay Hall', 'Barangay San Antonio, Diplahan', 7.8089, 122.9412, 200, 'active');

-- Seed IoT devices
INSERT INTO public.iot_devices (device_code, name, latitude, longitude, sensor_type, alert_threshold, alert_unit) VALUES
  ('SENSOR-WL-001', 'Diplahan River Water Level Sensor', 7.8123, 122.9456, 'water_level', 4.5, 'm'),
  ('SENSOR-RF-001', 'Poblacion Rainfall Gauge', 7.8145, 122.9478, 'rainfall', 80.0, 'mm'),
  ('SENSOR-WL-002', 'Bagong Buhay Creek Level Sensor', 7.8089, 122.9390, 'water_level', 3.0, 'm');

-- Seed initial sensor readings
INSERT INTO public.sensor_readings (device_id, value, unit, is_alert, recorded_at)
SELECT id, 1.2, 'm', false, now() - interval '5 minutes' FROM public.iot_devices WHERE device_code = 'SENSOR-WL-001';
INSERT INTO public.sensor_readings (device_id, value, unit, is_alert, recorded_at)
SELECT id, 1.5, 'm', false, now() - interval '4 minutes' FROM public.iot_devices WHERE device_code = 'SENSOR-WL-001';
INSERT INTO public.sensor_readings (device_id, value, unit, is_alert, recorded_at)
SELECT id, 1.8, 'm', false, now() - interval '3 minutes' FROM public.iot_devices WHERE device_code = 'SENSOR-WL-001';
INSERT INTO public.sensor_readings (device_id, value, unit, is_alert, recorded_at)
SELECT id, 25.0, 'mm', false, now() - interval '5 minutes' FROM public.iot_devices WHERE device_code = 'SENSOR-RF-001';
INSERT INTO public.sensor_readings (device_id, value, unit, is_alert, recorded_at)
SELECT id, 32.0, 'mm', false, now() - interval '3 minutes' FROM public.iot_devices WHERE device_code = 'SENSOR-RF-001';
INSERT INTO public.sensor_readings (device_id, value, unit, is_alert, recorded_at)
SELECT id, 0.8, 'm', false, now() - interval '5 minutes' FROM public.iot_devices WHERE device_code = 'SENSOR-WL-002';
