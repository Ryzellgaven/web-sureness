import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Map, FileText, Bell, Users, Settings,
  Activity, Phone, Shield, BarChart2, Menu, LogOut, Radio,
  AlertTriangle, Home, ChevronRight, Cpu, BookOpen,
} from 'lucide-react';
import type { UserRole } from '@/types/index';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Resident
  { label: 'Home', href: '/resident', icon: Home, roles: ['resident'] },
  { label: 'Report Emergency', href: '/resident/report', icon: AlertTriangle, roles: ['resident'] },
  { label: 'My Reports', href: '/resident/my-reports', icon: FileText, roles: ['resident'] },
  { label: 'Incident Map', href: '/resident/map', icon: Map, roles: ['resident'] },
  { label: 'Evacuation Centers', href: '/resident/evacuation', icon: Shield, roles: ['resident'] },
  { label: 'Notifications', href: '/resident/notifications', icon: Bell, roles: ['resident'] },
  // Staff/Supervisor
  { label: 'Operations Center', href: '/dashboard', icon: LayoutDashboard, roles: ['ldrrmo_staff', 'supervisor', 'admin'] },
  { label: 'Incident Map', href: '/dashboard/map', icon: Map, roles: ['ldrrmo_staff', 'supervisor', 'admin'] },
  { label: 'Incoming Reports', href: '/dashboard/reports', icon: FileText, roles: ['ldrrmo_staff', 'supervisor', 'admin'] },
  { label: 'Caller/SMS Log', href: '/dashboard/caller-log', icon: Phone, roles: ['ldrrmo_staff', 'supervisor', 'admin'] },
  { label: 'IoT Flood Monitor', href: '/dashboard/iot', icon: Activity, roles: ['ldrrmo_staff', 'supervisor', 'admin'] },
  { label: 'Evacuation Centers', href: '/dashboard/evacuation', icon: Shield, roles: ['supervisor', 'admin'] },
  { label: 'Broadcast Alert', href: '/dashboard/broadcast', icon: Radio, roles: ['supervisor', 'admin'] },
  // Admin
  { label: 'Admin Panel', href: '/admin', icon: BarChart2, roles: ['admin'] },
  { label: 'User Management', href: '/admin/users', icon: Users, roles: ['admin'] },
  { label: 'IoT Devices', href: '/admin/iot-devices', icon: Cpu, roles: ['admin'] },
  { label: 'Audit Logs', href: '/admin/audit', icon: BookOpen, roles: ['admin'] },
  { label: 'System Config', href: '/admin/config', icon: Settings, roles: ['admin'] },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = profile?.role;

  const visibleItems = NAV_ITEMS.filter(item => role && item.roles.includes(role));

  const residentItems = visibleItems.filter(i => i.roles.includes('resident') && !i.roles.includes('ldrrmo_staff'));
  const staffItems = visibleItems.filter(i => i.roles.includes('ldrrmo_staff'));
  const adminItems = visibleItems.filter(i => i.roles.includes('admin') && !i.roles.includes('ldrrmo_staff'));

  const groups = role === 'resident'
    ? [{ label: 'Resident Portal', items: residentItems }]
    : role === 'admin'
    ? [
        { label: 'Operations', items: staffItems },
        { label: 'Administration', items: adminItems },
      ]
    : [{ label: 'Operations', items: staffItems }];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src="/images/logo/diplahan-seal.jpg" alt="LDRRMO Diplahan seal" className="h-11 w-11 shrink-0 rounded-full border border-white/70 bg-white object-contain" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-primary truncate">LDRRMO</p>
          <p className="text-[10px] text-muted-foreground truncate">Diplahan Emergency System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {groups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(item => {
                const isActive = location.pathname === item.href ||
                  (item.href !== '/dashboard' && item.href !== '/resident' && item.href !== '/admin' && location.pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{item.label}</span>
                      {item.badge && <Badge className="shrink-0 text-[10px] h-4 px-1">{item.badge}</Badge>}
                      {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-sidebar-primary/70" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded hover:bg-sidebar-accent">
          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-[10px] text-muted-foreground capitalize truncate">
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/images/logo/diplahan-seal.jpg" alt="" className="h-7 w-7 shrink-0 rounded-full bg-white object-contain" />
            <span className="text-sm font-bold text-primary truncate">LDRRMO Diplahan</span>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
