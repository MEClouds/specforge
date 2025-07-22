import { AIService, AIServiceConfig } from '../services/AIService';
import {
  PersonaRole,
  ConversationContext,
  ConversationPhase,
} from '../types/ai';
import axios from 'axios';

// Mock the AI clients
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
  models: {
    list: jest.fn(),
  },
};

const mockAnthropic = {
  messages: {
    create: jest.fn(),
  },
};

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => mockAnthropic);
});

jest.mock('axios', () => ({
  post: jest.fn(),
  isAxiosError: jest.fn(),
}));

describe('AIService', () => {
  let aiService: AIService;
  let mockConfig: AIServiceConfig;

  beforeEach(() => {
    mockConfig = {
      openaiApiKey: 'test-openai-key',
      anthropicApiKey: 'test-anthropic-key',
      deepseekApiKey: 'test-deepseek-key',
      defaultProvider: 'openai',
      maxTokens: 1000,
      temperature: 0.7,
      rateLimitPerMinute: 5,
    };

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Test response from OpenAI' } }],
      usage: { total_tokens: 100 },
    });

    mockAnthropic.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Test response from Anthropic' }],
      usage: { input_tokens: 50, output_tokens: 50 },
    });

    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Test response from DeepSeek' } }],
        usage: { total_tokens: 75 },
      },
    });

    mockOpenAI.models.list.mockResolvedValue({ data: [] });
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(() => new AIService(mockConfig)).not.toThrow();
    });

    it('should throw error if no API keys provided', () => {
      const invalidConfig = {
        ...mockConfig,
        openaiApiKey: undefined,
        anthropicApiKey: undefined,
        deepseekApiKey: undefined,
      };
      expect(() => new AIService(invalidConfig)).toThrow(
        'At least one AI provider API key must be configured'
      );
    });
  });

  describe('generateResponse', () => {
    beforeEach(() => {
      aiService = new AIService(mockConfig);
    });

    it('should generate response using OpenAI when configured as default', async () => {
      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['developers'],
        currentPhase: ConversationPhase.INITIAL_DISCOVERY,
        previousMessages: [],
        activePersonas: [PersonaRole.PRODUCT_MANAGER],
      };

      const response = await aiService.generateResponse(
        PersonaRole.PRODUCT_MANAGER,
        context,
        'Test message'
      );

      expect(response.content).toBe('Test response from OpenAI');
      expect(response.persona).toBe(PersonaRole.PRODUCT_MANAGER);
      expect(response.tokens).toBe(100);
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['developers'],
        currentPhase: ConversationPhase.INITIAL_DISCOVERY,
        previousMessages: [],
        activePersonas: [PersonaRole.PRODUCT_MANAGER],
      };

      // Make requests up to the rate limit
      for (let i = 0; i < mockConfig.rateLimitPerMinute; i++) {
        await aiService.generateResponse(
          PersonaRole.PRODUCT_MANAGER,
          context,
          `Message ${i}`
        );
      }

      // Next request should be rate limited
      await expect(
        aiService.generateResponse(
          PersonaRole.PRODUCT_MANAGER,
          context,
          'Rate limited message'
        )
      ).rejects.toThrow(/Rate limit exceeded/);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error')
      );

      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['developers'],
        currentPhase: ConversationPhase.INITIAL_DISCOVERY,
        previousMessages: [],
        activePersonas: [PersonaRole.PRODUCT_MANAGER],
      };

      await expect(
        aiService.generateResponse(
          PersonaRole.PRODUCT_MANAGER,
          context,
          'Test message'
        )
      ).rejects.toThrow(/Failed to generate response/);
    });

    it('should use Anthropic when configured as default', async () => {
      const anthropicConfig = {
        ...mockConfig,
        defaultProvider: 'anthropic' as const,
      };
      aiService = new AIService(anthropicConfig);

      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['developers'],
        currentPhase: ConversationPhase.INITIAL_DISCOVERY,
        previousMessages: [],
        activePersonas: [PersonaRole.PRODUCT_MANAGER],
      };

      const response = await aiService.generateResponse(
        PersonaRole.PRODUCT_MANAGER,
        context,
        'Test message'
      );

      expect(response.content).toBe('Test response from Anthropic');
      expect(response.tokens).toBe(100);
      expect(mockAnthropic.messages.create).toHaveBeenCalled();
    });

    it('should use DeepSeek when configured as default', async () => {
      const deepseekConfig = {
        ...mockConfig,
        defaultProvider: 'deepseek' as const,
      };
      aiService = new AIService(deepseekConfig);

      const context: ConversationContext = {
        conversationId: 'test-id',
        appIdea: 'Test app',
        targetUsers: ['developers'],
        currentPhase: ConversationPhase.INITIAL_DISCOVERY,
        previousMessages: [],
        activePersonas: [PersonaRole.PRODUCT_MANAGER],
      };

      const response = await aiService.generateResponse(
        PersonaRole.PRODUCT_MANAGER,
        context,
        'Test message'
      );

      expect(response.content).toBe('Test response from DeepSeek');
      expect(response.tokens).toBe(75);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          model: 'deepseek-chat',
          messages: expect.any(Array),
          max_tokens: 1000,
          temperature: 0.7,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-deepseek-key',
          }),
        })
      );
    });
  });

  describe('getAvailablePersonas', () => {
    beforeEach(() => {
      aiService = new AIService(mockConfig);
    });

    it('should return all available personas', () => {
      const personas = aiService.getAvailablePersonas();
      expect(personas).toHaveLength(5);
      expect(personas.map((p) => p.role)).toContain(
        PersonaRole.PRODUCT_MANAGER
      );
      expect(personas.map((p) => p.role)).toContain(PersonaRole.TECH_LEAD);
      expect(personas.map((p) => p.role)).toContain(PersonaRole.UX_DESIGNER);
      expect(personas.map((p) => p.role)).toContain(PersonaRole.DEVOPS);
      expect(personas.map((p) => p.role)).toContain(PersonaRole.SCRUM_MASTER);
    });
  });

  describe('getPersonaConfig', () => {
    beforeEach(() => {
      aiService = new AIService(mockConfig);
    });

    it('should return correct persona configuration', () => {
      const pmConfig = aiService.getPersonaConfig(PersonaRole.PRODUCT_MANAGER);
      expect(pmConfig.role).toBe(PersonaRole.PRODUCT_MANAGER);
      expect(pmConfig.name).toBe('Sarah Chen');
      expect(pmConfig.expertise).toContain('Product Strategy');
    });
  });

  describe('validateApiKeys', () => {
    beforeEach(() => {
      aiService = new AIService(mockConfig);
    });

    it('should validate OpenAI API key', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [] });

      const validation = await aiService.validateApiKeys();

      expect(validation.openai).toBe(true);
      expect(mockOpenAI.models.list).toHaveBeenCalled();
    });

    it('should handle invalid API keys', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('Invalid API key'));

      const validation = await aiService.validateApiKeys();

      expect(validation.openai).toBe(false);
    });

    it('should validate Anthropic API key', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'test' }],
        usage: { input_tokens: 5, output_tokens: 5 },
      });

      const validation = await aiService.validateApiKeys();

      expect(validation.anthropic).toBe(true);
      expect(mockAnthropic.messages.create).toHaveBeenCalled();
    });

    it('should validate DeepSeek API key', async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          choices: [{ message: { content: 'test' } }],
          usage: { total_tokens: 10 },
        },
      });

      const validation = await aiService.validateApiKeys();

      expect(validation.deepseek).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
          temperature: 0.1,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-deepseek-key',
          }),
        })
      );
    });
  });
});
