import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, ClipboardList, BarChart3,
  MessageSquareWarning, Bell, Calendar, LogOut, Menu, X, ChevronRight,
  Shield, CreditCard, Home, TrendingUp
} from 'lucide-react';

const NAV_ITEMS = {
  super_admin: [
    { path: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dashboard/students', icon: Users, label: 'Students' },
    { path: '/dashboard/attendance', icon: ClipboardList, label: 'Attendance' },
    { path: '/dashboard/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/dashboard/grievances', icon: MessageSquareWarning, label: 'Grievances' },
    { path: '/dashboard/timetable', icon: Calendar, label: 'Timetable' },
    { path: '/dashboard/announcements', icon: Bell, label: 'Announcements' },
  ],
  dept_admin: [
    { path: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dashboard/students', icon: Users, label: 'Students' },
    { path: '/dashboard/attendance', icon: ClipboardList, label: 'Attendance' },
    { path: '/dashboard/grievances', icon: MessageSquareWarning, label: 'Grievances' },
    { path: '/dashboard/timetable', icon: Calendar, label: 'Timetable' },
    { path: '/dashboard/announcements', icon: Bell, label: 'Announcements' },
  ],
  faculty: [
    { path: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dashboard/attendance', icon: ClipboardList, label: 'Attendance' },
    { path: '/dashboard/timetable', icon: Calendar, label: 'Timetable' },
    { path: '/dashboard/announcements', icon: Bell, label: 'Announcements' },
  ],
  student: [
    { path: '/dashboard/student', icon: Home, label: 'My Dashboard' },
    { path: '/dashboard/attendance', icon: ClipboardList, label: 'Attendance' },
    { path: '/dashboard/grievances', icon: MessageSquareWarning, label: 'Grievances' },
    { path: '/dashboard/timetable', icon: Calendar, label: 'Timetable' },
    { path: '/dashboard/announcements', icon: Bell, label: 'Announcements' },
  ],
  grc_member: [
    { path: '/dashboard/grievances', icon: MessageSquareWarning, label: 'Grievances' },
    { path: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/dashboard/announcements', icon: Bell, label: 'Announcements' },
  ],
};

const ROLE_COLORS = {
  super_admin: 'text-violet-400 bg-violet-500/10',
  dept_admin: 'text-blue-400 bg-blue-500/10',
  faculty: 'text-sky-400 bg-sky-500/10',
  student: 'text-emerald-400 bg-emerald-500/10',
  grc_member: 'text-amber-400 bg-amber-500/10',
};

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV_ITEMS[user?.role] || [];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <div className="font-display text-base font-bold text-white">EduSphere</div>
              <div className="text-xs text-slate-500">Management System</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
            return (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className={`sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}>
                <Icon size={18} className={active ? 'text-primary-400' : ''} />
                <span>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto text-primary-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 mb-2">
            <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center text-primary-400 font-bold text-sm">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-200 truncate">{user?.email}</div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user?.role]}`}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item sidebar-item-inactive w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 shrink-0 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="hidden lg:block">
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'student' && (
              <Link to="/dashboard/grievances/submit" className="btn-primary flex items-center gap-2 text-xs py-1.5">
                <MessageSquareWarning size={14} />Submit Grievance
              </Link>
            )}
            <div className="text-xs text-slate-400 hidden sm:block">Academic Year 2024–25</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
