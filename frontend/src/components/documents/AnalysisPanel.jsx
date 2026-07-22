import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import {
  summarizeDocument,
  rewriteDocument,
  translateDocument,
  extractKeywords,
  analyzeSentiment,
} from '../../services/document.service';

// A single generic panel that adapts its controls/output rendering based on `type`.
export default function AnalysisPanel({ documentId, type }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState('professional');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');

  const run = async () => {
    setLoading(true);
    try {
      let res;
      if (type === 'summary') res = await summarizeDocument(documentId);
      else if (type === 'rewrite') res = await rewriteDocument(documentId, style);
      else if (type === 'translate') res = await translateDocument(documentId, targetLanguage);
      else if (type === 'keywords') res = await extractKeywords(documentId);
      else if (type === 'sentiment') res = await analyzeSentiment(documentId);
      setResult(res.data.output);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {type === 'rewrite' && (
        <div className="flex items-end gap-3">
          <div className="w-56">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Style</label>
            <select className="input-field" value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="concise">Concise</option>
              <option value="academic">Academic</option>
              <option value="persuasive">Persuasive</option>
            </select>
          </div>
          <Button onClick={run} loading={loading}>Generate</Button>
        </div>
      )}

      {type === 'translate' && (
        <div className="flex items-end gap-3">
          <div className="w-56">
            <Input
              label="Target language"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            />
          </div>
          <Button onClick={run} loading={loading}>Translate</Button>
        </div>
      )}

      {['summary', 'keywords', 'sentiment'].includes(type) && (
        <Button onClick={run} loading={loading}>
          {result ? 'Regenerate' : 'Generate'}
        </Button>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
          {type === 'summary' && (
            <>
              <p className="mb-3">{result.summary}</p>
              {result.keyPoints?.length > 0 && (
                <ul className="list-disc space-y-1 pl-5">
                  {result.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          {type === 'rewrite' && <p className="whitespace-pre-wrap">{result.rewritten}</p>}

          {type === 'translate' && (
            <>
              <p className="mb-2 text-xs font-medium text-gray-500">Translated to {result.targetLanguage}</p>
              <p className="whitespace-pre-wrap">{result.translated}</p>
            </>
          )}

          {type === 'keywords' && (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-500">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.keywords?.map((k, i) => (
                    <Badge key={i} tone="neutral">{k}</Badge>
                  ))}
                </div>
              </div>
              {result.entities?.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-500">Entities</p>
                  <div className="flex flex-wrap gap-2">
                    {result.entities.map((e, i) => (
                      <Badge key={i} tone="primary">{e}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'sentiment' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone={result.sentiment}>{result.sentiment}</Badge>
                <span className="text-xs text-gray-500">score: {result.score}</span>
              </div>
              <p>{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
