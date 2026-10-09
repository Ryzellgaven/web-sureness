import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteGuard } from '@/components/common/RouteGuard';
import { MainLayout } from '@/components/layouts/MainLayout';

// Public pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFound from '@/pages/NotFound';

// Resident portal
import ResidentHome from '@/pages/resident/ResidentHome';
import ReportEmergency from '@/pages/resident/ReportEmergency';
import MyReports from '@/pages/resident/MyReports';
import ResidentMap from '@/pages/resident/ResidentMap';
import EvacuationCenters from '@/pages/resident/EvacuationCenters';
import ResidentNotifications from '@/pages/resident/ResidentNotifications';

// LDRRMO dashboard
import OperationsCenter from '@/pages/dashboard/OperationsCenter';
import DashboardMap from '@/pages/dashboard/DashboardMap';
import IncomingReports from '@/pages/dashboard/IncomingReports';
import CallerLogPage from '@/pages/dashboard/CallerLogPage';
import IoTDashboard from '@/pages/dashboard/IoTDashboard';
import EvacuationManagement from '@/pages/dashboard/EvacuationManagement';
import BroadcastPage from '@/pages/dashboard/BroadcastPage';

// Admin panel
import AdminHome from '@/pages/admin/AdminHome';
import UserManagement from '@/pages/admin/UserManagement';
import IoTDeviceManagement from '@/pages/admin/IoTDeviceManagement';
import AuditLogs from '@/pages/admin/AuditLogs';
import SystemConfiguration from '@/pages/admin/SystemConfiguration';
import AnalyticsDashboard from '@/pages/admin/AnalyticsDashboard';

import type { UserRole } from '@/types/index';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  public?: boolean;
}

const STAFF_ROLES: UserRole[] = ['ldrrmo_staff', 'supervisor', 'admin'];
const SUPERVISOR_ROLES: UserRole[] = ['supervisor', 'admin'];
const ADMIN_ROLES: UserRole[] = ['admin'];
const RESIDENT_ROLES: UserRole[] = ['resident'];

function Protected({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  return (
    <RouteGuard allowedRoles={roles}>
      <MainLayout>{children}</MainLayout>
    </RouteGuard>
  );
}

export const routes: RouteConfig[] = [
  // ── Public ──────────────────────────────────────────────────
  { name: 'Landing', path: '/', element: <LandingPage />, public: true },
  { name: 'Login', path: '/login', element: <LoginPage />, public: true },
  { name: 'Register', path: '/register', element: <RegisterPage />, public: true },

  // ── Resident Portal ─────────────────────────────────────────
  { name: 'Resident Home', path: '/resident', element: <Protected roles={RESIDENT_ROLES}><ResidentHome /></Protected> },
  { name: 'Report Emergency', path: '/resident/report', element: <Protected roles={RESIDENT_ROLES}><ReportEmergency /></Protected> },
  { name: 'My Reports', path: '/resident/my-reports', element: <Protected roles={RESIDENT_ROLES}><MyReports /></Protected> },
  { name: 'Resident Map', path: '/resident/map', element: <Protected roles={RESIDENT_ROLES}><ResidentMap /></Protected> },
  { name: 'Evacuation Centers', path: '/resident/evacuation', element: <Protected roles={RESIDENT_ROLES}><EvacuationCenters /></Protected> },
  { name: 'Notifications', path: '/resident/notifications', element: <Protected roles={RESIDENT_ROLES}><ResidentNotifications /></Protected> },

  // ── LDRRMO Dashboard ─────────────────────────────────────────
  { name: 'Operations Center', path: '/dashboard', element: <Protected roles={STAFF_ROLES}><OperationsCenter /></Protected> },
  { name: 'Dashboard Map', path: '/dashboard/map', element: <Protected roles={STAFF_ROLES}><DashboardMap /></Protected> },
  { name: 'Incoming Reports', path: '/dashboard/reports', element: <Protected roles={STAFF_ROLES}><IncomingReports /></Protected> },
  { name: 'Caller Log', path: '/dashboard/caller-log', element: <Protected roles={STAFF_ROLES}><CallerLogPage /></Protected> },
  { name: 'IoT Dashboard', path: '/dashboard/iot', element: <Protected roles={STAFF_ROLES}><IoTDashboard /></Protected> },
  { name: 'Evacuation Mgmt', path: '/dashboard/evacuation', element: <Protected roles={SUPERVISOR_ROLES}><EvacuationManagement /></Protected> },
  { name: 'Broadcast Alert', path: '/dashboard/broadcast', element: <Protected roles={SUPERVISOR_ROLES}><BroadcastPage /></Protected> },

  // ── Admin Panel ───────────────────────────────────────────────
  { name: 'Admin Analytics', path: '/admin', element: <Protected roles={ADMIN_ROLES}><AnalyticsDashboard /></Protected> },
  { name: 'Admin Home', path: '/admin/home', element: <Protected roles={ADMIN_ROLES}><AdminHome /></Protected> },
  { name: 'User Management', path: '/admin/users', element: <Protected roles={ADMIN_ROLES}><UserManagement /></Protected> },
  { name: 'IoT Devices', path: '/admin/iot-devices', element: <Protected roles={ADMIN_ROLES}><IoTDeviceManagement /></Protected> },
  { name: 'Audit Logs', path: '/admin/audit', element: <Protected roles={ADMIN_ROLES}><AuditLogs /></Protected> },
  { name: 'System Config', path: '/admin/config', element: <Protected roles={ADMIN_ROLES}><SystemConfiguration /></Protected> },

  // ── Not Found ─────────────────────────────────────────────────
  { name: 'Not Found', path: '/404', element: <NotFound />, public: true },
];
