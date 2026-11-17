import express from 'express';
import { handleAiChat } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication on all AI chatbot routes
router.use(requireAuth);

router.post('/chat', handleAiChat);

export default router;
