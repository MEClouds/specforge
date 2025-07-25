import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { databaseService } from './services/DatabaseService';
import { WebSocketService } from './services/WebSocketService';
import { ConversationOrchestrator } from './services/ConversationOrchestrator';
import { AIService, AIServiceConfig } from './services/AIService';
import apiRoutes from './routes';
import {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize AI Service
const aiConfig: AIServiceConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  defaultProvider:
    (process.env.DEFAULT_AI_PROVIDER as 'openai' | 'anthropic' | 'deepseek') ||
    'openai',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '10'),
};

const aiService = new AIService(aiConfig);
const conversationOrchestrator = new ConversationOrchestrator(aiService);

// Initialize WebSocket service
let webSocketService: WebSocketService;

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Security and logging middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await databaseService.healthCheck();
    const wsStats = webSocketService
      ? webSocketService.getConnectionStats()
      : null;

    res.json({
      success: true,
      data: {
        status: dbHealthy ? 'OK' : 'DEGRADED',
        database: dbHealthy ? 'connected' : 'disconnected',
        websocket: wsStats
          ? {
              status: 'active',
              totalConnections: wsStats.totalConnections,
              activeConversations: wsStats.activeConversations,
              typingUsers: wsStats.typingUsers,
            }
          : { status: 'inactive' },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
});

// Make services available to routes
app.use((req, res, next) => {
  req.webSocketService = webSocketService;
  req.conversationOrchestrator = conversationOrchestrator;
  req.aiService = aiService;
  next();
});

// API routes
app.use('/api', apiRoutes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Initialize database connection and start server
async function startServer() {
  try {
    await databaseService.connect();
    console.log('✅ Database connected successfully');

    // Initialize WebSocket service after database connection
    webSocketService = new WebSocketService(
      httpServer,
      conversationOrchestrator,
      databaseService
    );

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    if (webSocketService) {
      webSocketService.close();
      console.log('✅ WebSocket server closed');
    }
    await databaseService.disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    if (webSocketService) {
      webSocketService.close();
      console.log('✅ WebSocket server closed');
    }
    await databaseService.disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();
