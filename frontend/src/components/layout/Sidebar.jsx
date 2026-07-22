import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Upload, History, MessageSquareText, User, ShieldCheck, FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
  }`;

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white p-4 lg:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <FileText className="h-7 w-7 text-primary-600" />
        <span className="text-lg font-bold text-gray-900">DocAnalyzer</span>
      </div>
      <nav className="space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </NavLink>
        <NavLink to="/upload" className={linkClass}>
          <Upload className="h-4 w-4" /> Upload Document
        </NavLink>
        <NavLink to="/history" className={linkClass}>
          <History className="h-4 w-4" /> History &amp; Search
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          <User className="h-4 w-4" /> Profile
        </NavLink>
        {user?.role === 'ADMIN' && (
          <NavLink to="/admin" className={linkClass}>
            <ShieldCheck className="h-4 w-4" /> Admin Panel
          </NavLink>
        )}
      </nav>
      <div className="mt-auto hidden" />
    </aside>
  );
}
