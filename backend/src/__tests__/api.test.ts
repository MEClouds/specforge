import request from 'supertest';
import express from 'express';
import { databaseService } from '../services/DatabaseService';
import apiRoutes from '../routes';
import {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
} from '../middleware/errorHandler';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

describe('API Integration Tests', () => {
  let app: express.Application;
  let testConversationId: string;

  beforeAll(async () => {
    app = createTestApp();
    await databaseService.connect();
  });

  afterAll(async () => {
    // Clean up test data
    if (testConversationId) {
      try {
        await databaseService.deleteConversation(testConversationId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    await databaseService.disconnect();
  });

  describe('API Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          name: 'SpecForge API',
          version: '1.0.0',
          description: 'AI-powered specification generation service',
          endpoints: expect.any(Object),
        },
        timestamp: expect.any(String),
        requestId: expect.any(String),
      });
    });
  });

  describe('Conversation Endpoints', () => {
    describe('POST /api/conversations', () => {
      it('should create a new conversation with valid data', async () => {
        const conversationData = {
          title: 'Test App Specification',
          description: 'A test application for unit testing',
          appIdea:
            'I want to build a simple todo application that allows users to create, edit, and delete tasks with due dates and priorities.',
          targetUsers: ['developers', 'project managers'],
          complexity: 'SIMPLE',
          userId: 'test-user-123',
        };

        const response = await request(app)
          .post('/api/conversations')
          .send(conversationData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            conversation: {
              id: expect.any(String),
              title: conversationData.title,
              description: conversationData.description,
              status: 'ACTIVE',
              appIdea: conversationData.appIdea,
              targetUsers: conversationData.targetUsers,
              complexity: conversationData.complexity,
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
              messageCount: 0,
              specificationCount: 0,
            },
          },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });

        // Store for cleanup and further tests
        testConversationId = response.body.data.conversation.id;
      });

      it('should create a conversation without optional fields', async () => {
        const conversationData = {
          title: 'Minimal Test App',
          appIdea:
            'A minimal application for testing purposes with basic functionality.',
          targetUsers: ['testers'],
        };

        const response = await request(app)
          .post('/api/conversations')
          .send(conversationData)
          .expect(201);

        expect(response.body.data.conversation).toMatchObject({
          title: conversationData.title,
          appIdea: conversationData.appIdea,
          targetUsers: conversationData.targetUsers,
          description: null,
          complexity: null,
        });

        // Clean up
        await databaseService.deleteConversation(
          response.body.data.conversation.id
        );
      });

      it('should return validation error for missing required fields', async () => {
        const invalidData = {
          title: 'Test App',
          // Missing appIdea and targetUsers
        };

        const response = await request(app)
          .post('/api/conversations')
          .send(invalidData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: expect.any(Array),
            timestamp: expect.any(String),
            requestId: expect.any(String),
          },
        });

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              msg: expect.stringContaining('App idea'),
            }),
            expect.objectContaining({
              msg: expect.stringContaining('Target users'),
            }),
          ])
        );
      });

      it('should return validation error for invalid complexity', async () => {
        const invalidData = {
          title: 'Test App',
          appIdea: 'A test application with invalid complexity level.',
          targetUsers: ['users'],
          complexity: 'INVALID_COMPLEXITY',
        };

        const response = await request(app)
          .post('/api/conversations')
          .send(invalidData)
          .expect(400);

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              msg: expect.stringContaining('Complexity must be one of'),
            }),
          ])
        );
      });

      it('should return validation error for empty target users array', async () => {
        const invalidData = {
          title: 'Test App',
          appIdea: 'A test application with empty target users.',
          targetUsers: [],
        };

        const response = await request(app)
          .post('/api/conversations')
          .send(invalidData)
          .expect(400);

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              msg: expect.stringContaining(
                'Target users must be a non-empty array'
              ),
            }),
          ])
        );
      });
    });

    describe('GET /api/conversations/:id', () => {
      it('should retrieve an existing conversation', async () => {
        const response = await request(app)
          .get(`/api/conversations/${testConversationId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            conversation: {
              id: testConversationId,
              title: expect.any(String),
              status: 'ACTIVE',
              appIdea: expect.any(String),
              targetUsers: expect.any(Array),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
              messageCount: expect.any(Number),
              specificationCount: expect.any(Number),
              messages: expect.any(Array),
              specifications: expect.any(Array),
            },
          },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });
      });

      it('should return 404 for non-existent conversation', async () => {
        const nonExistentId = 'non-existent-id-123';

        const response = await request(app)
          .get(`/api/conversations/${nonExistentId}`)
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
            timestamp: expect.any(String),
            requestId: expect.any(String),
          },
        });
      });

      it('should return validation error for empty conversation ID', async () => {
        const response = await request(app)
          .get('/api/conversations/')
          .expect(404);

        expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
      });
    });
  });

  describe('Message Endpoints', () => {
    describe('POST /api/conversations/:conversationId/messages', () => {
      it('should add a user message to conversation', async () => {
        const messageData = {
          content: 'Hello, I would like to discuss my app idea in more detail.',
          messageType: 'USER',
        };

        const response = await request(app)
          .post(`/api/conversations/${testConversationId}/messages`)
          .send(messageData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            message: {
              id: expect.any(String),
              conversationId: testConversationId,
              content: messageData.content,
              messageType: messageData.messageType,
              personaId: null,
              personaName: null,
              personaRole: null,
              tokens: null,
              processingTimeMs: null,
              context: null,
              createdAt: expect.any(String),
            },
          },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });
      });

      it('should add an AI message with persona information', async () => {
        const messageData = {
          content:
            'That sounds like an interesting project! Let me ask you a few questions to better understand your requirements.',
          messageType: 'AI',
          personaId: 'pm-001',
          personaName: 'Sarah Chen',
          personaRole: 'PRODUCT_MANAGER',
          tokens: 45,
          processingTimeMs: 1200,
          context: { temperature: 0.7, model: 'gpt-4' },
        };

        const response = await request(app)
          .post(`/api/conversations/${testConversationId}/messages`)
          .send(messageData)
          .expect(201);

        expect(response.body.data.message).toMatchObject({
          content: messageData.content,
          messageType: messageData.messageType,
          personaId: messageData.personaId,
          personaName: messageData.personaName,
          personaRole: messageData.personaRole,
          tokens: messageData.tokens,
          processingTimeMs: messageData.processingTimeMs,
          context: messageData.context,
        });
      });

      it('should return validation error for AI message without persona info', async () => {
        const invalidMessageData = {
          content: 'This is an AI message without proper persona information.',
          messageType: 'AI',
          // Missing personaName and personaRole
        };

        const response = await request(app)
          .post(`/api/conversations/${testConversationId}/messages`)
          .send(invalidMessageData)
          .expect(400);

        expect(response.body.error.message).toContain(
          'AI messages must include personaName and personaRole'
        );
      });

      it('should return 404 for non-existent conversation', async () => {
        const messageData = {
          content: 'Test message',
          messageType: 'USER',
        };

        const response = await request(app)
          .post('/api/conversations/non-existent-id/messages')
          .send(messageData)
          .expect(404);

        expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
      });

      it('should return validation error for invalid message type', async () => {
        const invalidMessageData = {
          content: 'Test message',
          messageType: 'INVALID_TYPE',
        };

        const response = await request(app)
          .post(`/api/conversations/${testConversationId}/messages`)
          .send(invalidMessageData)
          .expect(400);

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              msg: expect.stringContaining(
                'Message type must be either USER or AI'
              ),
            }),
          ])
        );
      });

      it('should return validation error for empty content', async () => {
        const invalidMessageData = {
          content: '',
          messageType: 'USER',
        };

        const response = await request(app)
          .post(`/api/conversations/${testConversationId}/messages`)
          .send(invalidMessageData)
          .expect(400);

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              msg: expect.stringContaining(
                'Content must be a string between 1 and 10000 characters'
              ),
            }),
          ])
        );
      });
    });

    describe('GET /api/conversations/:conversationId/messages', () => {
      it('should retrieve messages for a conversation', async () => {
        const response = await request(app)
          .get(`/api/conversations/${testConversationId}/messages`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            messages: expect.any(Array),
            pagination: {
              limit: null,
              offset: 0,
              total: expect.any(Number),
            },
          },
          timestamp: expect.any(String),
          requestId: expect.any(String),
        });

        // Should have at least the messages we created in previous tests
        expect(response.body.data.messages.length).toBeGreaterThan(0);

        // Check message structure
        if (response.body.data.messages.length > 0) {
          const message = response.body.data.messages[0];
          expect(message).toMatchObject({
            id: expect.any(String),
            conversationId: testConversationId,
            content: expect.any(String),
            messageType: expect.stringMatching(/^(USER|AI)$/),
            createdAt: expect.any(String),
          });
        }
      });

      it('should retrieve messages with pagination', async () => {
        const response = await request(app)
          .get(`/api/conversations/${testConversationId}/messages`)
          .query({ limit: 1, offset: 0 })
          .expect(200);

        expect(response.body.data.pagination).toMatchObject({
          limit: 1,
          offset: 0,
          total: expect.any(Number),
        });

        expect(response.body.data.messages.length).toBeLessThanOrEqual(1);
      });

      it('should return 404 for non-existent conversation', async () => {
        const response = await request(app)
          .get('/api/conversations/non-existent-id/messages')
          .expect(404);

        expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
      });

      it('should return validation error for invalid pagination parameters', async () => {
        const response = await request(app)
          .get(`/api/conversations/${testConversationId}/messages`)
          .query({ limit: 0, offset: -1 })
          .expect(400);

        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining(
            'Route GET /api/non-existent-endpoint not found'
          ),
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });
    });

    it('should include request ID in all responses', async () => {
      const customRequestId = 'test-request-123';

      const response = await request(app)
        .get('/api')
        .set('X-Request-ID', customRequestId)
        .expect(200);

      expect(response.body.requestId).toBe(customRequestId);
      expect(response.headers['x-request-id']).toBe(customRequestId);
    });

    it('should generate request ID if not provided', async () => {
      const response = await request(app).get('/api').expect(200);

      expect(response.body.requestId).toBeDefined();
      expect(response.body.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});
