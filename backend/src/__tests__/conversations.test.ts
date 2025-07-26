import request from 'supertest';
import express from 'express';
import conversationRoutes from '../routes/conversations';
import { databaseService } from '../services/DatabaseService';
import { ConversationStatus, Complexity } from '@prisma/client';

// Mock the database service
jest.mock('../services/DatabaseService', () => ({
  databaseService: {
    createConversation: jest.fn(),
    getConversation: jest.fn(),
    getConversations: jest.fn(),
    updateConversation: jest.fn(),
    deleteConversation: jest.fn(),
  },
}));

const mockDatabaseService = databaseService as any;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/conversations', conversationRoutes);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message,
      timestamp: new Date().toISOString(),
      requestId: 'test-request-id',
    },
  });
});

describe('Conversation Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/conversations', () => {
    it('should create a conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: null,
        title: 'Test App',
        description: 'A test application',
        status: ConversationStatus.ACTIVE,
        appIdea: 'Build a todo app',
        targetUsers: ['developers', 'students'],
        complexity: Complexity.SIMPLE,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        messages: [],
        specifications: [],
      };

      mockDatabaseService.createConversation.mockResolvedValue(
        mockConversation
      );

      const response = await request(app)
        .post('/api/conversations')
        .send({
          title: 'Test App',
          description: 'A test application',
          appIdea: 'Build a todo app',
          targetUsers: ['developers', 'students'],
          complexity: 'SIMPLE',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation.id).toBe('conv-123');
      expect(response.body.data.conversation.title).toBe('Test App');
      expect(response.body.data.conversation.messageCount).toBe(0);
      expect(response.body.data.conversation.specificationCount).toBe(0);

      expect(mockDatabaseService.createConversation).toHaveBeenCalledWith({
        title: 'Test App',
        description: 'A test application',
        appIdea: 'Build a todo app',
        targetUsers: ['developers', 'students'],
        complexity: Complexity.SIMPLE,
        userId: undefined,
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .send({
          title: '',
          appIdea: 'Build a todo app',
          targetUsers: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(2); // title and targetUsers
    });

    it('should handle database errors', async () => {
      mockDatabaseService.createConversation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/conversations')
        .send({
          title: 'Test App',
          appIdea: 'Build a todo app',
          targetUsers: ['developers'],
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('should get a conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: null,
        title: 'Test App',
        description: 'A test application',
        status: ConversationStatus.ACTIVE,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        complexity: Complexity.SIMPLE,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        messages: [
          {
            id: 'msg-123',
            conversationId: 'conv-123',
            personaId: 'pm-1',
            personaName: 'Product Manager',
            personaRole: 'PRODUCT_MANAGER',
            content: 'Hello!',
            messageType: 'AI',
            tokens: 10,
            processingTimeMs: 500,
            context: null,
            createdAt: new Date('2024-01-01T00:00:00Z'),
          },
        ],
        specifications: [
          {
            id: 'spec-123',
            conversationId: 'conv-123',
            requirements: 'Requirements content',
            design: 'Design content',
            tasks: 'Tasks content',
            version: 1,
            totalTokens: 1000,
            generationTimeMs: 5000,
            fileSizeBytes: 2048,
            generatedAt: new Date('2024-01-01T00:00:00Z'),
          },
        ],
      };

      mockDatabaseService.getConversation.mockResolvedValue(mockConversation);

      const response = await request(app)
        .get('/api/conversations/conv-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation.id).toBe('conv-123');
      expect(response.body.data.conversation.messages).toHaveLength(1);
      expect(response.body.data.conversation.specifications).toHaveLength(1);
      expect(response.body.data.conversation.messageCount).toBe(1);
      expect(response.body.data.conversation.specificationCount).toBe(1);

      expect(mockDatabaseService.getConversation).toHaveBeenCalledWith(
        'conv-123'
      );
    });

    it('should return 404 for non-existent conversation', async () => {
      mockDatabaseService.getConversation.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/conversations/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockDatabaseService.getConversation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/conversations/conv-123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/conversations', () => {
    it('should get conversations list with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 'conv-1',
            userId: null,
            title: 'App 1',
            description: null,
            status: ConversationStatus.ACTIVE,
            appIdea: 'First app',
            targetUsers: ['users'],
            complexity: Complexity.SIMPLE,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
            _count: {
              messages: 5,
              specifications: 1,
            },
          },
          {
            id: 'conv-2',
            userId: null,
            title: 'App 2',
            description: 'Second app description',
            status: ConversationStatus.COMPLETED,
            appIdea: 'Second app',
            targetUsers: ['developers'],
            complexity: Complexity.MODERATE,
            createdAt: new Date('2024-01-02T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            _count: {
              messages: 10,
              specifications: 2,
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockDatabaseService.getConversations.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/api/conversations?page=1&limit=20&status=ACTIVE')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.conversations[0].messageCount).toBe(5);
      expect(response.body.data.conversations[1].specificationCount).toBe(2);

      expect(mockDatabaseService.getConversations).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: ConversationStatus.ACTIVE,
      });
    });

    it('should use default pagination values', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockDatabaseService.getConversations.mockResolvedValue(mockResponse);

      await request(app).get('/api/conversations').expect(200);

      expect(mockDatabaseService.getConversations).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/conversations?page=0&limit=101&status=INVALID')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(3); // page, limit, status
    });
  });

  describe('PATCH /api/conversations/:id', () => {
    it('should update conversation status', async () => {
      const mockUpdatedConversation = {
        id: 'conv-123',
        userId: null,
        title: 'Test App',
        description: 'A test application',
        status: ConversationStatus.COMPLETED,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        complexity: Complexity.SIMPLE,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T01:00:00Z'),
        _count: {
          messages: 5,
          specifications: 1,
        },
      };

      mockDatabaseService.updateConversation.mockResolvedValue(
        mockUpdatedConversation
      );

      const response = await request(app)
        .patch('/api/conversations/conv-123')
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation.status).toBe('COMPLETED');
      expect(response.body.data.conversation.messageCount).toBe(5);
      expect(response.body.data.conversation.specificationCount).toBe(1);

      expect(mockDatabaseService.updateConversation).toHaveBeenCalledWith(
        'conv-123',
        {
          status: ConversationStatus.COMPLETED,
          title: undefined,
          description: undefined,
        }
      );
    });

    it('should update conversation title and description', async () => {
      const mockUpdatedConversation = {
        id: 'conv-123',
        userId: null,
        title: 'Updated App',
        description: 'Updated description',
        status: ConversationStatus.ACTIVE,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        complexity: Complexity.SIMPLE,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T01:00:00Z'),
        _count: {
          messages: 5,
          specifications: 1,
        },
      };

      mockDatabaseService.updateConversation.mockResolvedValue(
        mockUpdatedConversation
      );

      const response = await request(app)
        .patch('/api/conversations/conv-123')
        .send({
          title: 'Updated App',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation.title).toBe('Updated App');
      expect(response.body.data.conversation.description).toBe(
        'Updated description'
      );

      expect(mockDatabaseService.updateConversation).toHaveBeenCalledWith(
        'conv-123',
        {
          status: undefined,
          title: 'Updated App',
          description: 'Updated description',
        }
      );
    });

    it('should return 404 for non-existent conversation', async () => {
      mockDatabaseService.updateConversation.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/conversations/nonexistent')
        .send({ status: 'COMPLETED' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .patch('/api/conversations/conv-123')
        .send({
          status: 'INVALID_STATUS',
          title: '', // Empty title
          description: 'x'.repeat(1001), // Too long description
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(3); // status, title, description
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    it('should delete conversation successfully', async () => {
      mockDatabaseService.deleteConversation.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/conversations/conv-123')
        .expect(204);

      expect(response.body).toEqual({});
      expect(mockDatabaseService.deleteConversation).toHaveBeenCalledWith(
        'conv-123'
      );
    });

    it('should return 404 for non-existent conversation', async () => {
      mockDatabaseService.deleteConversation.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/conversations/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONVERSATION_NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockDatabaseService.deleteConversation.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .delete('/api/conversations/conv-123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
