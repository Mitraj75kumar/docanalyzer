import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { uploadDocument } from '../services/document.service';

const ACCEPTED = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.webp'];

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadDocument(file, (evt) => {
        setProgress(Math.round((evt.loaded * 100) / evt.total));
      });
      toast.success('Document uploaded and processed!');
      navigate(`/documents/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
        <p className="text-sm text-gray-500">
          Supported formats: PDF, DOCX, TXT, PNG/JPEG (image text is extracted via OCR).
        </p>
      </div>

      <Card>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition ${
            dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
          }`}
        >
          <UploadCloud className="mb-3 h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-600">
            Drag & drop a file here, or{' '}
            <label className="cursor-pointer font-medium text-primary-600 hover:underline">
              browse
              <input
                type="file"
                className="hidden"
                accept={ACCEPTED.join(',')}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-gray-400">Max file size 20MB</p>
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            <FileText className="h-5 w-5 text-primary-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        )}

        {uploading && (
          <div className="mt-4 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <Button className="mt-6 w-full" onClick={handleUpload} loading={uploading} disabled={!file}>
          Upload &amp; Process
        </Button>
      </Card>
    </div>
  );
}
