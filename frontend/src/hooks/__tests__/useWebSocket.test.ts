import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import webSocketService from '../../services/WebSocketService';

// Mock the WebSocket service
vi.mock('../../services/WebSocketService', async () => {
  const actual = await vi.importActual('../../services/WebSocketService');
  return {
    ...actual,
    default: {
      setCallbacks: vi.fn(),
      getConnectionStatus: vi.fn(() => 'disconnected'),
      isConnected: vi.fn(() => false),
      joinConversation: vi.fn(),
      sendMessage: vi.fn(),
      requestAIResponse: vi.fn(),
      startTyping: vi.fn(),
      stopTyping: vi.fn(),
      reconnect: vi.fn(),
      convertPersonaRoleToPersona: vi.fn(),
    },
  };
});

// Mock the store
vi.mock('../../store', () => ({
  useAppStore: vi.fn(() => ({
    addMessage: vi.fn(),
    setTyping: vi.fn(),
    setError: vi.fn(),
    setIsGenerating: vi.fn(),
    conversation: {
      current: {
        id: 'test-conversation',
        appIdea: 'Test app',
        targetUsers: ['developers'],
        complexity: 'moderate',
      },
    },
    setActivePersonas: vi.fn(),
  })),
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(webSocketService.setCallbacks).toHaveBeenCalled();
    });

    it('should join conversation when conversationId is provided', () => {
      const conversationId = 'test-conversation';
      (webSocketService.isConnected as any).mockReturnValue(true);

      renderHook(() => useWebSocket({ conversationId }));

      expect(webSocketService.joinConversation).toHaveBeenCalledWith(
        conversationId
      );
    });
  });

  describe('Message Handling', () => {
    it('should send message when connected', () => {
      const conversationId = 'test-conversation';
      (webSocketService.isConnected as any).mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket({ conversationId }));

      act(() => {
        result.current.sendMessage('Hello, world!');
      });

      expect(webSocketService.sendMessage).toHaveBeenCalledWith(
        conversationId,
        'Hello, world!'
      );
    });

    it('should not send message when no conversation ID', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.sendMessage('Hello, world!');
      });

      expect(webSocketService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('AI Response Handling', () => {
    it('should request AI response with context', () => {
      const conversationId = 'test-conversation';
      (webSocketService.isConnected as any).mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket({ conversationId }));

      act(() => {
        result.current.requestAIResponse();
      });

      expect(webSocketService.requestAIResponse).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          conversationId,
          appIdea: 'Test app',
          targetUsers: ['developers'],
          complexity: 'moderate',
        })
      );
    });
  });

  describe('Typing Indicators', () => {
    it('should start typing when connected', () => {
      const conversationId = 'test-conversation';
      (webSocketService.isConnected as any).mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket({ conversationId }));

      act(() => {
        result.current.startTyping();
      });

      expect(webSocketService.startTyping).toHaveBeenCalledWith(conversationId);
    });

    it('should stop typing when connected', () => {
      const conversationId = 'test-conversation';
      (webSocketService.isConnected as any).mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket({ conversationId }));

      act(() => {
        result.current.stopTyping();
      });

      expect(webSocketService.stopTyping).toHaveBeenCalledWith(conversationId);
    });
  });

  describe('Connection Management', () => {
    it('should reconnect when requested', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.reconnect();
      });

      expect(webSocketService.reconnect).toHaveBeenCalled();
    });

    it('should join conversation when method is called', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.joinConversation('new-conversation');
      });

      expect(webSocketService.joinConversation).toHaveBeenCalledWith(
        'new-conversation'
      );
    });
  });
});
