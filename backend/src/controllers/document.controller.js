const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { ALLOWED_MIME_TYPES } = require('../middleware/upload');
const { extractText } = require('../services/fileParser.service');

// POST /api/documents/upload
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');

  const fileType = ALLOWED_MIME_TYPES[req.file.mimetype];

  const document = await prisma.document.create({
    data: {
      userId: req.user.id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      filePath: req.file.path,
      fileType,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      status: 'PROCESSING',
    },
  });

  // Extract text synchronously (kept simple; for very large files/scale, move to a queue/worker)
  const { text, error } = await extractText(document.filePath, fileType);

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: error
      ? { status: 'FAILED', errorMessage: error }
      : { status: 'PROCESSED', extractedText: text },
  });

  sendSuccess(res, 201, 'Document uploaded and processed', updated);
});

// GET /api/documents  (history + search + pagination)
const listDocuments = asyncHandler(async (req, res) => {
  const { search = '', status, page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(parseInt(page), 1);
  const limitNum = Math.min(Math.max(parseInt(limit), 1), 50);

  const where = {
    userId: req.user.id,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { originalName: { contains: search, mode: 'insensitive' } },
            { extractedText: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      select: {
        id: true,
        originalName: true,
        fileType: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.document.count({ where }),
  ]);

  sendSuccess(res, 200, 'Documents fetched', documents, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  });
});

// GET /api/documents/:id
const getDocument = asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { analyses: { orderBy: { createdAt: 'desc' } } },
  });
  if (!document) throw new ApiError(404, 'Document not found');
  sendSuccess(res, 200, 'Document fetched', document);
});

// DELETE /api/documents/:id
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!document) throw new ApiError(404, 'Document not found');

  await prisma.document.delete({ where: { id: document.id } });
  sendSuccess(res, 200, 'Document deleted');
});

// GET /api/documents/stats/dashboard
const dashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [total, processed, failed, byType, recent] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.count({ where: { userId, status: 'PROCESSED' } }),
    prisma.document.count({ where: { userId, status: 'FAILED' } }),
    prisma.document.groupBy({ by: ['fileType'], where: { userId }, _count: true }),
    prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, originalName: true, status: true, createdAt: true, fileType: true },
    }),
  ]);

  sendSuccess(res, 200, 'Dashboard stats fetched', {
    total,
    processed,
    failed,
    byType,
    recent,
  });
});

module.exports = { uploadDocument, listDocuments, getDocument, deleteDocument, dashboardStats };
