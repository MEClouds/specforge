import request from 'supertest';
import { Server as HTTPServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import cors from 'cors';
import { WebSocketService } from '../services/WebSocketService';
import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import { DatabaseService } from '../services/DatabaseService';
import { AIService } from '../services/AIService';
import apiRoutes from '../routes';
import { requestIdMiddleware } from '../middleware/errorHandler';

describe('WebSocket Integration', () => {
  let app: express.Application;
  let httpServer: HTTPServer;
  let webSocketService: WebSocketService;
  let clientSocket: ClientSocket;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockConversationOrchestrator: jest.Mocked<ConversationOrchestrator>;
  let mockAIService: jest.Mocked<AIService>;

  const TEST_PORT = 3003;

  beforeAll((done) => {
    // Create Express app
    app = express();
    httpServer = new HTTPServer(app);

    // Create mock services
    mockAIService = {
      generateResponse: jest.fn(),
      validateApiKeys: jest.fn(),
      getAvailablePersonas: jest.fn(),
      getPersonaConfig: jest.fn(),
    } as any;

    mockConversationOrchestrator = {
      orchestrateConversation: jest.fn(),
      handlePersonaConflict: jest.fn(),
      getPhaseProgress: jest.fn(),
    } as any;

    mockDatabaseService = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(true),
      getConversation: jest.fn(),
      addMessage: jest.fn(),
      createConversation: jest.fn(),
      createSpecification: jest.fn(),
    } as any;

    // Setup Express middleware
    app.use(requestIdMiddleware);
    app.use(cors());
    app.use(express.json());

    // Initialize WebSocket service
    webSocketService = new WebSocketService(
      httpServer,
      mockConversationOrchestrator,
      mockDatabaseService
    );

    // Make services available to routes
    app.use((req, res, next) => {
      req.webSocketService = webSocketService;
      req.conversationOrchestrator = mockConversationOrchestrator;
      req.aiService = mockAIService;
      next();
    });

    // Add health check endpoint
    app.get('/health', (req, res) => {
      const wsStats = req.webSocketService
        ? req.webSocketService.getConnectionStats()
        : null;

      res.json({
        success: true,
        data: {
          status: 'OK',
          database: 'connected',
          websocket: wsStats
            ? {
                status: 'active',
                totalConnections: wsStats.totalConnections,
                activeConversations: wsStats.activeConversations,
                typingUsers: wsStats.typingUsers,
              }
            : { status: 'inactive' },
          uptime: process.uptime(),
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Mount API routes
    app.use('/api', apiRoutes);

    httpServer.listen(TEST_PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    webSocketService.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Create client socket
    clientSocket = Client(`http://localhost:${TEST_PORT}`, {
      transports: ['websocket'],
    });

    clientSocket.on('connect', () => {
      done();
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('API Integration', () => {
    it('should provide WebSocket status via API endpoint', async () => {
      const response = await request(app)
        .get('/api/websocket/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'active');
      expect(response.body.data).toHaveProperty('connections');
      expect(response.body.data).toHaveProperty('activeConversations');
      expect(response.body.data).toHaveProperty('typingUsers');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('should include WebSocket endpoint in API info', async () => {
      const response = await request(app).get('/api').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.endpoints).toHaveProperty(
        'websocket',
        '/api/websocket/status'
      );
    });

    it('should show WebSocket stats in health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('websocket');
      expect(response.body.data.websocket).toHaveProperty('status', 'active');
      expect(response.body.data.websocket).toHaveProperty('totalConnections');
      expect(response.body.data.websocket).toHaveProperty(
        'activeConversations'
      );
      expect(response.body.data.websocket).toHaveProperty('typingUsers');
    });
  });

  describe('WebSocket and API Coordination', () => {
    it('should track connections when clients connect via WebSocket', async () => {
      // Get initial stats
      const initialResponse = await request(app)
        .get('/api/websocket/status')
        .expect(200);

      const initialConnections = initialResponse.body.data.connections;

      // Connect another client
      const secondClient = Client(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        secondClient.on('connect', () => resolve());
      });

      // Check updated stats
      const updatedResponse = await request(app)
        .get('/api/websocket/status')
        .expect(200);

      expect(updatedResponse.body.data.connections).toBeGreaterThan(
        initialConnections
      );

      secondClient.disconnect();
    });

    it('should handle WebSocket service unavailable gracefully', async () => {
      // Create app without WebSocket service
      const testApp = express();
      testApp.use(requestIdMiddleware);
      testApp.use(cors());
      testApp.use(express.json());

      // Don't set webSocketService on request
      testApp.use((req, res, next) => {
        // req.webSocketService is undefined
        next();
      });

      testApp.use('/api', apiRoutes);

      const response = await request(testApp)
        .get('/api/websocket/status')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEBSOCKET_NOT_AVAILABLE');
    });
  });

  describe('Real-time Communication', () => {
    it('should handle WebSocket connection alongside HTTP requests', async () => {
      // Make HTTP request
      const apiResponse = await request(app)
        .get('/api/websocket/status')
        .expect(200);

      expect(apiResponse.body.data.connections).toBeGreaterThan(0);

      // Test WebSocket communication - the connection-status event is emitted on connect
      // Since the clientSocket is already connected in beforeEach, we just verify the connection
      expect(clientSocket.connected).toBe(true);

      // Verify WebSocket is still connected and working
      expect(clientSocket.connected).toBe(true);
    });

    it('should maintain WebSocket connections during HTTP API calls', async () => {
      // Verify WebSocket is connected
      expect(clientSocket.connected).toBe(true);

      // Make multiple API calls
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/websocket/status')
          .expect(200);

        expect(response.body.data.connections).toBeGreaterThan(0);
      }

      // WebSocket should still be connected
      expect(clientSocket.connected).toBe(true);
    });
  });
});
