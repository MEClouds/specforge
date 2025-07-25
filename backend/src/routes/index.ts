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
        websocket: '/api/websocket/status',
        health: '/health',
      },
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  });
});

// WebSocket status endpoint
router.get('/websocket/status', (req, res) => {
  try {
    if (!req.webSocketService) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'WEBSOCKET_NOT_AVAILABLE',
          message: 'WebSocket service is not available',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    const stats = req.webSocketService.getConnectionStats();

    res.json({
      success: true,
      data: {
        status: 'active',
        connections: stats.totalConnections,
        activeConversations: stats.activeConversations,
        typingUsers: stats.typingUsers,
        uptime: process.uptime(),
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBSOCKET_STATUS_ERROR',
        message: 'Failed to get WebSocket status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// Mount route modules
router.use('/conversations', conversationsRouter);
router.use('/conversations', messagesRouter);
router.use('/ai', aiRouter);
router.use('/specifications', specificationsRouter);

export default router;
