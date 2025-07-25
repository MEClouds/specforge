import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketService } from '../services/WebSocketService';
import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import { DatabaseService } from '../services/DatabaseService';
import { AIService } from '../services/AIService';
import { PersonaRole, ConversationPhase } from '../types/ai';

describe('WebSocketService', () => {
  let httpServer: HTTPServer;
  let webSocketService: WebSocketService;
  let clientSocket: ClientSocket;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockConversationOrchestrator: jest.Mocked<ConversationOrchestrator>;
  let mockAIService: jest.Mocked<AIService>;

  const TEST_PORT = 3002;
  const TEST_CONVERSATION_ID = 'test-conversation-123';

  beforeAll((done) => {
    // Create HTTP server
    httpServer = new HTTPServer();

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
      healthCheck: jest.fn(),
      getConversation: jest.fn(),
      addMessage: jest.fn(),
      createConversation: jest.fn(),
      createSpecification: jest.fn(),
    } as any;

    // Initialize WebSocket service
    webSocketService = new WebSocketService(
      httpServer,
      mockConversationOrchestrator,
      mockDatabaseService
    );

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

  describe('Connection Management', () => {
    it('should handle client connection and emit connection status', (done) => {
      clientSocket.on('connection-status', (data) => {
        expect(data.status).toBe('connected');
        done();
      });
    });

    it('should handle client disconnection', (done) => {
      clientSocket.on('connect', () => {
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });

    it('should track active connections', () => {
      const stats = webSocketService.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThan(0);
    });
  });

  describe('Conversation Management', () => {
    beforeEach(() => {
      // Mock conversation data
      mockDatabaseService.getConversation.mockResolvedValue({
        id: TEST_CONVERSATION_ID,
        title: 'Test Conversation',
        appIdea: 'Test app idea',
        targetUsers: ['developers'],
        complexity: 'moderate',
        status: 'active',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    });

    it('should handle joining a conversation', (done) => {
      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      clientSocket.on('conversation-updated', (data) => {
        expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
        expect(data.phase).toBeDefined();
        expect(data.activePersonas).toEqual([]);
        done();
      });
    });

    it('should handle joining non-existent conversation', (done) => {
      mockDatabaseService.getConversation.mockResolvedValue(null);

      clientSocket.emit('join-conversation', {
        conversationId: 'non-existent',
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Conversation not found');
        expect(error.code).toBe('CONVERSATION_NOT_FOUND');
        done();
      });
    });

    it('should track conversation activity', async () => {
      // Mock successful conversation join
      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      // Wait a bit for the join to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(webSocketService.isConversationActive(TEST_CONVERSATION_ID)).toBe(
        true
      );
      expect(webSocketService.getActiveConnections(TEST_CONVERSATION_ID)).toBe(
        1
      );
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      // Setup conversation
      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      // Wait for join to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mock message creation
      mockDatabaseService.addMessage.mockResolvedValue({
        id: 'message-123',
        conversationId: TEST_CONVERSATION_ID,
        content: 'Test message',
        messageType: 'USER',
        createdAt: new Date(),
      } as any);
    });

    it('should handle user messages', (done) => {
      const testMessage = 'Hello, I want to build a chat app';

      clientSocket.emit('send-message', {
        conversationId: TEST_CONVERSATION_ID,
        message: testMessage,
      });

      clientSocket.on('message-received', (data) => {
        expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
        expect(data.content).toBe(testMessage);
        expect(data.messageType).toBe('user');
        expect(data.id).toBe('message-123');
        done();
      });
    });

    it('should save user messages to database', (done) => {
      const testMessage = 'Test message for database';

      clientSocket.emit('send-message', {
        conversationId: TEST_CONVERSATION_ID,
        message: testMessage,
      });

      setTimeout(() => {
        expect(mockDatabaseService.addMessage).toHaveBeenCalledWith({
          conversationId: TEST_CONVERSATION_ID,
          content: testMessage,
          messageType: 'USER',
        });
        done();
      }, 100);
    });
  });

  describe('AI Response Handling', () => {
    beforeEach(async () => {
      // Setup conversation with messages
      mockDatabaseService.getConversation.mockResolvedValue({
        id: TEST_CONVERSATION_ID,
        title: 'Test Conversation',
        appIdea: 'Test app idea',
        targetUsers: ['developers'],
        complexity: 'moderate',
        status: 'active',
        messages: [
          {
            id: 'msg-1',
            content: 'I want to build a chat app',
            messageType: 'USER',
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock orchestrator response
      mockConversationOrchestrator.orchestrateConversation.mockResolvedValue({
        responses: [
          {
            content: 'Great idea! Let me ask some clarifying questions...',
            persona: PersonaRole.PRODUCT_MANAGER,
            tokens: 50,
            processingTimeMs: 1000,
          },
        ],
        nextPhase: ConversationPhase.BUSINESS_REQUIREMENTS,
        isComplete: false,
        suggestedActions: ['Define target users'],
      });

      // Mock AI message creation
      mockDatabaseService.addMessage.mockResolvedValue({
        id: 'ai-message-123',
        conversationId: TEST_CONVERSATION_ID,
        content: 'Great idea! Let me ask some clarifying questions...',
        messageType: 'AI',
        personaRole: PersonaRole.PRODUCT_MANAGER,
        createdAt: new Date(),
      } as any);

      // Join conversation
      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should handle AI response requests', (done) => {
      let typingStartReceived = false;
      let typingEndReceived = false;

      clientSocket.on('ai-typing-start', (data) => {
        expect(data.persona).toBe(PersonaRole.PRODUCT_MANAGER);
        expect(data.personaName).toBeDefined();
        typingStartReceived = true;
      });

      clientSocket.on('ai-typing-end', (data) => {
        expect(data.persona).toBe(PersonaRole.PRODUCT_MANAGER);
        expect(data.personaName).toBeDefined();
        typingEndReceived = true;
      });

      clientSocket.on('ai-response', (data) => {
        expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
        expect(data.content).toBe(
          'Great idea! Let me ask some clarifying questions...'
        );
        expect(data.persona).toBe(PersonaRole.PRODUCT_MANAGER);
        expect(data.tokens).toBe(50);
        expect(data.processingTimeMs).toBe(1000);
        expect(typingStartReceived).toBe(true);
        expect(typingEndReceived).toBe(true);
        done();
      });

      clientSocket.emit('request-ai-response', {
        conversationId: TEST_CONVERSATION_ID,
        context: {
          currentPhase: ConversationPhase.INITIAL_DISCOVERY,
          activePersonas: [PersonaRole.PRODUCT_MANAGER],
        },
      });
    });

    it('should handle conversation phase transitions', (done) => {
      clientSocket.on('conversation-updated', (data) => {
        if (data.phase === ConversationPhase.BUSINESS_REQUIREMENTS) {
          expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
          expect(data.activePersonas).toContain(PersonaRole.PRODUCT_MANAGER);
          done();
        }
      });

      clientSocket.emit('request-ai-response', {
        conversationId: TEST_CONVERSATION_ID,
        context: {
          currentPhase: ConversationPhase.INITIAL_DISCOVERY,
          activePersonas: [PersonaRole.PRODUCT_MANAGER],
        },
      });
    });

    it('should handle conversation completion', (done) => {
      // Mock completed conversation
      mockConversationOrchestrator.orchestrateConversation.mockResolvedValue({
        responses: [
          {
            content:
              'All tasks have been defined. Ready to generate specifications.',
            persona: PersonaRole.SCRUM_MASTER,
            tokens: 30,
            processingTimeMs: 800,
          },
        ],
        nextPhase: ConversationPhase.SPECIFICATION_GENERATION,
        isComplete: true,
        suggestedActions: ['Generate specifications'],
      });

      clientSocket.on('specifications-ready', (data) => {
        expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
        done();
      });

      clientSocket.emit('request-ai-response', {
        conversationId: TEST_CONVERSATION_ID,
        context: {
          currentPhase: ConversationPhase.TASK_PLANNING,
          activePersonas: [PersonaRole.SCRUM_MASTER],
        },
      });
    });
  });

  describe('Typing Indicators', () => {
    beforeEach(async () => {
      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should handle typing start and stop', (done) => {
      let typingStartReceived = false;

      // Create second client to receive typing indicators
      const secondClient = Client(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket'],
      });

      secondClient.on('connect', () => {
        secondClient.emit('join-conversation', {
          conversationId: TEST_CONVERSATION_ID,
        });
      });

      secondClient.on('user-typing', (data) => {
        if (data.isTyping && !typingStartReceived) {
          expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
          typingStartReceived = true;

          // Stop typing
          clientSocket.emit('typing-stop', {
            conversationId: TEST_CONVERSATION_ID,
          });
        } else if (!data.isTyping && typingStartReceived) {
          expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
          secondClient.disconnect();
          done();
        }
      });

      // Start typing
      clientSocket.emit('typing-start', {
        conversationId: TEST_CONVERSATION_ID,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', (done) => {
      mockDatabaseService.getConversation.mockRejectedValue(
        new Error('Database connection failed')
      );

      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Failed to join conversation');
        expect(error.code).toBe('JOIN_CONVERSATION_ERROR');
        done();
      });
    });

    it('should handle AI service errors gracefully', (done) => {
      // Setup conversation
      mockDatabaseService.getConversation.mockResolvedValue({
        id: TEST_CONVERSATION_ID,
        messages: [
          {
            id: 'msg-1',
            content: 'Test message',
            messageType: 'USER',
            createdAt: new Date(),
          },
        ],
        appIdea: 'Test app',
        targetUsers: ['users'],
        complexity: 'moderate',
      } as any);

      mockConversationOrchestrator.orchestrateConversation.mockRejectedValue(
        new Error('AI service unavailable')
      );

      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      setTimeout(() => {
        clientSocket.emit('request-ai-response', {
          conversationId: TEST_CONVERSATION_ID,
          context: {
            currentPhase: ConversationPhase.INITIAL_DISCOVERY,
            activePersonas: [PersonaRole.PRODUCT_MANAGER],
          },
        });
      }, 100);

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Failed to generate AI response');
        expect(error.code).toBe('AI_RESPONSE_ERROR');
        done();
      });
    });
  });

  describe('Public Methods', () => {
    it('should broadcast to conversation', (done) => {
      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      clientSocket.on('test-broadcast', (data) => {
        expect(data.message).toBe('Test broadcast');
        done();
      });

      setTimeout(() => {
        webSocketService.broadcastToConversation(
          TEST_CONVERSATION_ID,
          'test-broadcast',
          { message: 'Test broadcast' }
        );
      }, 100);
    });

    it('should broadcast specification ready', (done) => {
      clientSocket.emit('join-conversation', {
        conversationId: TEST_CONVERSATION_ID,
      });

      clientSocket.on('specifications-ready', (data) => {
        expect(data.conversationId).toBe(TEST_CONVERSATION_ID);
        done();
      });

      setTimeout(async () => {
        await webSocketService.broadcastSpecificationReady(
          TEST_CONVERSATION_ID
        );
      }, 100);
    });

    it('should provide connection statistics', () => {
      const stats = webSocketService.getConnectionStats();
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConversations');
      expect(stats).toHaveProperty('typingUsers');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.activeConversations).toBe('number');
      expect(typeof stats.typingUsers).toBe('number');
    });
  });
});
