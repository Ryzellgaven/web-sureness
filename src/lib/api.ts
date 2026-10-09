import { supabase } from '@/db/supabase';
import type {
  Profile, EmergencyReport, EvacuationCenter, IotDevice, SensorReading,
  Notification, CallerLog, AuditLog, SystemConfig, ReportAssignment, StatusUpdate,
  IncidentStatus, EmergencyType, SeverityLevel,
} from '@/types/index';

// ─── Profiles ───────────────────────────────────────────────────────────────

export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);
  return { error };
}

export async function getAllProfiles(page = 0, pageSize = 50) {
  const from = page * pageSize;
  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as Profile[] : [], error, count };
}

export async function getStaffProfiles() {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone')
    .in('role', ['ldrrmo_staff', 'supervisor', 'admin'])
    .eq('is_active', true)
    .order('full_name');
  return Array.isArray(data) ? data as Profile[] : [];
}

// ─── Emergency Reports ───────────────────────────────────────────────────────

export async function submitReport(payload: {
  emergency_type: EmergencyType;
  severity: SeverityLevel;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string;
  photo_url: string | null;
}) {
  const { data, error } = await supabase
    .from('emergency_reports')
    .insert(payload)
    .select('id')
    .maybeSingle();
  return { data, error };
}

export async function getMyReports(reporterId: string, page = 0, pageSize = 20) {
  const from = page * pageSize;
  const { data, error, count } = await supabase
    .from('emergency_reports')
    .select('*', { count: 'exact' })
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return { data: Array.isArray(data) ? data as EmergencyReport[] : [], error, count };
}

export async function getAllReports(page = 0, pageSize = 50, filters: {
  status?: IncidentStatus;
  emergency_type?: EmergencyType;
  severity?: SeverityLevel;
} = {}) {
  const from = page * pageSize;
  let query = supabase
    .from('emergency_reports')
    .select(`*, profiles!reporter_id(full_name, phone), assigned_profile:profiles!assigned_to(full_name)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.emergency_type) query = query.eq('emergency_type', filters.emergency_type);
  if (filters.severity) query = query.eq('severity', filters.severity);
  const { data, error, count } = await query;
  return { data: Array.isArray(data) ? data as EmergencyReport[] : [], error, count };
}

export async function getReportById(id: string): Promise<EmergencyReport | null> {
  const { data } = await supabase
    .from('emergency_reports')
    .select(`*, profiles!reporter_id(full_name, phone), assigned_profile:profiles!assigned_to(full_name)`)
    .eq('id', id)
    .maybeSingle();
  return data as EmergencyReport | null;
}

export async function updateReportStatus(
  reportId: string,
  newStatus: IncidentStatus,
  updatedBy: string,
  notes?: string,
  afterActionReport?: string
) {
  const { data: current } = await supabase
    .from('emergency_reports')
    .select('status')
    .eq('id', reportId)
    .maybeSingle();

  const updateData: Partial<EmergencyReport> = { status: newStatus };
  if (afterActionReport) updateData.after_action_report = afterActionReport;

  const { error } = await supabase.from('emergency_reports').update(updateData).eq('id', reportId);
  if (!error) {
    await supabase.from('status_updates').insert({
      report_id: reportId,
      updated_by: updatedBy,
      old_status: current?.status ?? null,
      new_status: newStatus,
      notes: notes ?? null,
    });
    await logAudit(updatedBy, 'status_updated', 'emergency_reports', reportId, {
      old_status: current?.status, new_status: newStatus,
    });
  }
  return { error };
}

export async function assignResponder(
  reportId: string,
  responderId: string,
  assignedBy: string,
  notes?: string
) {
  const { error } = await supabase.from('report_assignments').insert({
    report_id: reportId,
    responder_id: responderId,
    assigned_by: assignedBy,
    notes: notes ?? null,
  });
  if (!error) {
    await supabase.from('emergency_reports').update({ assigned_to: responderId, status: 'in_progress' }).eq('id', reportId);
    await logAudit(assignedBy, 'responder_assigned', 'report_assignments', reportId, { responder_id: responderId });
  }
  return { error };
}

export async function getReportAssignments(reportId: string): Promise<ReportAssignment[]> {
  const { data } = await supabase
    .from('report_assignments')
    .select(`*, profiles!responder_id(full_name, role)`)
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  return Array.isArray(data) ? data as ReportAssignment[] : [];
}

export async function getReportStatusHistory(reportId: string): Promise<StatusUpdate[]> {
  const { data } = await supabase
    .from('status_updates')
    .select(`*, profiles!updated_by(full_name)`)
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  return Array.isArray(data) ? data as StatusUpdate[] : [];
}

// ─── Location Updates ────────────────────────────────────────────────────────

export async function upsertLocation(userId: string, lat: number, lng: number, reportId?: string) {
  await supabase.from('location_updates').insert({
    user_id: userId,
    latitude: lat,
    longitude: lng,
    report_id: reportId ?? null,
  });
}

export async function getLatestLocations() {
  const { data } = await supabase.rpc('get_latest_locations').select('*');
  return Array.isArray(data) ? data : [];
}

// ─── Evacuation Centers ──────────────────────────────────────────────────────

export async function getEvacuationCenters(): Promise<EvacuationCenter[]> {
  const { data } = await supabase
    .from('evacuation_centers')
    .select('*')
    .order('name');
  return Array.isArray(data) ? data as EvacuationCenter[] : [];
}

export async function upsertEvacuationCenter(center: Partial<EvacuationCenter>) {
  if (center.id) {
    const { error } = await supabase.from('evacuation_centers').update(center).eq('id', center.id);
    return { error };
  }
  const { error } = await supabase.from('evacuation_centers').insert(center);
  return { error };
}

export async function deleteEvacuationCenter(id: string) {
  const { error } = await supabase.from('evacuation_centers').update({ status: 'inactive' }).eq('id', id);
  return { error };
}

// ─── IoT Devices & Readings ──────────────────────────────────────────────────

export async function getIotDevices(): Promise<IotDevice[]> {
  const { data } = await supabase
    .from('iot_devices')
    .select('*')
    .order('name');
  return Array.isArray(data) ? data as IotDevice[] : [];
}

export async function upsertIotDevice(device: Partial<IotDevice>) {
  if (device.id) {
    const { error } = await supabase.from('iot_devices').update(device).eq('id', device.id);
    return { error };
  }
  const { error } = await supabase.from('iot_devices').insert(device);
  return { error };
}

export async function getSensorReadings(deviceId: string, limit = 50): Promise<SensorReading[]> {
  const { data } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', deviceId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  return Array.isArray(data) ? data as SensorReading[] : [];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(userId: string, role: string, page = 0, pageSize = 30): Promise<Notification[]> {
  const from = page * pageSize;
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .or(`target_user_id.eq.${userId},target_role.eq.${role},target_role.is.null`)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return Array.isArray(data) ? data as Notification[] : [];
}

export async function dispatchNotification(payload: {
  title: string;
  body: string;
  channel?: string;
  target_role?: string | null;
  target_user_id?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke('notification-dispatch', {
    body: payload,
    method: 'POST',
  });
  if (error) {
    const msg = await error?.context?.text?.();
    console.error('notification-dispatch error:', msg || error.message);
  }
  return { data, error };
}

// ─── Caller Logs ─────────────────────────────────────────────────────────────

export async function getCallerLogs(page = 0, pageSize = 50): Promise<CallerLog[]> {
  const from = page * pageSize;
  const { data } = await supabase
    .from('caller_logs')
    .select(`*, profiles!logged_by(full_name)`)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return Array.isArray(data) ? data as CallerLog[] : [];
}

export async function createCallerLog(log: Omit<CallerLog, 'id' | 'created_at' | 'profiles'>) {
  const { data, error } = await supabase.from('caller_logs').insert(log).select('id').maybeSingle();
  return { data, error };
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export async function getAuditLogs(page = 0, pageSize = 50): Promise<AuditLog[]> {
  const from = page * pageSize;
  const { data } = await supabase
    .from('audit_logs')
    .select(`*, profiles!user_id(full_name, email)`)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  return Array.isArray(data) ? data as AuditLog[] : [];
}

export async function logAudit(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  newValues?: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    new_values: newValues ?? null,
  });
}

// ─── System Config ───────────────────────────────────────────────────────────

export async function getSystemConfig(): Promise<SystemConfig[]> {
  const { data } = await supabase.from('system_config').select('*').order('key');
  return Array.isArray(data) ? data as SystemConfig[] : [];
}

export async function updateSystemConfig(key: string, value: string) {
  const { error } = await supabase
    .from('system_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  return { error };
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAnalyticsSummary() {
  const [reports, profiles, readings] = await Promise.all([
    supabase.from('emergency_reports').select('status, emergency_type, severity, created_at'),
    supabase.from('profiles').select('role, is_active, created_at'),
    supabase.from('sensor_readings').select('is_alert, recorded_at').order('recorded_at', { ascending: false }).limit(200),
  ]);
  return {
    reports: Array.isArray(reports.data) ? reports.data : [],
    profiles: Array.isArray(profiles.data) ? profiles.data : [],
    readings: Array.isArray(readings.data) ? readings.data : [],
  };
}
