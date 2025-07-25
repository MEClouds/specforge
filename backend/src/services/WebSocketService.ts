import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ConversationOrchestrator } from './ConversationOrchestrator';
import { DatabaseService } from './DatabaseService';
import {
  PersonaRole,
  ConversationContext,
  ConversationPhase,
} from '../types/ai';
import { PersonaRole as PrismaPersonaRole } from '@prisma/client';
import { PERSONA_CONFIGS } from '../config/personas';

export interface WebSocketEvents {
  // Client to Server events
  'join-conversation': { conversationId: string };
  'send-message': { conversationId: string; message: string };
  'request-ai-response': {
    conversationId: string;
    context: ConversationContext;
  };
  'typing-start': { conversationId: string };
  'typing-stop': { conversationId: string };

  // Server to Client events
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

export class WebSocketService {
  private io: SocketIOServer;
  private conversationOrchestrator: ConversationOrchestrator;
  private databaseService: DatabaseService;
  private activeConnections: Map<string, Set<string>> = new Map(); // conversationId -> socketIds
  private typingUsers: Map<string, Set<string>> = new Map(); // conversationId -> socketIds

  // Helper function to convert PersonaRole to Prisma PersonaRole
  private convertPersonaRole(role: PersonaRole): PrismaPersonaRole {
    const roleMap: Record<PersonaRole, PrismaPersonaRole> = {
      [PersonaRole.PRODUCT_MANAGER]: PrismaPersonaRole.PRODUCT_MANAGER,
      [PersonaRole.TECH_LEAD]: PrismaPersonaRole.TECH_LEAD,
      [PersonaRole.UX_DESIGNER]: PrismaPersonaRole.UX_DESIGNER,
      [PersonaRole.DEVOPS]: PrismaPersonaRole.DEVOPS,
      [PersonaRole.SCRUM_MASTER]: PrismaPersonaRole.SCRUM_MASTER,
    };
    return roleMap[role];
  }

  constructor(
    httpServer: HTTPServer,
    conversationOrchestrator: ConversationOrchestrator,
    databaseService: DatabaseService
  ) {
    this.conversationOrchestrator = conversationOrchestrator;
    this.databaseService = databaseService;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Send connection status
      socket.emit('connection-status', { status: 'connected' });

      // Handle joining a conversation
      socket.on('join-conversation', async ({ conversationId }) => {
        try {
          // Verify conversation exists
          const conversation =
            await this.databaseService.getConversation(conversationId);
          if (!conversation) {
            socket.emit('error', {
              message: 'Conversation not found',
              code: 'CONVERSATION_NOT_FOUND',
            });
            return;
          }

          // Join the conversation room
          socket.join(conversationId);

          // Track active connection
          if (!this.activeConnections.has(conversationId)) {
            this.activeConnections.set(conversationId, new Set());
          }
          this.activeConnections.get(conversationId)!.add(socket.id);

          console.log(
            `👥 Socket ${socket.id} joined conversation ${conversationId}`
          );

          // Send conversation status update
          socket.emit('conversation-updated', {
            conversationId,
            phase:
              conversation.status === 'COMPLETED'
                ? ConversationPhase.SPECIFICATION_GENERATION
                : ConversationPhase.INITIAL_DISCOVERY,
            activePersonas: [],
          });
        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', {
            message: 'Failed to join conversation',
            code: 'JOIN_CONVERSATION_ERROR',
          });
        }
      });

      // Handle user messages
      socket.on('send-message', async ({ conversationId, message }) => {
        try {
          // Save user message to database
          const userMessage = await this.databaseService.addMessage({
            conversationId,
            content: message,
            messageType: 'USER',
          });

          // Broadcast message to all clients in the conversation
          this.io.to(conversationId).emit('message-received', {
            id: userMessage.id,
            conversationId,
            content: message,
            messageType: 'user',
            timestamp: userMessage.createdAt,
          });

          console.log(
            `💬 User message in conversation ${conversationId}: ${message.substring(0, 50)}...`
          );
        } catch (error) {
          console.error('Error handling user message:', error);
          socket.emit('error', {
            message: 'Failed to send message',
            code: 'SEND_MESSAGE_ERROR',
          });
        }
      });

      // Handle AI response requests
      socket.on('request-ai-response', async ({ conversationId, context }) => {
        try {
          // Get the latest user message
          const conversation =
            await this.databaseService.getConversation(conversationId);
          if (!conversation || !conversation.messages.length) {
            socket.emit('error', {
              message: 'No messages found in conversation',
              code: 'NO_MESSAGES_FOUND',
            });
            return;
          }

          const latestMessage =
            conversation.messages[conversation.messages.length - 1];
          if (latestMessage.messageType !== 'USER') {
            return; // Don't respond to AI messages
          }

          // Build conversation context
          const conversationContext: ConversationContext = {
            conversationId,
            appIdea: conversation.appIdea,
            targetUsers: conversation.targetUsers,
            complexity: conversation.complexity
              ? (conversation.complexity.toLowerCase() as
                  | 'simple'
                  | 'moderate'
                  | 'complex')
              : 'moderate',
            currentPhase:
              context.currentPhase || ConversationPhase.INITIAL_DISCOVERY,
            activePersonas: context.activePersonas || [
              PersonaRole.PRODUCT_MANAGER,
            ],
            previousMessages: conversation.messages.map((msg) => ({
              id: msg.id,
              content: msg.content,
              persona: msg.personaRole as PersonaRole,
              timestamp: msg.createdAt,
              type:
                msg.messageType === 'USER'
                  ? ('user' as const)
                  : ('ai' as const),
              tokens: msg.tokens || undefined,
              processingTimeMs: msg.processingTimeMs || undefined,
            })),
          };

          // Orchestrate AI conversation
          const result =
            await this.conversationOrchestrator.orchestrateConversation(
              conversationContext,
              latestMessage.content
            );

          // Process each AI response
          for (const aiResponse of result.responses) {
            const personaConfig = PERSONA_CONFIGS[aiResponse.persona];

            // Show typing indicator
            this.io.to(conversationId).emit('ai-typing-start', {
              persona: aiResponse.persona,
              personaName: personaConfig.name,
            });

            // Simulate typing delay based on response length
            const typingDelay = Math.min(
              Math.max(aiResponse.content.length * 20, 1000),
              5000
            );
            await new Promise((resolve) => setTimeout(resolve, typingDelay));

            // Save AI message to database
            const aiMessage = await this.databaseService.addMessage({
              conversationId,
              personaId: aiResponse.persona,
              personaName: personaConfig.name,
              personaRole: this.convertPersonaRole(aiResponse.persona),
              content: aiResponse.content,
              messageType: 'AI',
              tokens: aiResponse.tokens,
              processingTimeMs: aiResponse.processingTimeMs,
            });

            // Stop typing indicator
            this.io.to(conversationId).emit('ai-typing-end', {
              persona: aiResponse.persona,
              personaName: personaConfig.name,
            });

            // Broadcast AI response
            this.io.to(conversationId).emit('ai-response', {
              id: aiMessage.id,
              conversationId,
              content: aiResponse.content,
              persona: aiResponse.persona,
              personaName: personaConfig.name,
              tokens: aiResponse.tokens || 0,
              processingTimeMs: aiResponse.processingTimeMs || 0,
              timestamp: aiMessage.createdAt,
            });

            console.log(
              `🤖 AI response from ${personaConfig.name} in conversation ${conversationId}`
            );
          }

          // Update conversation status if needed
          if (result.nextPhase) {
            this.io.to(conversationId).emit('conversation-updated', {
              conversationId,
              phase: result.nextPhase,
              activePersonas: result.responses.map((r) => r.persona),
            });
          }

          // Check if specifications should be generated
          if (result.isComplete) {
            this.io.to(conversationId).emit('specifications-ready', {
              conversationId,
            });
          }
        } catch (error) {
          console.error('Error handling AI response request:', error);
          socket.emit('error', {
            message: 'Failed to generate AI response',
            code: 'AI_RESPONSE_ERROR',
          });
        }
      });

      // Handle typing indicators
      socket.on('typing-start', ({ conversationId }) => {
        if (!this.typingUsers.has(conversationId)) {
          this.typingUsers.set(conversationId, new Set());
        }
        this.typingUsers.get(conversationId)!.add(socket.id);

        // Broadcast to other users in the conversation
        socket.to(conversationId).emit('user-typing', {
          conversationId,
          isTyping: true,
        });
      });

      socket.on('typing-stop', ({ conversationId }) => {
        if (this.typingUsers.has(conversationId)) {
          this.typingUsers.get(conversationId)!.delete(socket.id);

          // If no one is typing, broadcast stop
          if (this.typingUsers.get(conversationId)!.size === 0) {
            socket.to(conversationId).emit('user-typing', {
              conversationId,
              isTyping: false,
            });
          }
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);

        // Clean up active connections
        for (const [
          conversationId,
          socketIds,
        ] of this.activeConnections.entries()) {
          if (socketIds.has(socket.id)) {
            socketIds.delete(socket.id);
            if (socketIds.size === 0) {
              this.activeConnections.delete(conversationId);
            }
          }
        }

        // Clean up typing indicators
        for (const [conversationId, socketIds] of this.typingUsers.entries()) {
          if (socketIds.has(socket.id)) {
            socketIds.delete(socket.id);
            if (socketIds.size === 0) {
              // Broadcast typing stop if this was the last typing user
              this.io.to(conversationId).emit('user-typing', {
                conversationId,
                isTyping: false,
              });
              this.typingUsers.delete(conversationId);
            }
          }
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });

    console.log('🚀 WebSocket server initialized');
  }

  // Public methods for external use
  public broadcastToConversation(
    conversationId: string,
    event: string,
    data: any
  ): void {
    this.io.to(conversationId).emit(event, data);
  }

  public getActiveConnections(conversationId: string): number {
    return this.activeConnections.get(conversationId)?.size || 0;
  }

  public isConversationActive(conversationId: string): boolean {
    return (
      this.activeConnections.has(conversationId) &&
      this.activeConnections.get(conversationId)!.size > 0
    );
  }

  public async broadcastSpecificationReady(
    conversationId: string
  ): Promise<void> {
    this.io.to(conversationId).emit('specifications-ready', {
      conversationId,
    });
  }

  public getConnectionStats(): {
    totalConnections: number;
    activeConversations: number;
    typingUsers: number;
  } {
    const totalConnections = this.io.engine.clientsCount;
    const activeConversations = this.activeConnections.size;
    const typingUsers = Array.from(this.typingUsers.values()).reduce(
      (sum, set) => sum + set.size,
      0
    );

    return {
      totalConnections,
      activeConversations,
      typingUsers,
    };
  }

  public close(): void {
    this.io.close();
    console.log('🔌 WebSocket server closed');
  }
}
