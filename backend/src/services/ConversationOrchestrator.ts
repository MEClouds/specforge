import {
  AIPersona,
  PersonaRole,
  ConversationContext,
  ConversationPhase,
  AIResponse,
  OrchestrationResult,
  ConversationMessage,
} from '../types/ai';
import { AIService } from './AIService';
import { PERSONA_CONFIGS } from '../config/personas';

export class ConversationOrchestrator {
  private aiService: AIService;
  private phaseTransitions: Map<ConversationPhase, ConversationPhase> = new Map(
    [
      [
        ConversationPhase.INITIAL_DISCOVERY,
        ConversationPhase.BUSINESS_REQUIREMENTS,
      ],
      [
        ConversationPhase.BUSINESS_REQUIREMENTS,
        ConversationPhase.TECHNICAL_ARCHITECTURE,
      ],
      [
        ConversationPhase.TECHNICAL_ARCHITECTURE,
        ConversationPhase.USER_EXPERIENCE,
      ],
      [ConversationPhase.USER_EXPERIENCE, ConversationPhase.INFRASTRUCTURE],
      [ConversationPhase.INFRASTRUCTURE, ConversationPhase.TASK_PLANNING],
      [
        ConversationPhase.TASK_PLANNING,
        ConversationPhase.SPECIFICATION_GENERATION,
      ],
    ]
  );

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async orchestrateConversation(
    context: ConversationContext,
    userMessage: string
  ): Promise<OrchestrationResult> {
    const activePersonas = this.determineActivePersonas(context);
    const responses: AIResponse[] = [];

    // Generate responses from active personas
    for (const persona of activePersonas) {
      try {
        const response = await this.aiService.generateResponse(
          persona,
          context,
          userMessage
        );
        responses.push(response);
      } catch (error) {
        console.error(`Failed to get response from ${persona}:`, error);
        // Continue with other personas even if one fails
      }
    }

    // Determine if phase transition is needed
    const phaseAnalysis = this.analyzePhaseCompletion(context, responses);
    const nextPhase = phaseAnalysis.shouldTransition
      ? this.phaseTransitions.get(context.currentPhase)
      : undefined;

    // Check if conversation is complete
    const isComplete =
      context.currentPhase === ConversationPhase.TASK_PLANNING &&
      phaseAnalysis.shouldTransition;

    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(
      context,
      responses,
      nextPhase
    );

    return {
      responses,
      nextPhase,
      isComplete,
      suggestedActions,
    };
  }

  private determineActivePersonas(context: ConversationContext): PersonaRole[] {
    const phasePersonaMap: Record<ConversationPhase, PersonaRole[]> = {
      [ConversationPhase.INITIAL_DISCOVERY]: [PersonaRole.PRODUCT_MANAGER],
      [ConversationPhase.BUSINESS_REQUIREMENTS]: [PersonaRole.PRODUCT_MANAGER],
      [ConversationPhase.TECHNICAL_ARCHITECTURE]: [
        PersonaRole.TECH_LEAD,
        PersonaRole.PRODUCT_MANAGER,
      ],
      [ConversationPhase.USER_EXPERIENCE]: [
        PersonaRole.UX_DESIGNER,
        PersonaRole.PRODUCT_MANAGER,
      ],
      [ConversationPhase.INFRASTRUCTURE]: [
        PersonaRole.DEVOPS,
        PersonaRole.TECH_LEAD,
      ],
      [ConversationPhase.TASK_PLANNING]: [
        PersonaRole.SCRUM_MASTER,
        PersonaRole.TECH_LEAD,
      ],
      [ConversationPhase.SPECIFICATION_GENERATION]: [],
    };

    const basePersonas = phasePersonaMap[context.currentPhase] || [];

    // Add personas based on conversation context
    const additionalPersonas = this.getContextualPersonas(context);

    return [...new Set([...basePersonas, ...additionalPersonas])];
  }

  private getContextualPersonas(context: ConversationContext): PersonaRole[] {
    const additional: PersonaRole[] = [];

    // Analyze recent messages for triggers
    const recentMessages = context.previousMessages.slice(-5);
    const recentContent = recentMessages
      .map((m) => m.content.toLowerCase())
      .join(' ');

    // Technical concerns trigger Tech Lead
    if (
      recentContent.includes('performance') ||
      recentContent.includes('scalability') ||
      recentContent.includes('database') ||
      recentContent.includes('api')
    ) {
      additional.push(PersonaRole.TECH_LEAD);
    }

    // UX concerns trigger UX Designer
    if (
      recentContent.includes('user') ||
      recentContent.includes('interface') ||
      recentContent.includes('design') ||
      recentContent.includes('accessibility')
    ) {
      additional.push(PersonaRole.UX_DESIGNER);
    }

    // Infrastructure concerns trigger DevOps
    if (
      recentContent.includes('deployment') ||
      recentContent.includes('hosting') ||
      recentContent.includes('security') ||
      recentContent.includes('monitoring')
    ) {
      additional.push(PersonaRole.DEVOPS);
    }

    // Planning concerns trigger Scrum Master
    if (
      recentContent.includes('timeline') ||
      recentContent.includes('sprint') ||
      recentContent.includes('task') ||
      recentContent.includes('milestone')
    ) {
      additional.push(PersonaRole.SCRUM_MASTER);
    }

    return additional;
  }

  private analyzePhaseCompletion(
    context: ConversationContext,
    responses: AIResponse[]
  ): { shouldTransition: boolean; confidence: number } {
    const phaseCompletionCriteria: Record<ConversationPhase, string[]> = {
      [ConversationPhase.INITIAL_DISCOVERY]: [
        'app idea is clear',
        'target users identified',
        'core problem defined',
      ],
      [ConversationPhase.BUSINESS_REQUIREMENTS]: [
        'business goals established',
        'success metrics defined',
        'feature priorities set',
      ],
      [ConversationPhase.TECHNICAL_ARCHITECTURE]: [
        'technology stack chosen',
        'architecture approach defined',
        'technical risks identified',
      ],
      [ConversationPhase.USER_EXPERIENCE]: [
        'user journey mapped',
        'interface requirements defined',
        'accessibility considered',
      ],
      [ConversationPhase.INFRASTRUCTURE]: [
        'deployment strategy planned',
        'infrastructure requirements set',
        'security considerations addressed',
      ],
      [ConversationPhase.TASK_PLANNING]: [
        'tasks broken down',
        'effort estimated',
        'dependencies identified',
      ],
      [ConversationPhase.SPECIFICATION_GENERATION]: [],
    };

    const criteria = phaseCompletionCriteria[context.currentPhase] || [];
    const responseContent = responses
      .map((r) => r.content.toLowerCase())
      .join(' ');

    // Check for transition signals in responses
    const transitionSignals = [
      'ready to move on',
      'next phase',
      'hand off',
      'completed',
      'established',
      'defined',
    ];

    const hasTransitionSignal = transitionSignals.some((signal) =>
      responseContent.includes(signal)
    );

    // Simple heuristic: if we have transition signals and some criteria met
    const shouldTransition = hasTransitionSignal && criteria.length > 0;
    const confidence = hasTransitionSignal ? 0.8 : 0.3;

    return { shouldTransition, confidence };
  }

  private generateSuggestedActions(
    context: ConversationContext,
    responses: AIResponse[],
    nextPhase?: ConversationPhase
  ): string[] {
    const actions: string[] = [];

    if (nextPhase) {
      actions.push(`Transition to ${nextPhase.replace('-', ' ')} phase`);
    }

    // Analyze responses for action items
    responses.forEach((response) => {
      const content = response.content.toLowerCase();

      if (content.includes('need to clarify') || content.includes('unclear')) {
        actions.push('Clarify requirements with stakeholders');
      }

      if (content.includes('research') || content.includes('investigate')) {
        actions.push('Conduct additional research');
      }

      if (content.includes('validate') || content.includes('test')) {
        actions.push('Validate assumptions with users');
      }

      if (content.includes('document') || content.includes('specify')) {
        actions.push('Document decisions and requirements');
      }
    });

    // Phase-specific suggestions
    switch (context.currentPhase) {
      case ConversationPhase.INITIAL_DISCOVERY:
        actions.push('Define target user personas');
        actions.push('Validate problem-solution fit');
        break;
      case ConversationPhase.BUSINESS_REQUIREMENTS:
        actions.push('Set measurable success metrics');
        actions.push('Prioritize feature list');
        break;
      case ConversationPhase.TECHNICAL_ARCHITECTURE:
        actions.push('Create system architecture diagram');
        actions.push('Identify technical risks');
        break;
      case ConversationPhase.USER_EXPERIENCE:
        actions.push('Create user journey maps');
        actions.push('Design wireframes');
        break;
      case ConversationPhase.INFRASTRUCTURE:
        actions.push('Plan deployment strategy');
        actions.push('Set up monitoring');
        break;
      case ConversationPhase.TASK_PLANNING:
        actions.push('Create sprint backlog');
        actions.push('Estimate development timeline');
        break;
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  async handlePersonaConflict(
    context: ConversationContext,
    conflictingResponses: AIResponse[]
  ): Promise<AIResponse> {
    // Create a conflict resolution prompt
    const conflictSummary = conflictingResponses
      .map((r) => `${PERSONA_CONFIGS[r.persona].name}: ${r.content}`)
      .join('\n\n');

    const resolutionPrompt = `There are conflicting viewpoints in our team discussion:

${conflictSummary}

As the team facilitator, please provide a balanced resolution that considers all perspectives and helps the team move forward constructively.`;

    // Use Scrum Master persona for conflict resolution
    return await this.aiService.generateResponse(
      PersonaRole.SCRUM_MASTER,
      context,
      resolutionPrompt
    );
  }

  getPhaseProgress(context: ConversationContext): {
    currentPhase: ConversationPhase;
    completedPhases: ConversationPhase[];
    nextPhase?: ConversationPhase;
    overallProgress: number;
  } {
    const allPhases = Object.values(ConversationPhase);
    const currentIndex = allPhases.indexOf(context.currentPhase);
    const completedPhases = allPhases.slice(0, currentIndex);
    const nextPhase = this.phaseTransitions.get(context.currentPhase);
    const overallProgress = (currentIndex / (allPhases.length - 1)) * 100;

    return {
      currentPhase: context.currentPhase,
      completedPhases,
      nextPhase,
      overallProgress,
    };
  }
}
