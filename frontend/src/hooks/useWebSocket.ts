import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import webSocketService, {
  type WebSocketCallbacks,
  type ConnectionStatus,
  type ConversationContext,
  PersonaRole,
  ConversationPhase,
} from '../services/WebSocketService';
import type { ChatMessage } from '../types';

export interface UseWebSocketOptions {
  conversationId?: string;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  sendMessage: (message: string) => void;
  requestAIResponse: (context?: Partial<ConversationContext>) => void;
  startTyping: () => void;
  stopTyping: () => void;
  joinConversation: (conversationId: string) => void;
  reconnect: () => void;
}

export const useWebSocket = (
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const { conversationId, autoConnect = true } = options;

  const {
    addMessage,
    setTyping,
    setError,
    setIsGenerating,
    conversation,
    setActivePersonas,
  } = useAppStore();

  const connectionStatusRef = useRef<ConnectionStatus>('disconnected');
  const isConnectedRef = useRef(false);

  // Update refs when connection status changes
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    connectionStatusRef.current = status;
    isConnectedRef.current = status === 'connected';
  }, []);

  // WebSocket event callbacks - memoized to prevent recreation
  const callbacks = useMemo(
    (): WebSocketCallbacks => ({
      onMessageReceived: (message: ChatMessage) => {
        console.log('📨 Message received:', message);
        addMessage(message);
      },

      onAITypingStart: (_persona: PersonaRole, personaName: string) => {
        console.log('⌨️ AI typing start:', personaName);
        setTyping(true, _persona);
        setIsGenerating(true);
      },

      onAITypingEnd: (_persona: PersonaRole, personaName: string) => {
        console.log('⌨️ AI typing end:', personaName);
        setTyping(false);
      },

      onAIResponse: (message: ChatMessage) => {
        console.log('🤖 AI response:', message);
        addMessage(message);
        setIsGenerating(false);
        setTyping(false);
      },

      onConversationUpdated: (data: {
        conversationId: string;
        phase: ConversationPhase;
        activePersonas: PersonaRole[];
      }) => {
        console.log('🔄 Conversation updated:', data);
        // Convert PersonaRole[] to AIPersona[]
        const personas = data.activePersonas.map((role: PersonaRole) =>
          webSocketService.convertPersonaRoleToPersona(role)
        );
        setActivePersonas(personas);
      },

      onSpecificationsReady: (conversationId: string) => {
        console.log(
          '📋 Specifications ready for conversation:',
          conversationId
        );
        // Could trigger a notification or redirect to specs view
        setIsGenerating(false);
      },

      onUserTyping: (conversationId: string, isTyping: boolean) => {
        console.log('👤 User typing:', { conversationId, isTyping });
        // Could show typing indicator for other users in multi-user scenarios
      },

      onError: (error: { message: string; code?: string }) => {
        console.error('❌ WebSocket error:', error);
        setError(error.message);
        setIsGenerating(false);
        setTyping(false);
      },

      onConnectionStatusChange: (status: ConnectionStatus) => {
        console.log('🔌 Connection status changed:', status);
        updateConnectionStatus(status);

        if (status === 'disconnected') {
          setError('Connection lost. Attempting to reconnect...');
          setIsGenerating(false);
          setTyping(false);
        } else if (status === 'connected') {
          setError(null);
        } else if (status === 'reconnecting') {
          setError('Reconnecting...');
        }
      },
    }),
    [
      addMessage,
      setTyping,
      setError,
      setIsGenerating,
      setActivePersonas,
      updateConnectionStatus,
    ]
  );

  // Initialize WebSocket callbacks
  useEffect(() => {
    if (autoConnect) {
      webSocketService.setCallbacks(callbacks);
      updateConnectionStatus(webSocketService.getConnectionStatus());
    }

    return () => {
      // Cleanup on unmount
      if (conversationId) {
        webSocketService.stopTyping(conversationId);
      }
    };
  }, [autoConnect, conversationId, callbacks, updateConnectionStatus]);

  // Auto-join conversation when conversationId changes
  useEffect(() => {
    if (conversationId && webSocketService.isConnected()) {
      webSocketService.joinConversation(conversationId);
    }
  }, [conversationId]);

  // Public methods
  const sendMessage = useCallback(
    (message: string) => {
      if (!conversationId) {
        console.warn('Cannot send message: No conversation ID');
        return;
      }

      if (!webSocketService.isConnected()) {
        setError('Not connected to server');
        return;
      }

      webSocketService.sendMessage(conversationId, message);
    },
    [conversationId, setError]
  );

  const requestAIResponse = useCallback(
    (contextOverrides: Partial<ConversationContext> = {}) => {
      if (!conversationId) {
        console.warn('Cannot request AI response: No conversation ID');
        return;
      }

      if (!webSocketService.isConnected()) {
        setError('Not connected to server');
        return;
      }

      const currentConversation = conversation.current;
      if (!currentConversation) {
        console.warn('Cannot request AI response: No current conversation');
        return;
      }

      // Build context from current conversation state
      const context: ConversationContext = {
        conversationId,
        appIdea: currentConversation.appIdea,
        targetUsers: currentConversation.targetUsers,
        complexity: currentConversation.complexity || 'moderate',
        currentPhase: ConversationPhase.INITIAL_DISCOVERY,
        activePersonas: [PersonaRole.PRODUCT_MANAGER],
        ...contextOverrides,
      };

      setIsGenerating(true);
      webSocketService.requestAIResponse(conversationId, context);
    },
    [conversationId, conversation, setError, setIsGenerating]
  );

  const startTyping = useCallback(() => {
    if (conversationId && webSocketService.isConnected()) {
      webSocketService.startTyping(conversationId);
    }
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (conversationId && webSocketService.isConnected()) {
      webSocketService.stopTyping(conversationId);
    }
  }, [conversationId]);

  const joinConversation = useCallback((newConversationId: string) => {
    if (webSocketService.isConnected()) {
      webSocketService.joinConversation(newConversationId);
    }
  }, []);

  const reconnect = useCallback(() => {
    webSocketService.reconnect();
  }, []);

  return {
    connectionStatus: connectionStatusRef.current,
    isConnected: isConnectedRef.current,
    sendMessage,
    requestAIResponse,
    startTyping,
    stopTyping,
    joinConversation,
    reconnect,
  };
};
