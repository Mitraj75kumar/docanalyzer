import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, FileText, MessageSquare, Sparkles } from 'lucide-react';
import {
  getPlatformStats, listUsers, toggleUserStatus, updateUserRole, deleteUser,
} from '../services/admin.service';
import StatCard from '../components/dashboard/StatCard';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import Badge from '../components/common/Badge';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([getPlatformStats(), listUsers({ limit: 20 })]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      await toggleUserStatus(user.id, !user.isActive);
      toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'}`);
      load();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleRoleChange = async (user, role) => {
    try {
      await updateUserRole(user.id, role);
      toast.success('Role updated');
      load();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) return <Spinner className="mt-20" size={32} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500">Manage users and monitor platform-wide activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} tone="primary" />
        <StatCard label="Total Documents" value={stats.totalDocuments} icon={FileText} tone="green" />
        <StatCard label="AI Analyses Run" value={stats.totalAnalyses} icon={Sparkles} tone="yellow" />
        <StatCard label="Chat Messages" value={stats.totalChats} icon={MessageSquare} tone="primary" />
      </div>

      <Card title="Users">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Role</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Docs</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 text-sm text-gray-900">{u.name}</td>
                  <td className="px-3 py-2 text-sm text-gray-500">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-md border border-gray-200 text-xs"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">{u._count?.documents ?? 0}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleToggleStatus(u)}>
                      <Badge tone={u.isActive ? 'positive' : 'negative'}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
