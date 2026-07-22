const router = require('express').Router();
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, authorize('ADMIN'));

router.get('/stats', adminController.platformStats);
router.get('/users', adminController.listUsers);
router.put('/users/:id/role', [body('role').isIn(['USER', 'ADMIN'])], validate, adminController.updateUserRole);
router.put('/users/:id/status', [body('isActive').isBoolean()], validate, adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);
router.get('/documents', adminController.listAllDocuments);

module.exports = router;
