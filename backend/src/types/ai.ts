export interface AIPersona {
  id: string;
  name: string;
  role: PersonaRole;
  avatar: string;
  color: string;
  expertise: string[];
  systemPrompt: string;
  conversationStarters: string[];
  questionTemplates: string[];
  responseStyle: {
    tone: string;
    expertise: string[];
    focusAreas: string[];
  };
  collaborationRules: {
    whenToEngage: string[];
    conflictResolution: string[];
    handoffTriggers: string[];
  };
}

export enum PersonaRole {
  PRODUCT_MANAGER = 'product-manager',
  TECH_LEAD = 'tech-lead',
  UX_DESIGNER = 'ux-designer',
  DEVOPS = 'devops',
  SCRUM_MASTER = 'scrum-master',
}

export interface ConversationContext {
  conversationId: string;
  appIdea: string;
  targetUsers: string[];
  complexity?: 'simple' | 'moderate' | 'complex';
  currentPhase: ConversationPhase;
  previousMessages: ConversationMessage[];
  activePersonas: PersonaRole[];
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

export interface ConversationMessage {
  id: string;
  persona?: PersonaRole;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai';
  tokens?: number;
  processingTimeMs?: number;
}

export interface AIResponse {
  content: string;
  persona: PersonaRole;
  nextPersonas?: PersonaRole[];
  phaseTransition?: ConversationPhase;
  tokens: number;
  processingTimeMs: number;
}

export interface OrchestrationResult {
  responses: AIResponse[];
  nextPhase?: ConversationPhase;
  isComplete: boolean;
  suggestedActions: string[];
}
