const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });

// Refresh tokens are random opaque strings stored (hashed is optional extra hardening,
// here we store directly and rely on DB access control + short-ish TTL) in the DB so
// they can be revoked individually (rotate-on-use).
const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

const refreshTokenExpiryDate = () => {
  const days = parseInt(env.jwt.refreshExpiresIn) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

module.exports = { signAccessToken, generateRefreshToken, refreshTokenExpiryDate };
