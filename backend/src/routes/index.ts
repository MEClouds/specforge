import { Router } from 'express';
import conversationsRouter from './conversations';
import messagesRouter from './messages';

const router = Router();

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'SpecForge API',
      version: '1.0.0',
      description: 'AI-powered specification generation service',
      endpoints: {
        conversations: '/api/conversations',
        messages: '/api/conversations/:conversationId/messages',
        health: '/health',
      },
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  });
});

// Mount route modules
router.use('/conversations', conversationsRouter);
router.use('/conversations', messagesRouter);

export default router;
