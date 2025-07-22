import { Router } from 'express';
import conversationsRouter from './conversations';
import messagesRouter from './messages';
import aiRouter from './ai';
import specificationsRouter from './specifications';

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
        ai: '/api/ai',
        specifications: '/api/specifications',
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
router.use('/ai', aiRouter);
router.use('/specifications', specificationsRouter);

export default router;
