import io from 'socket.io-client';
import type { ChatMessage, AIPersona } from '../types';

// WebSocket event types based on backend implementation
export interface ClientToServerEvents {
  'join-conversation': { conversationId: string };
  'send-message': { conversationId: string; message: string };
  'request-ai-response': {
    conversationId: string;
    context: ConversationContext;
  };
  'typing-start': { conversationId: string };
  'typing-stop': { conversationId: string };
}

export interface ServerToClientEvents {
  'message-received': {
    id: string;
    conversationId: string;
    content: string;
    messageType: 'user' | 'ai';
    persona?: PersonaRole;
    timestamp: Date;
  };
  'ai-typing-start': { persona: PersonaRole; personaName: string };
  'ai-typing-end': { persona: PersonaRole; personaName: string };
  'ai-response': {
    id: string;
    conversationId: string;
    content: string;
    persona: PersonaRole;
    personaName: string;
    tokens: number;
    processingTimeMs: number;
    timestamp: Date;
  };
  'conversation-updated': {
    conversationId: string;
    phase: ConversationPhase;
    activePersonas: PersonaRole[];
  };
  'specifications-ready': { conversationId: string };
  'user-typing': { conversationId: string; isTyping: boolean };
  error: { message: string; code?: string };
  'connection-status': {
    status: 'connected' | 'disconnected' | 'reconnecting';
  };
}

// Types from backend
export enum PersonaRole {
  PRODUCT_MANAGER = 'product-manager',
  TECH_LEAD = 'tech-lead',
  UX_DESIGNER = 'ux-designer',
  DEVOPS = 'devops',
  SCRUM_MASTER = 'scrum-master',
}

export enum ConversationPhase {
  INITIAL_DISCOVERY = 'initial-discovery',
  BUSINESS_REQUIREMENTS = 'business-requirements',
  TECHNICAL_ARCHITECTURE = 'technical-architecture',
  USER_EXPERIENCE = 'user-experience',
  INFRASTRUCTURE = 'infrastructure',
  TASK_PLANNING = 'task-planning',
  SPECIFICATION_GENERATION = 'specification-generation',
}

export interface ConversationContext {
  conversationId: string;
  appIdea: string;
  targetUsers: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
  currentPhase: ConversationPhase;
  activePersonas: PersonaRole[];
}

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'connecting';

export interface WebSocketCallbacks {
  onMessageReceived?: (message: ChatMessage) => void;
  onAITypingStart?: (persona: PersonaRole, personaName: string) => void;
  onAITypingEnd?: (persona: PersonaRole, personaName: string) => void;
  onAIResponse?: (message: ChatMessage) => void;
  onConversationUpdated?: (data: {
    conversationId: string;
    phase: ConversationPhase;
    activePersonas: PersonaRole[];
  }) => void;
  onSpecificationsReady?: (conversationId: string) => void;
  onUserTyping?: (conversationId: string, isTyping: boolean) => void;
  onError?: (error: { message: string; code?: string }) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
}

class WebSocketService {
  private socket: ReturnType<typeof io> | null = null;
  private callbacks: WebSocketCallbacks = {};
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentConversationId: string | null = null;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.setConnectionStatus('connecting');

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;

      // Rejoin conversation if we were in one
      if (this.currentConversationId) {
        this.joinConversation(this.currentConversationId);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.setConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.setConnectionStatus('disconnected');
      this.handleReconnection();
    });

    // Message events
    this.socket.on(
      'message-received',
      (data: ServerToClientEvents['message-received']) => {
        const message: ChatMessage = {
          id: data.id,
          conversationId: data.conversationId,
          persona: data.persona
            ? this.convertPersonaRoleToPersona(data.persona)
            : null,
          content: data.content,
          timestamp: new Date(data.timestamp),
          type: data.messageType,
        };
        this.callbacks.onMessageReceived?.(message);
      }
    );

    this.socket.on(
      'ai-typing-start',
      (data: ServerToClientEvents['ai-typing-start']) => {
        this.callbacks.onAITypingStart?.(data.persona, data.personaName);
      }
    );

    this.socket.on(
      'ai-typing-end',
      (data: ServerToClientEvents['ai-typing-end']) => {
        this.callbacks.onAITypingEnd?.(data.persona, data.personaName);
      }
    );

    this.socket.on(
      'ai-response',
      (data: ServerToClientEvents['ai-response']) => {
        const message: ChatMessage = {
          id: data.id,
          conversationId: data.conversationId,
          persona: this.convertPersonaRoleToPersona(data.persona),
          content: data.content,
          timestamp: new Date(data.timestamp),
          type: 'ai',
        };
        this.callbacks.onAIResponse?.(message);
      }
    );

    // Conversation events
    this.socket.on(
      'conversation-updated',
      (data: ServerToClientEvents['conversation-updated']) => {
        this.callbacks.onConversationUpdated?.(data);
      }
    );

    this.socket.on(
      'specifications-ready',
      (data: ServerToClientEvents['specifications-ready']) => {
        this.callbacks.onSpecificationsReady?.(data.conversationId);
      }
    );

    this.socket.on(
      'user-typing',
      (data: ServerToClientEvents['user-typing']) => {
        this.callbacks.onUserTyping?.(data.conversationId, data.isTyping);
      }
    );

    // Error handling
    this.socket.on('error', (error: ServerToClientEvents['error']) => {
      console.error('🔌 WebSocket error:', error);
      this.callbacks.onError?.(error);
    });

    this.socket.on(
      'connection-status',
      (data: ServerToClientEvents['connection-status']) => {
        this.setConnectionStatus(data.status);
      }
    );
  }

  public convertPersonaRoleToPersona(role: PersonaRole): AIPersona {
    const personaMap: Record<PersonaRole, Omit<AIPersona, 'id'>> = {
      [PersonaRole.PRODUCT_MANAGER]: {
        name: 'Sarah Chen',
        role: 'product-manager',
        avatar: '👩‍💼',
        color: '#3B82F6',
        expertise: ['Product Strategy', 'User Research', 'Market Analysis'],
      },
      [PersonaRole.TECH_LEAD]: {
        name: 'Alex Rodriguez',
        role: 'tech-lead',
        avatar: '👨‍💻',
        color: '#10B981',
        expertise: ['System Architecture', 'Technical Strategy', 'Code Review'],
      },
      [PersonaRole.UX_DESIGNER]: {
        name: 'Maya Patel',
        role: 'ux-designer',
        avatar: '🎨',
        color: '#F59E0B',
        expertise: ['User Experience', 'Interface Design', 'Usability Testing'],
      },
      [PersonaRole.DEVOPS]: {
        name: 'Jordan Kim',
        role: 'devops',
        avatar: '⚙️',
        color: '#EF4444',
        expertise: ['Infrastructure', 'CI/CD', 'Monitoring'],
      },
      [PersonaRole.SCRUM_MASTER]: {
        name: 'Taylor Johnson',
        role: 'scrum-master',
        avatar: '📋',
        color: '#8B5CF6',
        expertise: [
          'Agile Methodology',
          'Team Coordination',
          'Sprint Planning',
        ],
      },
    };

    const persona = personaMap[role];
    return {
      id: role,
      ...persona,
    };
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.callbacks.onConnectionStatusChange?.(status);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached');
      this.callbacks.onError?.({
        message:
          'Unable to connect to server. Please check your connection and try again.',
        code: 'MAX_RECONNECT_ATTEMPTS',
      });
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionStatus('reconnecting');

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    setTimeout(() => {
      console.log(
        `🔌 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      this.connect();
    }, delay);
  }

  // Public methods
  public setCallbacks(callbacks: WebSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('🔌 Cannot join conversation: WebSocket not connected');
      return;
    }

    this.currentConversationId = conversationId;
    this.socket.emit('join-conversation', { conversationId });
    console.log(`👥 Joined conversation: ${conversationId}`);
  }

  public sendMessage(conversationId: string, message: string): void {
    if (!this.socket?.connected) {
      console.warn('🔌 Cannot send message: WebSocket not connected');
      this.callbacks.onError?.({
        message: 'Not connected to server. Please wait for reconnection.',
        code: 'CONNECTION_ERROR',
      });
      return;
    }

    try {
      this.socket.emit('send-message', { conversationId, message });
      console.log('📤 Message sent:', {
        conversationId,
        messageLength: message.length,
      });
    } catch (error) {
      console.error('🔌 Error sending message:', error);
      this.callbacks.onError?.({
        message: 'Failed to send message. Please try again.',
        code: 'SEND_ERROR',
      });
    }
  }

  public requestAIResponse(
    conversationId: string,
    context: ConversationContext
  ): void {
    if (!this.socket?.connected) {
      console.warn('🔌 Cannot request AI response: WebSocket not connected');
      this.callbacks.onError?.({
        message: 'Not connected to server. Please wait for reconnection.',
        code: 'CONNECTION_ERROR',
      });
      return;
    }

    try {
      this.socket.emit('request-ai-response', { conversationId, context });
      console.log('🤖 AI response requested:', {
        conversationId,
        phase: context.currentPhase,
      });
    } catch (error) {
      console.error('🔌 Error requesting AI response:', error);
      this.callbacks.onError?.({
        message: 'Failed to request AI response. Please try again.',
        code: 'AI_REQUEST_ERROR',
      });
    }
  }

  public startTyping(conversationId: string): void {
    if (!this.socket?.connected) return;

    try {
      // Clear any existing timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }

      this.socket.emit('typing-start', { conversationId });

      // Auto-stop typing after 3 seconds of inactivity
      this.typingTimeout = setTimeout(() => {
        this.stopTyping(conversationId);
      }, 3000);
    } catch (error) {
      console.error('🔌 Error starting typing indicator:', error);
    }
  }

  public stopTyping(conversationId: string): void {
    if (!this.socket?.connected) return;

    try {
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }

      this.socket.emit('typing-stop', { conversationId });
    } catch (error) {
      console.error('🔌 Error stopping typing indicator:', error);
    }
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public disconnect(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setConnectionStatus('disconnected');
    this.currentConversationId = null;
  }

  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
