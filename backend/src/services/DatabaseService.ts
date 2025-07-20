import {
  PrismaClient,
  Conversation,
  Message,
  Specification,
  ConversationStatus,
  Complexity,
  MessageType,
  PersonaRole,
} from '@prisma/client';

export interface CreateConversationData {
  userId?: string;
  title: string;
  description?: string;
  appIdea: string;
  targetUsers: string[];
  complexity?: Complexity;
}

export interface CreateMessageData {
  conversationId: string;
  personaId?: string;
  personaName?: string;
  personaRole?: PersonaRole;
  content: string;
  messageType: MessageType;
  tokens?: number;
  processingTimeMs?: number;
  context?: any;
}

export interface CreateSpecificationData {
  conversationId: string;
  requirements: string;
  design: string;
  tasks: string;
  totalTokens?: number;
  generationTimeMs?: number;
  fileSizeBytes?: number;
}

export interface UpdateConversationData {
  title?: string;
  description?: string;
  status?: ConversationStatus;
  complexity?: Complexity;
}

export type ConversationWithRelations = Conversation & {
  messages: Message[];
  specifications: Specification[];
};

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Conversation CRUD operations
  async createConversation(
    data: CreateConversationData
  ): Promise<ConversationWithRelations> {
    try {
      return await this.prisma.conversation.create({
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
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error}`);
    }
  }

  async getConversation(id: string): Promise<ConversationWithRelations | null> {
    try {
      return await this.prisma.conversation.findUnique({
        where: { id },
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
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error}`);
    }
  }

  async getConversations(userId?: string): Promise<Conversation[]> {
    try {
      const where = userId ? { userId } : {};
      return await this.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              messages: true,
              specifications: true,
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to get conversations: ${error}`);
    }
  }

  async updateConversation(
    id: string,
    data: UpdateConversationData
  ): Promise<Conversation> {
    try {
      return await this.prisma.conversation.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw new Error(`Failed to update conversation: ${error}`);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      await this.prisma.conversation.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error(`Failed to delete conversation: ${error}`);
    }
  }

  // Message CRUD operations
  async addMessage(data: CreateMessageData): Promise<Message> {
    try {
      const message = await this.prisma.message.create({
        data,
      });

      // Update conversation's updatedAt timestamp
      await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to add message: ${error}`);
    }
  }

  async getMessages(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<Message[]> {
    try {
      return await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      throw new Error(`Failed to get messages: ${error}`);
    }
  }

  async getMessage(id: string): Promise<Message | null> {
    try {
      return await this.prisma.message.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new Error(`Failed to get message: ${error}`);
    }
  }

  async deleteMessage(id: string): Promise<void> {
    try {
      await this.prisma.message.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error(`Failed to delete message: ${error}`);
    }
  }

  // Specification CRUD operations
  async createSpecification(
    data: CreateSpecificationData
  ): Promise<Specification> {
    try {
      // Get the next version number for this conversation
      const latestSpec = await this.prisma.specification.findFirst({
        where: { conversationId: data.conversationId },
        orderBy: { version: 'desc' },
      });

      const nextVersion = latestSpec ? latestSpec.version + 1 : 1;

      return await this.prisma.specification.create({
        data: {
          ...data,
          version: nextVersion,
        },
      });
    } catch (error) {
      throw new Error(`Failed to create specification: ${error}`);
    }
  }

  async getSpecification(
    conversationId: string,
    version?: number
  ): Promise<Specification | null> {
    try {
      if (version) {
        return await this.prisma.specification.findFirst({
          where: {
            conversationId,
            version,
          },
        });
      }

      // Get latest version if no version specified
      return await this.prisma.specification.findFirst({
        where: { conversationId },
        orderBy: { version: 'desc' },
      });
    } catch (error) {
      throw new Error(`Failed to get specification: ${error}`);
    }
  }

  async getSpecifications(conversationId: string): Promise<Specification[]> {
    try {
      return await this.prisma.specification.findMany({
        where: { conversationId },
        orderBy: { version: 'desc' },
      });
    } catch (error) {
      throw new Error(`Failed to get specifications: ${error}`);
    }
  }

  async deleteSpecification(id: string): Promise<void> {
    try {
      await this.prisma.specification.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error(`Failed to delete specification: ${error}`);
    }
  }

  // Utility methods
  async getConversationStats(conversationId: string): Promise<{
    messageCount: number;
    specificationCount: number;
    totalTokens: number;
    lastActivity: Date | null;
  }> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            select: {
              tokens: true,
              createdAt: true,
            },
          },
          specifications: {
            select: {
              totalTokens: true,
            },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messageCount = conversation.messages.length;
      const specificationCount = conversation.specifications.length;
      const totalTokens =
        conversation.messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0) +
        conversation.specifications.reduce(
          (sum, spec) => sum + (spec.totalTokens || 0),
          0
        );
      const lastActivity =
        conversation.messages.length > 0
          ? conversation.messages[conversation.messages.length - 1].createdAt
          : null;

      return {
        messageCount,
        specificationCount,
        totalTokens,
        lastActivity,
      };
    } catch (error) {
      throw new Error(`Failed to get conversation stats: ${error}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance for convenience
export const databaseService = new DatabaseService();
