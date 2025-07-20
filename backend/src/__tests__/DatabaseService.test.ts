// Mock Prisma Client before importing DatabaseService
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  conversation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  specification: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

// Now import DatabaseService after mocking
import { DatabaseService } from '../services/DatabaseService';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    databaseService = new DatabaseService();
  });

  afterEach(async () => {
    await databaseService.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to database successfully', async () => {
      mockPrismaClient.$connect.mockResolvedValue(undefined);

      await expect(databaseService.connect()).resolves.not.toThrow();
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValue(error);

      await expect(databaseService.connect()).rejects.toThrow(
        'Failed to connect to database: Error: Connection failed'
      );
    });

    it('should disconnect from database', async () => {
      mockPrismaClient.$disconnect.mockResolvedValue(undefined);

      await expect(databaseService.disconnect()).resolves.not.toThrow();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
    });

    it('should perform health check successfully', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await databaseService.healthCheck();
      expect(result).toBe(true);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });

    it('should handle health check failure', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Database error'));

      const result = await databaseService.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('Conversation Operations', () => {
    const mockConversation = {
      id: 'conv-1',
      userId: 'user-1',
      title: 'Test Conversation',
      description: 'Test Description',
      status: 'ACTIVE',
      appIdea: 'Test app idea',
      targetUsers: ['developers'],
      complexity: 'SIMPLE',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      specifications: [],
    };

    it('should create a conversation successfully', async () => {
      mockPrismaClient.conversation.create.mockResolvedValue(mockConversation);

      const data = {
        userId: 'user-1',
        title: 'Test Conversation',
        description: 'Test Description',
        appIdea: 'Test app idea',
        targetUsers: ['developers'],
        complexity: 'SIMPLE' as const,
      };

      const result = await databaseService.createConversation(data);

      expect(result).toEqual(mockConversation);
      expect(mockPrismaClient.conversation.create).toHaveBeenCalledWith({
        data,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          specifications: {
            orderBy: { version: 'desc' },
          },
        },
      });
    });

    it('should handle conversation creation errors', async () => {
      const error = new Error('Database error');
      mockPrismaClient.conversation.create.mockRejectedValue(error);

      const data = {
        title: 'Test Conversation',
        appIdea: 'Test app idea',
        targetUsers: ['developers'],
      };

      await expect(databaseService.createConversation(data)).rejects.toThrow(
        'Failed to create conversation: Error: Database error'
      );
    });

    it('should get a conversation by id', async () => {
      mockPrismaClient.conversation.findUnique.mockResolvedValue(
        mockConversation
      );

      const result = await databaseService.getConversation('conv-1');

      expect(result).toEqual(mockConversation);
      expect(mockPrismaClient.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          specifications: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });
    });

    it('should return null for non-existent conversation', async () => {
      mockPrismaClient.conversation.findUnique.mockResolvedValue(null);

      const result = await databaseService.getConversation('non-existent');

      expect(result).toBeNull();
    });

    it('should update a conversation', async () => {
      const updatedConversation = {
        ...mockConversation,
        title: 'Updated Title',
      };
      mockPrismaClient.conversation.update.mockResolvedValue(
        updatedConversation
      );

      const updateData = { title: 'Updated Title' };
      const result = await databaseService.updateConversation(
        'conv-1',
        updateData
      );

      expect(result).toEqual(updatedConversation);
      expect(mockPrismaClient.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should delete a conversation', async () => {
      mockPrismaClient.conversation.delete.mockResolvedValue(mockConversation);

      await expect(
        databaseService.deleteConversation('conv-1')
      ).resolves.not.toThrow();
      expect(mockPrismaClient.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      });
    });
  });

  describe('Message Operations', () => {
    const mockMessage = {
      id: 'msg-1',
      conversationId: 'conv-1',
      personaId: 'persona-1',
      personaName: 'Product Manager',
      personaRole: 'PRODUCT_MANAGER',
      content: 'Test message',
      messageType: 'AI',
      tokens: 100,
      processingTimeMs: 500,
      context: { test: true },
      createdAt: new Date(),
    };

    it('should add a message successfully', async () => {
      mockPrismaClient.message.create.mockResolvedValue(mockMessage);
      mockPrismaClient.conversation.update.mockResolvedValue({} as any);

      const data = {
        conversationId: 'conv-1',
        personaId: 'persona-1',
        personaName: 'Product Manager',
        personaRole: 'PRODUCT_MANAGER' as const,
        content: 'Test message',
        messageType: 'AI' as const,
        tokens: 100,
        processingTimeMs: 500,
        context: { test: true },
      };

      const result = await databaseService.addMessage(data);

      expect(result).toEqual(mockMessage);
      expect(mockPrismaClient.message.create).toHaveBeenCalledWith({ data });
      expect(mockPrismaClient.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('should get messages for a conversation', async () => {
      const mockMessages = [mockMessage];
      mockPrismaClient.message.findMany.mockResolvedValue(mockMessages);

      const result = await databaseService.getMessages('conv-1');

      expect(result).toEqual(mockMessages);
      expect(mockPrismaClient.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'asc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should get a single message', async () => {
      mockPrismaClient.message.findUnique.mockResolvedValue(mockMessage);

      const result = await databaseService.getMessage('msg-1');

      expect(result).toEqual(mockMessage);
      expect(mockPrismaClient.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
      });
    });

    it('should delete a message', async () => {
      mockPrismaClient.message.delete.mockResolvedValue(mockMessage);

      await expect(
        databaseService.deleteMessage('msg-1')
      ).resolves.not.toThrow();
      expect(mockPrismaClient.message.delete).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
      });
    });
  });

  describe('Specification Operations', () => {
    const mockSpecification = {
      id: 'spec-1',
      conversationId: 'conv-1',
      requirements: '# Requirements',
      design: '# Design',
      tasks: '# Tasks',
      version: 1,
      totalTokens: 1000,
      generationTimeMs: 5000,
      fileSizeBytes: 2048,
      generatedAt: new Date(),
    };

    it('should create a specification with version 1', async () => {
      mockPrismaClient.specification.findFirst.mockResolvedValue(null); // No existing specs
      mockPrismaClient.specification.create.mockResolvedValue(
        mockSpecification
      );

      const data = {
        conversationId: 'conv-1',
        requirements: '# Requirements',
        design: '# Design',
        tasks: '# Tasks',
        totalTokens: 1000,
        generationTimeMs: 5000,
        fileSizeBytes: 2048,
      };

      const result = await databaseService.createSpecification(data);

      expect(result).toEqual(mockSpecification);
      expect(mockPrismaClient.specification.create).toHaveBeenCalledWith({
        data: {
          ...data,
          version: 1,
        },
      });
    });

    it('should create a specification with incremented version', async () => {
      const existingSpec = { ...mockSpecification, version: 2 };
      const newSpec = { ...mockSpecification, version: 3 };

      mockPrismaClient.specification.findFirst.mockResolvedValue(existingSpec);
      mockPrismaClient.specification.create.mockResolvedValue(newSpec);

      const data = {
        conversationId: 'conv-1',
        requirements: '# Requirements',
        design: '# Design',
        tasks: '# Tasks',
      };

      const result = await databaseService.createSpecification(data);

      expect(result).toEqual(newSpec);
      expect(mockPrismaClient.specification.create).toHaveBeenCalledWith({
        data: {
          ...data,
          version: 3,
        },
      });
    });

    it('should get latest specification', async () => {
      mockPrismaClient.specification.findFirst.mockResolvedValue(
        mockSpecification
      );

      const result = await databaseService.getSpecification('conv-1');

      expect(result).toEqual(mockSpecification);
      expect(mockPrismaClient.specification.findFirst).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
        orderBy: { version: 'desc' },
      });
    });

    it('should get specification by version', async () => {
      mockPrismaClient.specification.findFirst.mockResolvedValue(
        mockSpecification
      );

      const result = await databaseService.getSpecification('conv-1', 1);

      expect(result).toEqual(mockSpecification);
      expect(mockPrismaClient.specification.findFirst).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          version: 1,
        },
      });
    });

    it('should delete a specification', async () => {
      mockPrismaClient.specification.delete.mockResolvedValue(
        mockSpecification
      );

      await expect(
        databaseService.deleteSpecification('spec-1')
      ).resolves.not.toThrow();
      expect(mockPrismaClient.specification.delete).toHaveBeenCalledWith({
        where: { id: 'spec-1' },
      });
    });
  });

  describe('Utility Methods', () => {
    it('should get conversation stats', async () => {
      const mockConversationWithStats = {
        id: 'conv-1',
        messages: [
          { tokens: 100, createdAt: new Date('2023-01-01') },
          { tokens: 200, createdAt: new Date('2023-01-02') },
        ],
        specifications: [{ totalTokens: 500 }, { totalTokens: 300 }],
      };

      mockPrismaClient.conversation.findUnique.mockResolvedValue(
        mockConversationWithStats as any
      );

      const result = await databaseService.getConversationStats('conv-1');

      expect(result).toEqual({
        messageCount: 2,
        specificationCount: 2,
        totalTokens: 1100, // 100 + 200 + 500 + 300
        lastActivity: new Date('2023-01-02'),
      });
    });

    it('should handle conversation not found in stats', async () => {
      mockPrismaClient.conversation.findUnique.mockResolvedValue(null);

      await expect(
        databaseService.getConversationStats('non-existent')
      ).rejects.toThrow(
        'Failed to get conversation stats: Error: Conversation not found'
      );
    });

    it('should handle empty conversation in stats', async () => {
      const mockEmptyConversation = {
        id: 'conv-1',
        messages: [],
        specifications: [],
      };

      mockPrismaClient.conversation.findUnique.mockResolvedValue(
        mockEmptyConversation as any
      );

      const result = await databaseService.getConversationStats('conv-1');

      expect(result).toEqual({
        messageCount: 0,
        specificationCount: 0,
        totalTokens: 0,
        lastActivity: null,
      });
    });
  });
});
