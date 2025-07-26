import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { conversationService } from '../ConversationService';

// Mock fetch globally
globalThis.fetch = vi.fn();
const mockFetch = fetch as Mock;

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-request-id'),
  },
});

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    import.meta.env.VITE_API_URL = 'http://localhost:3001';
  });

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          conversation: {
            id: 'conv-123',
            title: 'Test App',
            description: 'A test application',
            status: 'active',
            appIdea: 'Build a todo app',
            targetUsers: ['developers', 'students'],
            complexity: 'SIMPLE',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            messageCount: 0,
            specificationCount: 0,
          },
        },
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'test-request-id',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await conversationService.createConversation({
        title: 'Test App',
        description: 'A test application',
        appIdea: 'Build a todo app',
        targetUsers: ['developers', 'students'],
        complexity: 'simple',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/conversations',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'test-request-id',
          },
          body: JSON.stringify({
            title: 'Test App',
            description: 'A test application',
            appIdea: 'Build a todo app',
            targetUsers: ['developers', 'students'],
            complexity: 'SIMPLE',
          }),
        }
      );

      expect(result).toEqual({
        id: 'conv-123',
        title: 'Test App',
        description: 'A test application',
        status: 'active',
        appIdea: 'Build a todo app',
        targetUsers: ['developers', 'students'],
        complexity: 'simple',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });
    });

    it('should handle API errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'test-request-id',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      });

      await expect(
        conversationService.createConversation({
          title: '',
          appIdea: 'Build a todo app',
          targetUsers: ['developers'],
        })
      ).rejects.toThrow('Invalid request data');
    });
  });

  describe('getConversation', () => {
    it('should get a conversation with messages', async () => {
      const mockResponse = {
        success: true,
        data: {
          conversation: {
            id: 'conv-123',
            title: 'Test App',
            status: 'active',
            appIdea: 'Build a todo app',
            targetUsers: ['developers'],
            complexity: 'SIMPLE',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            messageCount: 1,
            specificationCount: 0,
            messages: [
              {
                id: 'msg-123',
                personaId: 'pm-1',
                personaName: 'Product Manager',
                personaRole: 'PRODUCT_MANAGER',
                content: 'Hello!',
                messageType: 'AI',
                createdAt: '2024-01-01T00:00:00Z',
              },
            ],
            specifications: [],
          },
        },
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'test-request-id',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await conversationService.getConversation('conv-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/conversations/conv-123',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'test-request-id',
          },
        }
      );

      expect(result.conversation.id).toBe('conv-123');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].persona?.name).toBe('Product Manager');
      expect(result.messages[0].type).toBe('ai');
    });

    it('should handle conversation not found', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found',
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'test-request-id',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      });

      await expect(
        conversationService.getConversation('nonexistent')
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('getConversations', () => {
    it('should get conversations list with pagination', async () => {
      const mockResponse = {
        success: true,
        data: {
          conversations: [
            {
              id: 'conv-1',
              title: 'App 1',
              status: 'active',
              appIdea: 'First app',
              targetUsers: ['users'],
              complexity: 'SIMPLE',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              messageCount: 5,
              specificationCount: 1,
            },
            {
              id: 'conv-2',
              title: 'App 2',
              status: 'completed',
              appIdea: 'Second app',
              targetUsers: ['developers'],
              complexity: 'MODERATE',
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
              messageCount: 10,
              specificationCount: 2,
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        },
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'test-request-id',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await conversationService.getConversations(
        1,
        20,
        'active'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/conversations?page=1&limit=20&status=active',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'test-request-id',
          },
        }
      );

      expect(result.conversations).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.conversations[0].complexity).toBe('simple');
      expect(result.conversations[1].complexity).toBe('moderate');
    });
  });

  describe('updateConversationStatus', () => {
    it('should update conversation status', async () => {
      const mockResponse = {
        success: true,
        data: {
          conversation: {
            id: 'conv-123',
            title: 'Test App',
            status: 'completed',
            appIdea: 'Build a todo app',
            targetUsers: ['developers'],
            complexity: 'SIMPLE',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T01:00:00Z',
            messageCount: 5,
            specificationCount: 1,
          },
        },
        timestamp: '2024-01-01T01:00:00Z',
        requestId: 'test-request-id',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await conversationService.updateConversationStatus(
        'conv-123',
        'completed'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/conversations/conv-123',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'test-request-id',
          },
          body: JSON.stringify({ status: 'COMPLETED' }),
        }
      );

      expect(result.status).toBe('completed');
      expect(result.updatedAt).toEqual(new Date('2024-01-01T01:00:00Z'));
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await expect(
        conversationService.deleteConversation('conv-123')
      ).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/conversations/conv-123',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'test-request-id',
          },
        }
      );
    });

    it('should handle delete errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found',
          timestamp: '2024-01-01T00:00:00Z',
          requestId: 'test-request-id',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      });

      await expect(
        conversationService.deleteConversation('nonexistent')
      ).rejects.toThrow('Conversation not found');
    });
  });
});
