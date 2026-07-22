const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');
const aiService = require('../services/ai.service');

const getOwnedDocument = async (documentId, userId) => {
  const document = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!document) throw new ApiError(404, 'Document not found');
  if (!document.extractedText) {
    throw new ApiError(422, 'Document has no extracted text to analyze');
  }
  return document;
};

const runAnalysis = (type, aiCall) =>
  asyncHandler(async (req, res) => {
    const document = await getOwnedDocument(req.params.id, req.user.id);
    const output = await aiCall(document);

    const saved = await prisma.analysisResult.create({
      data: {
        documentId: document.id,
        type,
        input: req.body || {},
        output,
      },
    });

    sendSuccess(res, 200, `${type} generated`, saved);
  });

const summarize = runAnalysis('SUMMARY', (doc) => aiService.summarize(doc.extractedText));

// Rewrite needs access to req.body.style, so it's handled directly rather than via runAnalysis
const rewriteHandler = asyncHandler(async (req, res) => {
  const document = await getOwnedDocument(req.params.id, req.user.id);
  const style = req.body.style || 'professional';
  const output = await aiService.rewrite(document.extractedText, style);
  const saved = await prisma.analysisResult.create({
    data: { documentId: document.id, type: 'REWRITE', input: { style }, output },
  });
  sendSuccess(res, 200, 'Rewrite generated', saved);
});

const translateHandler = asyncHandler(async (req, res) => {
  const { targetLanguage } = req.body;
  if (!targetLanguage) throw new ApiError(400, 'targetLanguage is required');
  const document = await getOwnedDocument(req.params.id, req.user.id);
  const output = await aiService.translate(document.extractedText, targetLanguage);
  const saved = await prisma.analysisResult.create({
    data: { documentId: document.id, type: 'TRANSLATION', input: { targetLanguage }, output },
  });
  sendSuccess(res, 200, 'Translation generated', saved);
});

const keywords = runAnalysis('KEYWORDS', (doc) => aiService.extractKeywords(doc.extractedText));

const sentiment = runAnalysis('SENTIMENT', (doc) => aiService.analyzeSentiment(doc.extractedText));

// GET /api/documents/:id/analyses  - retrieve saved analysis history for a document
const listAnalyses = asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!document) throw new ApiError(404, 'Document not found');

  const analyses = await prisma.analysisResult.findMany({
    where: { documentId: document.id },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, 200, 'Analyses fetched', analyses);
});

module.exports = {
  summarize,
  rewrite: rewriteHandler,
  translate: translateHandler,
  keywords,
  sentiment,
  listAnalyses,
};
