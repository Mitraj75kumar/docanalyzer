const router = require('express').Router();
const documentController = require('../controllers/document.controller');
const analysisController = require('../controllers/analysis.controller');
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { rewriteRules, translateRules, chatRules } = require('../validators/document.validator');

router.use(protect);

router.get('/stats/dashboard', documentController.dashboardStats);

router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/', documentController.listDocuments);
router.get('/:id', documentController.getDocument);
router.delete('/:id', documentController.deleteDocument);

// AI analysis endpoints
router.get('/:id/analyses', analysisController.listAnalyses);
router.post('/:id/summarize', analysisController.summarize);
router.post('/:id/rewrite', rewriteRules, validate, analysisController.rewrite);
router.post('/:id/translate', translateRules, validate, analysisController.translate);
router.post('/:id/keywords', analysisController.keywords);
router.post('/:id/sentiment', analysisController.sentiment);

// Chat with document
router.get('/:id/chat', chatController.getChatHistory);
router.post('/:id/chat', chatRules, validate, chatController.sendChatMessage);
router.post('/:id/chat/stream', chatRules, validate, chatController.sendChatMessageStream);

module.exports = router;

