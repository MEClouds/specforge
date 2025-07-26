import type { Conversation, ChatMessage } from '../types';

interface CreateConversationRequest {
  title: string;
  description?: string;
  appIdea: string;
  targetUsers: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
  userId?: string;
}

interface ConversationResponse {
  success: boolean;
  data: {
    conversation: Conversation & {
      messageCount: number;
      specificationCount: number;
      messages?: ChatMessage[];
      specifications?: any[];
    };
  };
  timestamp: string;
  requestId: string;
}

interface ConversationListResponse {
  success: boolean;
  data: {
    conversations: (Conversation & {
      messageCount: number;
      specificationCount: number;
    })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
  requestId: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

class ConversationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = crypto.randomUUID();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as ErrorResponse;
      throw new Error(errorData.error?.message || 'Request failed');
    }

    return data;
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    request: CreateConversationRequest
  ): Promise<Conversation> {
    const response = await this.makeRequest<ConversationResponse>(
      '/api/conversations',
      {
        method: 'POST',
        body: JSON.stringify({
          ...request,
          complexity: request.complexity?.toUpperCase(),
        }),
      }
    );

    return {
      id: response.data.conversation.id,
      userId: response.data.conversation.userId,
      title: response.data.conversation.title,
      description: response.data.conversation.description,
      status: response.data.conversation.status,
      appIdea: response.data.conversation.appIdea,
      targetUsers: response.data.conversation.targetUsers,
      complexity: response.data.conversation.complexity?.toLowerCase() as
        | 'simple'
        | 'moderate'
        | 'complex'
        | undefined,
      createdAt: new Date(response.data.conversation.createdAt),
      updatedAt: new Date(response.data.conversation.updatedAt),
    };
  }

  /**
   * Get a conversation by ID with messages and specifications
   */
  async getConversation(id: string): Promise<{
    conversation: Conversation;
    messages: ChatMessage[];
    specifications: any[];
  }> {
    const response = await this.makeRequest<ConversationResponse>(
      `/api/conversations/${id}`
    );

    const conversation: Conversation = {
      id: response.data.conversation.id,
      userId: response.data.conversation.userId,
      title: response.data.conversation.title,
      description: response.data.conversation.description,
      status: response.data.conversation.status,
      appIdea: response.data.conversation.appIdea,
      targetUsers: response.data.conversation.targetUsers,
      complexity: response.data.conversation.complexity?.toLowerCase() as
        | 'simple'
        | 'moderate'
        | 'complex'
        | undefined,
      createdAt: new Date(response.data.conversation.createdAt),
      updatedAt: new Date(response.data.conversation.updatedAt),
    };

    const messages: ChatMessage[] =
      response.data.conversation.messages?.map((msg: any) => ({
        id: msg.id,
        conversationId: id,
        persona: msg.personaId
          ? {
              id: msg.personaId,
              name: msg.personaName || '',
              role: this.mapPersonaRole(msg.personaRole),
              avatar: this.getPersonaAvatar(msg.personaRole),
              color: this.getPersonaColor(msg.personaRole),
              expertise: this.getPersonaExpertise(msg.personaRole),
            }
          : null,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        type: msg.messageType.toLowerCase() as 'user' | 'ai',
      })) || [];

    return {
      conversation,
      messages,
      specifications: response.data.conversation.specifications || [],
    };
  }

  /**
   * Get list of conversations with pagination
   */
  async getConversations(
    page: number = 1,
    limit: number = 20,
    status?: 'active' | 'completed' | 'archived'
  ): Promise<{
    conversations: (Conversation & {
      messageCount: number;
      specificationCount: number;
    })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append('status', status);
    }

    const response = await this.makeRequest<ConversationListResponse>(
      `/api/conversations?${params.toString()}`
    );

    const conversations = response.data.conversations.map((conv) => ({
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      description: conv.description,
      status: conv.status,
      appIdea: conv.appIdea,
      targetUsers: conv.targetUsers,
      complexity: conv.complexity?.toLowerCase() as
        | 'simple'
        | 'moderate'
        | 'complex'
        | undefined,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      messageCount: conv.messageCount,
      specificationCount: conv.specificationCount,
    }));

    return {
      conversations,
      pagination: response.data.pagination,
    };
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    id: string,
    status: 'active' | 'completed' | 'archived'
  ): Promise<Conversation> {
    const response = await this.makeRequest<ConversationResponse>(
      `/api/conversations/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: status.toUpperCase() }),
      }
    );

    return {
      id: response.data.conversation.id,
      userId: response.data.conversation.userId,
      title: response.data.conversation.title,
      description: response.data.conversation.description,
      status: response.data.conversation.status,
      appIdea: response.data.conversation.appIdea,
      targetUsers: response.data.conversation.targetUsers,
      complexity: response.data.conversation.complexity?.toLowerCase() as
        | 'simple'
        | 'moderate'
        | 'complex'
        | undefined,
      createdAt: new Date(response.data.conversation.createdAt),
      updatedAt: new Date(response.data.conversation.updatedAt),
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    await this.makeRequest(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  // Helper methods for persona mapping
  private mapPersonaRole(role: string | undefined): any {
    const roleMap: Record<string, string> = {
      PRODUCT_MANAGER: 'product-manager',
      TECH_LEAD: 'tech-lead',
      UX_DESIGNER: 'ux-designer',
      DEVOPS: 'devops',
      SCRUM_MASTER: 'scrum-master',
    };
    return roleMap[role || ''] || 'product-manager';
  }

  private getPersonaAvatar(role: string | undefined): string {
    const avatarMap: Record<string, string> = {
      PRODUCT_MANAGER: '👔',
      TECH_LEAD: '💻',
      UX_DESIGNER: '🎨',
      DEVOPS: '⚙️',
      SCRUM_MASTER: '📋',
    };
    return avatarMap[role || ''] || '👔';
  }

  private getPersonaColor(role: string | undefined): string {
    const colorMap: Record<string, string> = {
      PRODUCT_MANAGER: '#3B82F6',
      TECH_LEAD: '#10B981',
      UX_DESIGNER: '#F59E0B',
      DEVOPS: '#8B5CF6',
      SCRUM_MASTER: '#EF4444',
    };
    return colorMap[role || ''] || '#3B82F6';
  }

  private getPersonaExpertise(role: string | undefined): string[] {
    const expertiseMap: Record<string, string[]> = {
      PRODUCT_MANAGER: ['Product Strategy', 'Requirements', 'User Stories'],
      TECH_LEAD: ['Architecture', 'Technical Design', 'Code Review'],
      UX_DESIGNER: ['User Experience', 'Interface Design', 'Usability'],
      DEVOPS: ['Infrastructure', 'Deployment', 'CI/CD'],
      SCRUM_MASTER: ['Agile Process', 'Sprint Planning', 'Team Coordination'],
    };
    return expertiseMap[role || ''] || [];
  }
}

export const conversationService = new ConversationService();
export default ConversationService;
