const { body } = require('express-validator');

const rewriteRules = [
  body('style').optional().isString().isLength({ max: 50 }),
];

const translateRules = [
  body('targetLanguage').notEmpty().withMessage('targetLanguage is required'),
];

const chatRules = [
  body('message').trim().notEmpty().withMessage('message is required').isLength({ max: 2000 }),
];

module.exports = { rewriteRules, translateRules, chatRules };
