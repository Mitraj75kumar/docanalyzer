const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');
const aiService = require('../services/ai.service');

// GET /api/documents/:id/chat - fetch chat history
const getChatHistory = asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!document) throw new ApiError(404, 'Document not found');

  const messages = await prisma.chatMessage.findMany({
    where: { documentId: document.id, userId: req.user.id },
    orderBy: { createdAt: 'asc' },
  });
  sendSuccess(res, 200, 'Chat history fetched', messages);
});

// POST /api/documents/:id/chat - ask a question about the document
const sendChatMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) throw new ApiError(400, 'message is required');

  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!document) throw new ApiError(404, 'Document not found');
  if (!document.extractedText) throw new ApiError(422, 'Document has no extracted text');

  const history = await prisma.chatMessage.findMany({
    where: { documentId: document.id, userId: req.user.id },
    orderBy: { createdAt: 'asc' },
    take: 20, // keep recent context bounded
  });

  const userMsg = await prisma.chatMessage.create({
    data: { documentId: document.id, userId: req.user.id, role: 'user', content: message },
  });

  const answer = await aiService.chatWithDocument(document.extractedText, history, message);

  const assistantMsg = await prisma.chatMessage.create({
    data: { documentId: document.id, userId: req.user.id, role: 'assistant', content: answer },
  });

  sendSuccess(res, 201, 'Message sent', { userMessage: userMsg, assistantMessage: assistantMsg });
});


// POST /api/documents/:id/chat/stream - ask a question, stream the answer via SSE
const sendChatMessageStream = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) throw new ApiError(400, 'message is required');

  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!document) throw new ApiError(404, 'Document not found');
  if (!document.extractedText) throw new ApiError(422, 'Document has no extracted text');

  const history = await prisma.chatMessage.findMany({
    where: { documentId: document.id, userId: req.user.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const userMsg = await prisma.chatMessage.create({
    data: { documentId: document.id, userId: req.user.id, role: 'user', content: message },
  });

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Let the client know the user message was saved (so UI can render it immediately)
  res.write(`event: user_message\ndata: ${JSON.stringify(userMsg)}\n\n`);

  let fullAnswer = '';
  try {
    for await (const chunk of aiService.chatWithDocumentStream(document.extractedText, history, message)) {
      fullAnswer += chunk;
      res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    }
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message || 'Streaming failed' })}\n\n`);
    return res.end();
  }

  const assistantMsg = await prisma.chatMessage.create({
    data: { documentId: document.id, userId: req.user.id, role: 'assistant', content: fullAnswer },
  });

  res.write(`event: done\ndata: ${JSON.stringify({ assistantMessage: assistantMsg })}\n\n`);
  res.end();
});

module.exports = { getChatHistory, sendChatMessage, sendChatMessageStream };


