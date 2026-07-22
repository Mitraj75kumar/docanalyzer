const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/users/me
const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new ApiError(404, 'User not found');

  const documentCount = await prisma.document.count({ where: { userId: user.id } });

  sendSuccess(res, 200, 'Profile fetched', {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    documentCount,
  });
});

// PUT /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatarUrl } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  sendSuccess(res, 200, 'Profile updated', {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    avatarUrl: updated.avatarUrl,
  });
});

// PUT /api/users/me/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw new ApiError(401, 'Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  sendSuccess(res, 200, 'Password changed successfully');
});

module.exports = { getProfile, updateProfile, changePassword };
