import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import { getDocument } from '../services/document.service';
import Spinner from '../components/common/Spinner';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import AnalysisPanel from '../components/documents/AnalysisPanel';
import ChatPanel from '../components/documents/ChatPanel';

const TABS = [
  { key: 'text', label: 'Extracted Text' },
  { key: 'summary', label: 'Summary' },
  { key: 'rewrite', label: 'Rewrite' },
  { key: 'translate', label: 'Translate' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'chat', label: 'Chat' },
];

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('text');

  useEffect(() => {
    getDocument(id)
      .then((res) => setDocument(res.data))
      .catch(() => toast.error('Failed to load document'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner className="mt-20" size={32} />;
  if (!document) return <p className="text-gray-500">Document not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{document.originalName}</h1>
            <p className="text-sm text-gray-500">
              {document.fileType} &middot; {(document.sizeBytes / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <Badge tone={document.status}>{document.status}</Badge>
      </div>

      {document.status === 'FAILED' && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            Processing failed: {document.errorMessage || 'Unknown error'}
          </p>
        </Card>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                tab === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {tab === 'text' && (
          <Card>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {document.extractedText || 'No text extracted.'}
            </p>
          </Card>
        )}
        {tab === 'summary' && <AnalysisPanel documentId={id} type="summary" />}
        {tab === 'rewrite' && <AnalysisPanel documentId={id} type="rewrite" />}
        {tab === 'translate' && <AnalysisPanel documentId={id} type="translate" />}
        {tab === 'keywords' && <AnalysisPanel documentId={id} type="keywords" />}
        {tab === 'sentiment' && <AnalysisPanel documentId={id} type="sentiment" />}
        {tab === 'chat' && <ChatPanel documentId={id} />}
      </div>
    </div>
  );
}
