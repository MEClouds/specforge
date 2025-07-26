import { describe, it, expect, beforeEach, vi } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useConversation } from '../useConversation';
import { conversationService } from '../../services/ConversationService';
import { useAppStore } from '../../store';

// Mock the conversation service
vi.mock('../../services/ConversationService', () => ({
  conversationService: {
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    getConversations: vi.fn(),
    updateConversationStatus: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));

// Mock the store
vi.mock('../../store', () => ({
  useAppStore: vi.fn(),
}));

const mockConversationService = conversationService as any;

const mockUseAppStore = useAppStore as unknown;

describe('useConversation', () => {
  const mockStoreActions = {
    setCurrentConversation: vi.fn(),
    setMessages: vi.fn(),
    setConversationList: vi.fn(),
    addConversationToList: vi.fn(),
    updateConversationInList: vi.fn(),
    removeConversationFromList: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
  };

  const mockStoreState = {
    conversation: {
      current: null,
      list: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppStore.mockReturnValue({
      ...mockStoreState,
      ...mockStoreActions,
    });
  });

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test App',
        description: 'A test app',
        status: 'active' as const,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        complexity: 'simple' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationService.createConversation.mockResolvedValue(
        mockConversation
      );

      const { result } = renderHook(() => useConversation());

      let createdConversation;
      await act(async () => {
        createdConversation = await result.current.createConversation({
          title: 'Test App',
          description: 'A test app',
          appIdea: 'Build a todo app',
          targetUsers: ['developers'],
          complexity: 'simple',
        });
      });

      expect(mockConversationService.createConversation).toHaveBeenCalledWith({
        title: 'Test App',
        description: 'A test app',
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        complexity: 'simple',
      });

      expect(mockStoreActions.addConversationToList).toHaveBeenCalledWith({
        ...mockConversation,
        messageCount: 0,
        specificationCount: 0,
      });

      expect(mockStoreActions.setCurrentConversation).toHaveBeenCalledWith(
        mockConversation
      );
      expect(mockStoreActions.setMessages).toHaveBeenCalledWith([]);
      expect(createdConversation).toEqual(mockConversation);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create conversation');
      mockConversationService.createConversation.mockRejectedValue(error);

      const { result } = renderHook(() => useConversation());

      let createdConversation;
      await act(async () => {
        createdConversation = await result.current.createConversation({
          title: 'Test App',
          appIdea: 'Build a todo app',
          targetUsers: ['developers'],
        });
      });

      expect(mockStoreActions.setError).toHaveBeenCalledWith(
        'Failed to create conversation'
      );
      expect(createdConversation).toBeNull();
    });
  });

  describe('loadConversation', () => {
    it('should load a conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test App',
        status: 'active' as const,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          persona: null,
          content: 'Hello',
          timestamp: new Date(),
          type: 'user' as const,
        },
      ];

      mockConversationService.getConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: mockMessages,
        specifications: [],
      });

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.loadConversation('conv-123');
      });

      expect(mockConversationService.getConversation).toHaveBeenCalledWith(
        'conv-123'
      );
      expect(mockStoreActions.setCurrentConversation).toHaveBeenCalledWith(
        mockConversation
      );
      expect(mockStoreActions.setMessages).toHaveBeenCalledWith(mockMessages);
      expect(success).toBe(true);
    });

    it('should handle load errors', async () => {
      const error = new Error('Conversation not found');
      mockConversationService.getConversation.mockRejectedValue(error);

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.loadConversation('nonexistent');
      });

      expect(mockStoreActions.setError).toHaveBeenCalledWith(
        'Conversation not found'
      );
      expect(success).toBe(false);
    });
  });

  describe('loadConversations', () => {
    it('should load conversations list successfully', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'App 1',
          status: 'active' as const,
          appIdea: 'First app',
          targetUsers: ['users'],
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 5,
          specificationCount: 1,
        },
      ];

      const mockPagination = {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      };

      mockConversationService.getConversations.mockResolvedValue({
        conversations: mockConversations,
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.loadConversations(1, 20, 'active');
      });

      expect(mockConversationService.getConversations).toHaveBeenCalledWith(
        1,
        20,
        'active'
      );
      expect(mockStoreActions.setConversationList).toHaveBeenCalledWith(
        mockConversations,
        mockPagination
      );
      expect(success).toBe(true);
    });

    it('should append conversations when append is true', async () => {
      const existingConversations = [
        {
          id: 'conv-1',
          title: 'App 1',
          status: 'active' as const,
          appIdea: 'First app',
          targetUsers: ['users'],
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 5,
          specificationCount: 1,
        },
      ];

      const newConversations = [
        {
          id: 'conv-2',
          title: 'App 2',
          status: 'active' as const,
          appIdea: 'Second app',
          targetUsers: ['users'],
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 3,
          specificationCount: 0,
        },
      ];

      mockUseAppStore.mockReturnValue({
        ...mockStoreState,
        ...mockStoreActions,
        conversation: {
          ...mockStoreState.conversation,
          list: existingConversations,
        },
      });

      mockConversationService.getConversations.mockResolvedValue({
        conversations: newConversations,
        pagination: { page: 2, limit: 20, total: 2, totalPages: 1 },
      });

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.loadConversations(
          2,
          20,
          undefined,
          true
        );
      });

      expect(mockStoreActions.setConversationList).toHaveBeenCalledWith(
        [...existingConversations, ...newConversations],
        { page: 2, limit: 20, total: 2, totalPages: 1 }
      );
      expect(success).toBe(true);
    });
  });

  describe('updateConversationStatus', () => {
    it('should update conversation status successfully', async () => {
      const updatedConversation = {
        id: 'conv-123',
        title: 'Test App',
        status: 'completed' as const,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationService.updateConversationStatus.mockResolvedValue(
        updatedConversation
      );

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.updateConversationStatus(
          'conv-123',
          'completed'
        );
      });

      expect(
        mockConversationService.updateConversationStatus
      ).toHaveBeenCalledWith('conv-123', 'completed');
      expect(mockStoreActions.updateConversationInList).toHaveBeenCalledWith(
        'conv-123',
        updatedConversation
      );
      expect(success).toBe(true);
    });

    it('should update current conversation if it matches', async () => {
      const currentConversation = {
        id: 'conv-123',
        title: 'Test App',
        status: 'active' as const,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedConversation = {
        ...currentConversation,
        status: 'completed' as const,
      };

      mockUseAppStore.mockReturnValue({
        ...mockStoreState,
        ...mockStoreActions,
        conversation: {
          ...mockStoreState.conversation,
          current: currentConversation,
        },
      });

      mockConversationService.updateConversationStatus.mockResolvedValue(
        updatedConversation
      );

      const { result } = renderHook(() => useConversation());

      await act(async () => {
        await result.current.updateConversationStatus('conv-123', 'completed');
      });

      expect(mockStoreActions.setCurrentConversation).toHaveBeenCalledWith(
        updatedConversation
      );
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      mockConversationService.deleteConversation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.deleteConversation('conv-123');
      });

      expect(mockConversationService.deleteConversation).toHaveBeenCalledWith(
        'conv-123'
      );
      expect(mockStoreActions.removeConversationFromList).toHaveBeenCalledWith(
        'conv-123'
      );
      expect(success).toBe(true);
    });

    it('should clear current conversation if it matches deleted one', async () => {
      const currentConversation = {
        id: 'conv-123',
        title: 'Test App',
        status: 'active' as const,
        appIdea: 'Build a todo app',
        targetUsers: ['developers'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUseAppStore.mockReturnValue({
        ...mockStoreState,
        ...mockStoreActions,
        conversation: {
          ...mockStoreState.conversation,
          current: currentConversation,
        },
      });

      mockConversationService.deleteConversation.mockResolvedValue(undefined);

      const { result } = renderHook(() => useConversation());

      await act(async () => {
        await result.current.deleteConversation('conv-123');
      });

      expect(mockStoreActions.setCurrentConversation).toHaveBeenCalledWith(
        null
      );
      expect(mockStoreActions.setMessages).toHaveBeenCalledWith([]);
    });
  });

  describe('switchConversation', () => {
    it('should switch to a different conversation', async () => {
      const newConversation = {
        id: 'conv-456',
        title: 'New App',
        status: 'active' as const,
        appIdea: 'Build a new app',
        targetUsers: ['users'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-456',
          persona: null,
          content: 'Hello',
          timestamp: new Date(),
          type: 'user' as const,
        },
      ];

      mockConversationService.getConversation.mockResolvedValue({
        conversation: newConversation,
        messages: mockMessages,
        specifications: [],
      });

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.switchConversation(newConversation);
      });

      expect(mockConversationService.getConversation).toHaveBeenCalledWith(
        'conv-456'
      );
      expect(success).toBe(true);
    });

    it('should return true if switching to current conversation', async () => {
      const currentConversation = {
        id: 'conv-123',
        title: 'Current App',
        status: 'active' as const,
        appIdea: 'Current app',
        targetUsers: ['users'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUseAppStore.mockReturnValue({
        ...mockStoreState,
        ...mockStoreActions,
        conversation: {
          ...mockStoreState.conversation,
          current: currentConversation,
        },
      });

      const { result } = renderHook(() => useConversation());

      let success;
      await act(async () => {
        success = await result.current.switchConversation(currentConversation);
      });

      expect(mockConversationService.getConversation).not.toHaveBeenCalled();
      expect(success).toBe(true);
    });
  });

  describe('clearCurrentConversation', () => {
    it('should clear current conversation', async () => {
      const { result } = renderHook(() => useConversation());

      act(() => {
        result.current.clearCurrentConversation();
      });

      expect(mockStoreActions.setCurrentConversation).toHaveBeenCalledWith(
        null
      );
      expect(mockStoreActions.setMessages).toHaveBeenCalledWith([]);
    });
  });
});
