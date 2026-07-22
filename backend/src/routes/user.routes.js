const router = require('express').Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

router.get('/me', userController.getProfile);

router.put(
  '/me',
  [body('name').optional().trim().isLength({ min: 1, max: 100 })],
  validate,
  userController.updateProfile
);

router.put(
  '/me/password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/\d/),
  ],
  validate,
  userController.changePassword
);

module.exports = router;
