import { Link, useLocation } from 'react-router-dom';
import { useWS } from '../context/WebSocketContext';
import { StatusBadge } from './StatusBadge';
import { Cpu, Terminal, Radio, Zap, BookOpen, LayoutDashboard, Bell, Users } from 'lucide-react';

const nav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/commission', label: 'Commission', icon: Radio },
  { path: '/devices', label: 'Devices', icon: Cpu },
  { path: '/groups', label: 'Groups', icon: Users },
  { path: '/commands', label: 'Commands', icon: Zap },
  { path: '/notifications', label: 'Live Events', icon: Bell },
  { path: '/console', label: 'Console', icon: Terminal },
  { path: '/info', label: 'Matter Info', icon: BookOpen },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { status } = useWS();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg text-gray-900">Matter Controller</span>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="flex flex-1">
        <nav className="w-16 md:w-56 bg-white border-r border-gray-200 flex flex-col py-4 shrink-0">
          {nav.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
