import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { getChatHistory, sendChatMessageStream } from '../../services/document.service';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

export default function ChatPanel({ documentId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    getChatHistory(documentId)
      .then((res) => setMessages(res.data))
      .catch(() => toast.error('Failed to load chat history'))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const question = input;
    setInput('');
    setSending(true);
    setStreamingText('');

    sendChatMessageStream(documentId, question, {
      onUserMessage: (userMsg) => {
        setMessages((prev) => [...prev, userMsg]);
      },
      onChunk: (chunk) => {
        setStreamingText((prev) => prev + chunk);
      },
      onDone: (assistantMsg) => {
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText('');
        setSending(false);
      },
      onError: (errMsg) => {
        toast.error(errMsg || 'Failed to send message');
        setStreamingText('');
        setSending(false);
      },
    });
  };

  if (loading) return <Spinner className="py-10" />;

  return (
    <div className="flex h-[28rem] flex-col rounded-xl border border-gray-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !streamingText && (
          <p className="text-center text-sm text-gray-400">Ask a question about this document to get started.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-800">
              {streamingText}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-gray-400 align-middle" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-100 p-3">
        <input
          className="input-field"
          placeholder="Ask a question about this document..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" loading={sending} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
