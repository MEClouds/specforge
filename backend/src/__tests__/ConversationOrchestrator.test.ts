import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import { AIService } from '../services/AIService';
import {
  PersonaRole,
  ConversationContext,
  ConversationPhase,
  AIResponse,
} from '../types/ai';

// Mock AIService
jest.mock('../services/AIService');

describe('ConversationOrchestrator', () => {
  let orchestrator: ConversationOrchestrator;
  let mockAIService: jest.Mocked<AIService>;

  beforeEach(() => {
    mockAIService = {
      generateResponse: jest.fn(),
      getAvailablePersonas: jest.fn(),
      getPersonaConfig: jest.fn(),
      validateApiKeys: jest.fn(),
    } as any;

    orchestrator = new ConversationOrchestrator(mockAIService);
  });

  describe('orchestrateConversation', () => {
    const mockContext: ConversationContext = {
      conversationId: 'test-id',
      appIdea: 'A task management app',
      targetUsers: ['developers', 'project managers'],
      complexity: 'moderate',
      currentPhase: ConversationPhase.INITIAL_DISCOVERY,
      previousMessages: [],
      activePersonas: [],
    };

    it('should orchestrate conversation in initial discovery phase', async () => {
      const mockResponse: AIResponse = {
        content:
          'Great idea! Let me ask some clarifying questions about your target users.',
        persona: PersonaRole.PRODUCT_MANAGER,
        tokens: 50,
        processingTimeMs: 1000,
      };

      mockAIService.generateResponse.mockResolvedValue(mockResponse);

      const result = await orchestrator.orchestrateConversation(
        mockContext,
        'I want to build a task management app'
      );

      expect(result.responses).toHaveLength(1);
      expect(result.responses[0]).toEqual(mockResponse);
      expect(result.isComplete).toBe(false);
      expect(mockAIService.generateResponse).toHaveBeenCalledWith(
        PersonaRole.PRODUCT_MANAGER,
        mockContext,
        'I want to build a task management app'
      );
    });

    it('should involve multiple personas in technical architecture phase', async () => {
      const techContext = {
        ...mockContext,
        currentPhase: ConversationPhase.TECHNICAL_ARCHITECTURE,
      };

      const pmResponse: AIResponse = {
        content: 'From a product perspective, we need to consider scalability.',
        persona: PersonaRole.PRODUCT_MANAGER,
        tokens: 40,
        processingTimeMs: 800,
      };

      const tlResponse: AIResponse = {
        content:
          'I recommend using a microservices architecture with Node.js and React.',
        persona: PersonaRole.TECH_LEAD,
        tokens: 60,
        processingTimeMs: 1200,
      };

      mockAIService.generateResponse
        .mockResolvedValueOnce(tlResponse)
        .mockResolvedValueOnce(pmResponse);

      const result = await orchestrator.orchestrateConversation(
        techContext,
        'What technology stack should we use?'
      );

      expect(result.responses).toHaveLength(2);
      expect(result.responses.map((r) => r.persona)).toContain(
        PersonaRole.TECH_LEAD
      );
      expect(result.responses.map((r) => r.persona)).toContain(
        PersonaRole.PRODUCT_MANAGER
      );
    });

    it('should detect contextual persona triggers', async () => {
      const contextWithUXTrigger = {
        ...mockContext,
        previousMessages: [
          {
            id: '1',
            content:
              'We need to focus on user interface design and accessibility',
            timestamp: new Date(),
            type: 'user' as const,
          },
        ],
      };

      const uxResponse: AIResponse = {
        content: 'For accessibility, we should follow WCAG guidelines.',
        persona: PersonaRole.UX_DESIGNER,
        tokens: 45,
        processingTimeMs: 900,
      };

      mockAIService.generateResponse.mockResolvedValue(uxResponse);

      const result = await orchestrator.orchestrateConversation(
        contextWithUXTrigger,
        'How should we handle the user interface?'
      );

      expect(mockAIService.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        contextWithUXTrigger,
        'How should we handle the user interface?'
      );
    });

    it('should handle AI service errors gracefully', async () => {
      mockAIService.generateResponse.mockRejectedValue(
        new Error('AI API Error')
      );

      const result = await orchestrator.orchestrateConversation(
        mockContext,
        'Test message'
      );

      expect(result.responses).toHaveLength(0);
      expect(result.isComplete).toBe(false);
    });

    it('should detect conversation completion', async () => {
      const taskPlanningContext = {
        ...mockContext,
        currentPhase: ConversationPhase.TASK_PLANNING,
      };

      const smResponse: AIResponse = {
        content:
          'All tasks are now defined and ready to move on to specification generation.',
        persona: PersonaRole.SCRUM_MASTER,
        tokens: 30,
        processingTimeMs: 600,
      };

      mockAIService.generateResponse.mockResolvedValue(smResponse);

      const result = await orchestrator.orchestrateConversation(
        taskPlanningContext,
        'Are we ready to generate the specifications?'
      );

      expect(result.isComplete).toBe(true);
    });

    it('should generate appropriate suggested actions', async () => {
      const mockResponse: AIResponse = {
        content:
          'We need to clarify the user requirements and validate our assumptions.',
        persona: PersonaRole.PRODUCT_MANAGER,
        tokens: 35,
        processingTimeMs: 700,
      };

      mockAIService.generateResponse.mockResolvedValue(mockResponse);

      const result = await orchestrator.orchestrateConversation(
        mockContext,
        'What should we do next?'
      );

      expect(result.suggestedActions).toContain(
        'Clarify requirements with stakeholders'
      );
      expect(result.suggestedActions).toContain(
        'Validate assumptions with users'
      );
    });
  });

  describe('handlePersonaConflict', () => {
    it('should resolve conflicts using Scrum Master persona', async () => {
      const conflictingResponses: AIResponse[] = [
        {
          content: 'We should use React for the frontend.',
          persona: PersonaRole.TECH_LEAD,
          tokens: 20,
          processingTimeMs: 500,
        },
        {
          content: 'Vue.js would be better for rapid prototyping.',
          persona: PersonaRole.UX_DESIGNER,
          tokens: 25,
          processingTimeMs: 600,
        },
      ];

      const resolutionResponse: AIResponse = {
        content:
          "Both frameworks have merits. Let's consider the team's expertise and project timeline.",
        persona: PersonaRole.SCRUM_MASTER,
        tokens: 40,
        processingTimeMs: 800,
      };

      mockAIService.generateResponse.mockResolvedValue(resolutionResponse);

      const mockContext: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['users'],
        currentPhase: ConversationPhase.TECHNICAL_ARCHITECTURE,
        previousMessages: [],
        activePersonas: [],
      };

      const result = await orchestrator.handlePersonaConflict(
        mockContext,
        conflictingResponses
      );

      expect(result).toEqual(resolutionResponse);
      expect(mockAIService.generateResponse).toHaveBeenCalledWith(
        PersonaRole.SCRUM_MASTER,
        mockContext,
        expect.stringContaining('conflicting viewpoints')
      );
    });
  });

  describe('getPhaseProgress', () => {
    it('should calculate correct progress for initial discovery phase', () => {
      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['users'],
        currentPhase: ConversationPhase.INITIAL_DISCOVERY,
        previousMessages: [],
        activePersonas: [],
      };

      const progress = orchestrator.getPhaseProgress(context);

      expect(progress.currentPhase).toBe(ConversationPhase.INITIAL_DISCOVERY);
      expect(progress.completedPhases).toHaveLength(0);
      expect(progress.nextPhase).toBe(ConversationPhase.BUSINESS_REQUIREMENTS);
      expect(progress.overallProgress).toBe(0);
    });

    it('should calculate correct progress for middle phases', () => {
      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['users'],
        currentPhase: ConversationPhase.TECHNICAL_ARCHITECTURE,
        previousMessages: [],
        activePersonas: [],
      };

      const progress = orchestrator.getPhaseProgress(context);

      expect(progress.currentPhase).toBe(
        ConversationPhase.TECHNICAL_ARCHITECTURE
      );
      expect(progress.completedPhases).toContain(
        ConversationPhase.INITIAL_DISCOVERY
      );
      expect(progress.completedPhases).toContain(
        ConversationPhase.BUSINESS_REQUIREMENTS
      );
      expect(progress.nextPhase).toBe(ConversationPhase.USER_EXPERIENCE);
      expect(progress.overallProgress).toBeGreaterThan(0);
      expect(progress.overallProgress).toBeLessThan(100);
    });

    it('should calculate correct progress for final phase', () => {
      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['users'],
        currentPhase: ConversationPhase.SPECIFICATION_GENERATION,
        previousMessages: [],
        activePersonas: [],
      };

      const progress = orchestrator.getPhaseProgress(context);

      expect(progress.currentPhase).toBe(
        ConversationPhase.SPECIFICATION_GENERATION
      );
      expect(progress.overallProgress).toBe(100);
    });
  });
});
