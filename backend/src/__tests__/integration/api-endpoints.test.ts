import request from 'supertest';
import { app } from '../../index';
import { DatabaseService } from '../../services/DatabaseService';
import { AIService } from '../../services/AIService';

// Mock the services
jest.mock('../../services/DatabaseService');
jest.mock('../../services/AIService');

const mockDatabaseService = DatabaseService as jest.MockedClass<
  typeof DatabaseService
>;
const mockAIService = AIService as jest.MockedClass<typeof AIService>;

describe('API Endpoints Integration', () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/conversations', () => {
    it('creates a new conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        description: 'Test description',
        status: 'active',
        appIdea: 'A task management app',
        targetUsers: ['developers'],
        complexity: 'moderate',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabaseService.prototype.createConversation.mockResolvedValue(
        mockConversation
      );

      const response = await request(app)
        .post('/api/conversations')
        .send({
          title: 'Test Conversation',
          appIdea: 'A task management app',
          targetUsers: ['developers'],
          complexity: 'moderate',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockConversation);
      expect(
        mockDatabaseService.prototype.createConversation
      ).toHaveBeenCalledWith({
        title: 'Test Conversation',
        appIdea: 'A task management app',
        targetUsers: ['developers'],
        complexity: 'moderate',
      });
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .send({
          title: 'Test Conversation',
          // Missing appIdea
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('appIdea is required');
    });

    it('handles database errors', async () => {
      mockDatabaseService.prototype.createConversation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/conversations')
        .send({
          title: 'Test Conversation',
          appIdea: 'A task management app',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Internal server error');
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('retrieves conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        messages: [],
        specifications: [],
      };

      mockDatabaseService.prototype.getConversation.mockResolvedValue(
        mockConversation
      );

      const response = await request(app)
        .get('/api/conversations/conv-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockConversation);
    });

    it('returns 404 for non-existent conversation', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/conversations/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Conversation not found');
    });
  });

  describe('POST /api/conversations/:id/messages', () => {
    it('adds message and generates AI response', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello',
        type: 'user',
        createdAt: new Date(),
      };

      const mockAIResponse = {
        id: 'msg-2',
        conversationId: 'conv-1',
        content: 'Hello! How can I help you?',
        type: 'ai',
        persona: 'product-manager',
        createdAt: new Date(),
      };

      mockDatabaseService.prototype.addMessage.mockResolvedValueOnce(
        mockMessage
      );
      mockDatabaseService.prototype.addMessage.mockResolvedValueOnce(
        mockAIResponse
      );
      mockAIService.prototype.generateResponse.mockResolvedValue({
        content: 'Hello! How can I help you?',
        persona: 'product-manager',
        tokens: 50,
        processingTimeMs: 1000,
      });

      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .send({
          content: 'Hello',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toEqual(mockMessage);
      expect(response.body.data.aiResponse).toEqual(mockAIResponse);
    });

    it('handles AI service errors gracefully', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello',
        type: 'user',
        createdAt: new Date(),
      };

      mockDatabaseService.prototype.addMessage.mockResolvedValue(mockMessage);
      mockAIService.prototype.generateResponse.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .send({
          content: 'Hello',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toEqual(mockMessage);
      expect(response.body.data.aiResponse).toBeNull();
      expect(response.body.data.error).toContain(
        'AI service temporarily unavailable'
      );
    });
  });

  describe('POST /api/specifications/generate', () => {
    it('generates specifications successfully', async () => {
      const mockSpecification = {
        id: 'spec-1',
        conversationId: 'conv-1',
        requirements: '# Requirements\n\nTest requirements',
        design: '# Design\n\nTest design',
        tasks: '# Tasks\n\nTest tasks',
        createdAt: new Date(),
      };

      mockDatabaseService.prototype.createSpecification.mockResolvedValue(
        mockSpecification
      );

      const response = await request(app)
        .post('/api/specifications/generate')
        .send({
          conversationId: 'conv-1',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSpecification);
    });

    it('validates conversation exists', async () => {
      mockDatabaseService.prototype.getConversation.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/specifications/generate')
        .send({
          conversationId: 'non-existent',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Conversation not found');
    });
  });

  describe('GET /api/specifications/:conversationId/download', () => {
    it('downloads specifications as ZIP', async () => {
      const mockSpecification = {
        requirements: '# Requirements\n\nTest requirements',
        design: '# Design\n\nTest design',
        tasks: '# Tasks\n\nTest tasks',
      };

      mockDatabaseService.prototype.getSpecification.mockResolvedValue(
        mockSpecification
      );

      const response = await request(app)
        .get('/api/specifications/conv-1/download')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/zip');
      expect(response.headers['content-disposition']).toContain(
        'specifications.zip'
      );
    });

    it('returns 404 when specifications not found', async () => {
      mockDatabaseService.prototype.getSpecification.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/specifications/non-existent/download')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('handles malformed JSON', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid JSON');
    });

    it('handles large payloads', async () => {
      const largePayload = {
        title: 'Test',
        appIdea: 'A'.repeat(10000), // Very large string
      };

      const response = await request(app)
        .post('/api/conversations')
        .send(largePayload)
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Payload too large');
    });

    it('handles rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app).post('/api/conversations').send({
            title: 'Test',
            appIdea: 'Test app',
          })
        );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS', () => {
    it('includes CORS headers', async () => {
      const response = await request(app)
        .options('/api/conversations')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('returns health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.services).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('allows anonymous access to public endpoints', async () => {
      await request(app).get('/api/health').expect(200);

      await request(app)
        .post('/api/conversations')
        .send({
          title: 'Test',
          appIdea: 'Test app',
        })
        .expect(201);
    });

    it('validates API keys for protected endpoints', async () => {
      const response = await request(app).post('/api/admin/reset').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Unauthorized');
    });
  });

  describe('Content Negotiation', () => {
    it('returns JSON by default', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('handles unsupported content types', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Content-Type', 'text/plain')
        .send('plain text')
        .expect(415);

      expect(response.body.error.message).toContain('Unsupported Media Type');
    });
  });
});
