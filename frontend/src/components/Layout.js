import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  House, BookOpen, Users, CalendarCheck, ClipboardText,
  CurrencyDollar, Gear, ChartBar, Bell, SignOut, List, X,
  GraduationCap, UserCircle, FolderOpen, Sun, Moon, CalendarBlank, Airplane
} from '@phosphor-icons/react';

const navItems = {
  super_admin: [
    { to: '/dashboard', icon: House, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/batches', icon: GraduationCap, label: 'Batches' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/faculty', icon: UserCircle, label: 'Faculty' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/assignments', icon: ClipboardText, label: 'Assignments' },
    { to: '/fees', icon: CurrencyDollar, label: 'Fees' },
    { to: '/files', icon: FolderOpen, label: 'Files' },
    { to: '/leaves', icon: Airplane, label: 'Leaves' },
    { to: '/holidays', icon: CalendarBlank, label: 'Holidays' },
    { to: '/analytics', icon: ChartBar, label: 'Analytics' },
    { to: '/settings', icon: Gear, label: 'Settings' },
  ],
  admin: [
    { to: '/dashboard', icon: House, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/batches', icon: GraduationCap, label: 'Batches' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/faculty', icon: UserCircle, label: 'Faculty' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/assignments', icon: ClipboardText, label: 'Assignments' },
    { to: '/fees', icon: CurrencyDollar, label: 'Fees' },
    { to: '/files', icon: FolderOpen, label: 'Files' },
    { to: '/leaves', icon: Airplane, label: 'Leaves' },
    { to: '/holidays', icon: CalendarBlank, label: 'Holidays' },
    { to: '/analytics', icon: ChartBar, label: 'Analytics' },
  ],
  faculty: [
    { to: '/dashboard', icon: House, label: 'Dashboard' },
    { to: '/batches', icon: GraduationCap, label: 'My Batches' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/assignments', icon: ClipboardText, label: 'Assignments' },
    { to: '/files', icon: FolderOpen, label: 'Materials' },
    { to: '/leaves', icon: Airplane, label: 'My Leaves' },
    { to: '/holidays', icon: CalendarBlank, label: 'Holidays' },
  ],
  student: [
    { to: '/dashboard', icon: House, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'My Courses' },
    { to: '/assignments', icon: ClipboardText, label: 'Assignments' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/fees', icon: CurrencyDollar, label: 'Fees' },
    { to: '/files', icon: FolderOpen, label: 'Materials' },
    { to: '/leaves', icon: UserCircle, label: 'Faculty Schedule' },
    { to: '/holidays', icon: CalendarBlank, label: 'Holidays' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { document.documentElement.classList.add('dark'); return true; }
    return false;
  });

  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      if (next) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
      else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = navItems[user?.role] || navItems.student;
  const roleLabel = (user?.role || '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col border-r transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 flex items-center justify-center font-bold text-white text-sm" style={{ background: 'var(--brand)' }}>CL</div>
          <span className="font-heading text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Outfit' }}>CIQURA LABS</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-l-2 ${
                  isActive
                    ? 'border-l-[var(--brand)] bg-[var(--surface)]'
                    : 'border-l-transparent hover:bg-[var(--surface)]'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
                fontFamily: 'IBM Plex Sans'
              })}
            >
              <item.icon size={18} weight={item.to === window.location.pathname ? 'duotone' : 'regular'} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors duration-150 hover:bg-[var(--surface)]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}
          >
            <SignOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1"
            data-testid="mobile-menu-btn"
            style={{ color: 'var(--text-primary)' }}
          >
            <List size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button onClick={toggleTheme} data-testid="theme-toggle-btn" className="p-2 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ color: 'var(--text-secondary)' }}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink to="/notifications" data-testid="notifications-btn" className="p-2 transition-colors duration-150 hover:bg-[var(--surface)]" style={{ color: 'var(--text-secondary)' }}>
              <Bell size={18} />
            </NavLink>
            <div className="flex items-center gap-2 pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
              {user?.picture ? (
                <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand)' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'IBM Plex Sans' }}>{user?.name}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Sans' }}>{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6" style={{ background: 'var(--surface)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
