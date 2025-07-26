import { Router, Request, Response } from 'express';
const { body, param, validationResult } = require('express-validator');
import { AIService, AIServiceConfig } from '../services/AIService';
import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import {
  PersonaRole,
  ConversationPhase,
  ConversationContext,
} from '../types/ai';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();

// Initialize services
const dbService = new DatabaseService();

// Initialize AI service only if API keys are available
let aiService: AIService | null = null;
let orchestrator: ConversationOrchestrator | null = null;

if (
  process.env.OPENAI_API_KEY ||
  process.env.ANTHROPIC_API_KEY ||
  process.env.DEEPSEEK_API_KEY
) {
  const aiConfig: AIServiceConfig = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    defaultProvider:
      (process.env.AI_DEFAULT_PROVIDER as
        | 'openai'
        | 'anthropic'
        | 'deepseek') || 'openai',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '10'),
  };

  aiService = new AIService(aiConfig);
  orchestrator = new ConversationOrchestrator(aiService);
}

// Helper function to check AI service availability
const checkAIService = (res: Response) => {
  if (!aiService || !orchestrator) {
    res.status(503).json({
      success: false,
      error: 'AI service not available - API keys not configured',
    });
    return false;
  }
  return true;
};

// Get available personas
router.get('/personas', async (req: Request, res: Response) => {
  try {
    if (!checkAIService(res)) return;

    const personas = aiService!.getAvailablePersonas();
    res.json({
      success: true,
      data: personas,
    });
  } catch (error) {
    console.error('Error fetching personas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personas',
    });
  }
});

// Generate AI response for a specific persona
router.post(
  '/generate-response',
  [
    body('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID required'),
    body('persona')
      .isIn(Object.values(PersonaRole))
      .withMessage('Valid persona required'),
    body('message').isLength({ min: 1 }).withMessage('Message is required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    try {
      const { conversationId, persona, message } = req.body;

      // Get conversation context
      const conversation = await dbService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Build context
      const context: ConversationContext = {
        conversationId,
        appIdea: conversation.appIdea,
        targetUsers: conversation.targetUsers,
        complexity: conversation.complexity?.toLowerCase() as
          | 'simple'
          | 'moderate'
          | 'complex',
        currentPhase: ConversationPhase.INITIAL_DISCOVERY, // TODO: Track phase in DB
        previousMessages: conversation.messages.map((msg) => ({
          id: msg.id,
          persona: msg.personaRole as PersonaRole,
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.messageType.toLowerCase() as 'user' | 'ai',
          tokens: msg.tokens || undefined,
          processingTimeMs: msg.processingTimeMs || undefined,
        })),
        activePersonas: [persona],
      };

      if (!checkAIService(res)) return;

      const response = await aiService!.generateResponse(
        persona,
        context,
        message
      );

      // Save AI response to database
      await dbService.addMessage({
        conversationId,
        personaId: response.persona,
        personaName: aiService!.getPersonaConfig(response.persona).name,
        personaRole: response.persona.toUpperCase().replace('-', '_') as any,
        content: response.content,
        messageType: 'AI',
        tokens: response.tokens,
        processingTimeMs: response.processingTimeMs,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate response',
      });
    }
  }
);

// Orchestrate multi-persona conversation
router.post(
  '/orchestrate-conversation',
  [
    body('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID required'),
    body('message').isLength({ min: 1 }).withMessage('Message is required'),
    body('currentPhase').optional().isIn(Object.values(ConversationPhase)),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    try {
      const { conversationId, message, currentPhase } = req.body;

      // Get conversation context
      const conversation = await dbService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Build context
      const context: ConversationContext = {
        conversationId,
        appIdea: conversation.appIdea,
        targetUsers: conversation.targetUsers,
        complexity: conversation.complexity?.toLowerCase() as
          | 'simple'
          | 'moderate'
          | 'complex',
        currentPhase: currentPhase || ConversationPhase.INITIAL_DISCOVERY,
        previousMessages: conversation.messages.map((msg) => ({
          id: msg.id,
          persona: msg.personaRole as PersonaRole,
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.messageType.toLowerCase() as 'user' | 'ai',
          tokens: msg.tokens || undefined,
          processingTimeMs: msg.processingTimeMs || undefined,
        })),
        activePersonas: [],
      };

      // Save user message first
      await dbService.addMessage({
        conversationId,
        content: message,
        messageType: 'USER',
      });

      if (!checkAIService(res)) return;

      const result = await orchestrator!.orchestrateConversation(
        context,
        message
      );

      // Save AI responses to database
      for (const response of result.responses) {
        await dbService.addMessage({
          conversationId,
          personaId: response.persona,
          personaName: aiService!.getPersonaConfig(response.persona).name,
          personaRole: response.persona.toUpperCase().replace('-', '_') as any,
          content: response.content,
          messageType: 'AI',
          tokens: response.tokens,
          processingTimeMs: response.processingTimeMs,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error orchestrating conversation:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to orchestrate conversation',
      });
    }
  }
);

// Get conversation phase progress
router.get(
  '/conversations/:id/progress',
  [param('id').isUUID().withMessage('Valid conversation ID required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    try {
      const { id } = req.params;

      // Get conversation context
      const conversation = await dbService.getConversation(id);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Build context (simplified for progress tracking)
      const context: ConversationContext = {
        conversationId: id,
        appIdea: conversation.appIdea,
        targetUsers: conversation.targetUsers,
        complexity: conversation.complexity?.toLowerCase() as
          | 'simple'
          | 'moderate'
          | 'complex',
        currentPhase: ConversationPhase.INITIAL_DISCOVERY, // TODO: Track in DB
        previousMessages: [],
        activePersonas: [],
      };

      if (!checkAIService(res)) return;

      const progress = orchestrator!.getPhaseProgress(context);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      console.error('Error getting conversation progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation progress',
      });
    }
  }
);

// Get conversation progress
router.get(
  '/conversation-progress/:id',
  [param('id').isUUID().withMessage('Valid conversation ID required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    try {
      const { id } = req.params;

      // Get conversation context
      const conversation = await dbService.getConversation(id);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Build context
      const context: ConversationContext = {
        conversationId: id,
        appIdea: conversation.appIdea,
        targetUsers: conversation.targetUsers,
        complexity: conversation.complexity?.toLowerCase() as
          | 'simple'
          | 'moderate'
          | 'complex',
        currentPhase: ConversationPhase.INITIAL_DISCOVERY, // TODO: Track in DB
        previousMessages: conversation.messages.map((msg) => ({
          id: msg.id,
          persona: msg.personaRole as PersonaRole,
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.messageType.toLowerCase() as 'user' | 'ai',
          tokens: msg.tokens || undefined,
          processingTimeMs: msg.processingTimeMs || undefined,
        })),
        activePersonas: [],
      };

      if (!checkAIService(res)) return;

      const progress = orchestrator!.getPhaseProgress(context);

      // Generate suggested actions based on current phase
      const suggestedActions = await orchestrator!.orchestrateConversation(
        context,
        'What should we focus on next?'
      );

      res.json({
        success: true,
        data: {
          ...progress,
          suggestedActions: suggestedActions.suggestedActions,
          isComplete: suggestedActions.isComplete,
        },
      });
    } catch (error) {
      console.error('Error getting conversation progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation progress',
      });
    }
  }
);

// Transition conversation phase
router.post(
  '/transition-phase',
  [
    body('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID required'),
    body('nextPhase')
      .isIn(Object.values(ConversationPhase))
      .withMessage('Valid phase required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    try {
      const { conversationId, nextPhase } = req.body;

      // Get conversation context
      const conversation = await dbService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // TODO: Update conversation phase in database
      // For now, we'll just acknowledge the transition

      // Generate transition message
      const transitionMessage = `Moving to ${nextPhase.replace('-', ' ')} phase. Let's focus on the next set of requirements.`;

      // Add system message about phase transition
      await dbService.addMessage({
        conversationId,
        personaId: 'system',
        personaName: 'System',
        personaRole: 'SCRUM_MASTER',
        content: transitionMessage,
        messageType: 'AI',
      });

      res.json({
        success: true,
        data: {
          message: 'Phase transition successful',
          nextPhase,
        },
      });
    } catch (error) {
      console.error('Error transitioning phase:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transition phase',
      });
    }
  }
);

// Resolve persona conflict
router.post(
  '/resolve-conflict',
  [
    body('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID required'),
    body('conflictingMessages')
      .isArray({ min: 2 })
      .withMessage('At least 2 conflicting messages required'),
    body('resolutionApproach')
      .isIn([
        'compromise',
        'data-driven',
        'user-focused',
        'technical-feasibility',
        'business-value',
        'custom',
      ])
      .withMessage('Valid resolution approach required'),
    body('customGuidance').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    try {
      const {
        conversationId,
        conflictingMessages,
        resolutionApproach,
        customGuidance,
      } = req.body;

      // Get conversation context
      const conversation = await dbService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Build context
      const context: ConversationContext = {
        conversationId,
        appIdea: conversation.appIdea,
        targetUsers: conversation.targetUsers,
        complexity: conversation.complexity?.toLowerCase() as
          | 'simple'
          | 'moderate'
          | 'complex',
        currentPhase: ConversationPhase.INITIAL_DISCOVERY, // TODO: Track in DB
        previousMessages: conversation.messages.map((msg) => ({
          id: msg.id,
          persona: msg.personaRole as PersonaRole,
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.messageType.toLowerCase() as 'user' | 'ai',
          tokens: msg.tokens || undefined,
          processingTimeMs: msg.processingTimeMs || undefined,
        })),
        activePersonas: [],
      };

      if (!checkAIService(res)) return;

      // Convert conflicting messages to AI responses format
      const aiResponses = conflictingMessages.map((msg: any) => ({
        content: msg.content,
        persona: msg.persona?.role || PersonaRole.PRODUCT_MANAGER,
        tokens: msg.tokens || 0,
        processingTimeMs: msg.processingTimeMs || 0,
      }));

      const resolution = await orchestrator!.handlePersonaConflict(
        context,
        aiResponses
      );

      // Save resolution message to database
      await dbService.addMessage({
        conversationId,
        personaId: resolution.persona,
        personaName: aiService!.getPersonaConfig(resolution.persona).name,
        personaRole: resolution.persona.toUpperCase().replace('-', '_') as any,
        content: resolution.content,
        messageType: 'AI',
        tokens: resolution.tokens,
        processingTimeMs: resolution.processingTimeMs,
      });

      res.json({
        success: true,
        data: {
          id: `resolution-${Date.now()}`,
          conversationId,
          persona: {
            id: resolution.persona,
            name: aiService!.getPersonaConfig(resolution.persona).name,
            role: resolution.persona,
            avatar: aiService!.getPersonaConfig(resolution.persona).avatar,
            color: aiService!.getPersonaConfig(resolution.persona).color,
            expertise: aiService!.getPersonaConfig(resolution.persona)
              .expertise,
          },
          content: resolution.content,
          timestamp: new Date(),
          type: 'ai',
        },
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve conflict',
      });
    }
  }
);

// Validate AI API keys
router.get('/validate-keys', async (req: Request, res: Response) => {
  try {
    if (!checkAIService(res)) return;

    const validation = await aiService!.validateApiKeys();
    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('Error validating API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate API keys',
    });
  }
});

export default router;
