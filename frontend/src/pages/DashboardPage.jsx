import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, XCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDashboardStats } from '../services/document.service';
import StatCard from '../components/dashboard/StatCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => toast.error('Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner className="mt-20" size={32} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your documents and AI analyses.</p>
        </div>
        <Link to="/upload">
          <Button>
            <Upload className="h-4 w-4" /> Upload Document
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Documents" value={stats.total} icon={FileText} tone="primary" />
        <StatCard label="Processed" value={stats.processed} icon={CheckCircle2} tone="green" />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} tone="red" />
      </div>

      <Card title="Recent Documents">
        {stats.recent.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload your first document to get started with AI analysis."
            action={
              <Link to="/upload">
                <Button>Upload a document</Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recent.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.originalName}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(doc.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <Badge tone={doc.status}>{doc.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
