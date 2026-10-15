import api from './api';

export const uploadDocument = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return api
    .post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    .then((r) => r.data);
};

export const listDocuments = (params) => api.get('/documents', { params }).then((r) => r.data);
export const getDocument = (id) => api.get(`/documents/${id}`).then((r) => r.data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`).then((r) => r.data);
export const getDashboardStats = () => api.get('/documents/stats/dashboard').then((r) => r.data);

export const summarizeDocument = (id) => api.post(`/documents/${id}/summarize`).then((r) => r.data);
export const rewriteDocument = (id, style) => api.post(`/documents/${id}/rewrite`, { style }).then((r) => r.data);
export const translateDocument = (id, targetLanguage) =>
  api.post(`/documents/${id}/translate`, { targetLanguage }).then((r) => r.data);
export const extractKeywords = (id) => api.post(`/documents/${id}/keywords`).then((r) => r.data);
export const analyzeSentiment = (id) => api.post(`/documents/${id}/sentiment`).then((r) => r.data);
export const listAnalyses = (id) => api.get(`/documents/${id}/analyses`).then((r) => r.data);

export const getChatHistory = (id) => api.get(`/documents/${id}/chat`).then((r) => r.data);
export const sendChatMessage = (id, message) => api.post(`/documents/${id}/chat`, { message }).then((r) => r.data);

export const sendChatMessageStream = (id, message, { onUserMessage, onChunk, onDone, onError }) => {
  const token = localStorage.getItem('accessToken');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  fetch(`${baseUrl}/documents/${id}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })
    .then(async (response) => {
      if (!response.ok || !response.body) {
        throw new Error('Failed to start stream');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (currentEvent === 'user_message') {
                onUserMessage?.(parsed);
              } else if (currentEvent === 'chunk') {
                onChunk?.(parsed.text);
              } else if (currentEvent === 'done') {
                onDone?.(parsed.assistantMessage);
              } else if (currentEvent === 'error') {
                onError?.(parsed.message);
              }
            } catch {
              // skip malformed line
            }
          }
        }
      }
    })
    .catch((err) => {
      onError?.(err.message || 'Streaming failed');
    });
};