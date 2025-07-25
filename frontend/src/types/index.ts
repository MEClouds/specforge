export interface ChatMessage {
  id: string;
  conversationId: string;
  persona: AIPersona | null;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai';
  isTyping?: boolean;
}

export interface AIPersona {
  id: string;
  name: string;
  role:
    | 'product-manager'
    | 'tech-lead'
    | 'ux-designer'
    | 'devops'
    | 'scrum-master';
  avatar: string;
  color: string;
  expertise: string[];
}

export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  appIdea: string;
  targetUsers: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
  createdAt: Date;
  updatedAt: Date;
}

export interface Specification {
  id: string;
  conversationId: string;
  requirements: string;
  design: string;
  tasks: string;
  version: number;
  generatedAt: Date;
}
