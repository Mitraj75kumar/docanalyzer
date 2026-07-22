const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const pageNum = Math.max(parseInt(page), 1);
  const limitNum = Math.min(Math.max(parseInt(limit), 1), 100);

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, 200, 'Users fetched', users, {
    page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum),
  });
});

// PUT /api/admin/users/:id/role
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['USER', 'ADMIN'].includes(role)) throw new ApiError(400, 'Invalid role');

  const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
  sendSuccess(res, 200, 'User role updated', { id: user.id, role: user.role });
});

// PUT /api/admin/users/:id/status
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: Boolean(isActive) },
  });
  sendSuccess(res, 200, 'User status updated', { id: user.id, isActive: user.isActive });
});

// DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot delete your own account');
  await prisma.user.delete({ where: { id: req.params.id } });
  sendSuccess(res, 200, 'User deleted');
});

// GET /api/admin/stats
const platformStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalDocuments, totalAnalyses, totalChats, documentsByStatus] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.analysisResult.count(),
    prisma.chatMessage.count(),
    prisma.document.groupBy({ by: ['status'], _count: true }),
  ]);

  sendSuccess(res, 200, 'Platform stats fetched', {
    totalUsers,
    totalDocuments,
    totalAnalyses,
    totalChats,
    documentsByStatus,
  });
});

// GET /api/admin/documents - view all documents across all users
const listAllDocuments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(parseInt(page), 1);
  const limitNum = Math.min(Math.max(parseInt(limit), 1), 100);

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.document.count(),
  ]);

  sendSuccess(res, 200, 'All documents fetched', documents, {
    page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum),
  });
});

module.exports = { listUsers, updateUserRole, toggleUserStatus, deleteUser, platformStats, listAllDocuments };
