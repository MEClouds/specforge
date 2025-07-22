import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import {
  AIPersona,
  PersonaRole,
  ConversationContext,
  AIResponse,
} from '../types/ai';
import { PERSONA_CONFIGS } from '../config/personas';

export interface AIServiceConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  deepseekApiKey?: string;
  defaultProvider: 'openai' | 'anthropic' | 'deepseek';
  maxTokens: number;
  temperature: number;
  rateLimitPerMinute: number;
}

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private config: AIServiceConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor(config: AIServiceConfig) {
    this.config = config;

    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }

    if (config.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    }

    if (!this.openai && !this.anthropic && !config.deepseekApiKey) {
      throw new Error('At least one AI provider API key must be configured');
    }
  }

  async generateResponse(
    persona: PersonaRole,
    context: ConversationContext,
    userMessage: string
  ): Promise<AIResponse> {
    const startTime = Date.now();

    // Check rate limiting
    await this.checkRateLimit(persona);

    const personaConfig = PERSONA_CONFIGS[persona];
    const prompt = this.buildPrompt(personaConfig, context, userMessage);

    try {
      let response: string;
      let tokens: number;

      if (this.config.defaultProvider === 'openai' && this.openai) {
        const result = await this.callOpenAI(prompt);
        response = result.content;
        tokens = result.tokens;
      } else if (
        this.config.defaultProvider === 'anthropic' &&
        this.anthropic
      ) {
        const result = await this.callAnthropic(prompt);
        response = result.content;
        tokens = result.tokens;
      } else if (
        this.config.defaultProvider === 'deepseek' &&
        this.config.deepseekApiKey
      ) {
        const result = await this.callDeepSeek(prompt);
        response = result.content;
        tokens = result.tokens;
      } else {
        // Fallback to available provider
        if (this.openai) {
          const result = await this.callOpenAI(prompt);
          response = result.content;
          tokens = result.tokens;
        } else if (this.anthropic) {
          const result = await this.callAnthropic(prompt);
          response = result.content;
          tokens = result.tokens;
        } else if (this.config.deepseekApiKey) {
          const result = await this.callDeepSeek(prompt);
          response = result.content;
          tokens = result.tokens;
        } else {
          throw new Error('No AI provider available');
        }
      }

      const processingTime = Date.now() - startTime;

      // Update rate limiting counter
      this.updateRateLimit(persona);

      return {
        content: response,
        persona,
        tokens,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      console.error(`AI Service error for persona ${persona}:`, error);
      throw new Error(
        `Failed to generate response for ${persona}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async callOpenAI(
    prompt: string
  ): Promise<{ content: string; tokens: number }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return {
      content,
      tokens: completion.usage?.total_tokens || 0,
    };
  }

  private async callAnthropic(
    prompt: string
  ): Promise<{ content: string; tokens: number }> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const message = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return {
      content: content.text,
      tokens: message.usage.input_tokens + message.usage.output_tokens,
    };
  }

  private async callDeepSeek(
    prompt: string
  ): Promise<{ content: string; tokens: number }> {
    if (!this.config.deepseekApiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.deepseekApiKey}`,
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from DeepSeek');
      }

      return {
        content,
        tokens: response.data.usage?.total_tokens || 0,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `DeepSeek API error: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  private buildPrompt(
    persona: AIPersona,
    context: ConversationContext,
    userMessage: string
  ): string {
    const conversationHistory = context.previousMessages
      .slice(-10) // Last 10 messages for context
      .map(
        (msg) =>
          `${msg.persona ? PERSONA_CONFIGS[msg.persona].name : 'User'}: ${msg.content}`
      )
      .join('\n');

    return `${persona.systemPrompt}

CONVERSATION CONTEXT:
- App Idea: ${context.appIdea}
- Target Users: ${context.targetUsers.join(', ')}
- Complexity: ${context.complexity || 'Not specified'}
- Current Phase: ${context.currentPhase}
- Active Personas: ${context.activePersonas.map((p) => PERSONA_CONFIGS[p].name).join(', ')}

RECENT CONVERSATION:
${conversationHistory}

USER MESSAGE: ${userMessage}

Please respond as ${persona.name} (${persona.role}). Keep your response focused, professional, and true to your expertise. If you need to hand off to another team member or suggest next steps, mention it clearly.`;
  }

  private async checkRateLimit(persona: PersonaRole): Promise<void> {
    const key = `${persona}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      this.requestCounts.set(key, { count: 0, resetTime: now + windowMs });
      return;
    }

    if (current.count >= this.config.rateLimitPerMinute) {
      const waitTime = current.resetTime - now;
      throw new Error(
        `Rate limit exceeded for ${persona}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }
  }

  private updateRateLimit(persona: PersonaRole): void {
    const key = `${persona}`;
    const current = this.requestCounts.get(key);

    if (current) {
      current.count += 1;
    }
  }

  async validateApiKeys(): Promise<{
    openai: boolean;
    anthropic: boolean;
    deepseek: boolean;
  }> {
    const results = { openai: false, anthropic: false, deepseek: false };

    if (this.openai) {
      try {
        await this.openai.models.list();
        results.openai = true;
      } catch (error) {
        console.warn('OpenAI API key validation failed:', error);
      }
    }

    if (this.anthropic) {
      try {
        // Simple test call to validate API key
        await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        });
        results.anthropic = true;
      } catch (error) {
        console.warn('Anthropic API key validation failed:', error);
      }
    }

    if (this.config.deepseekApiKey) {
      try {
        // Simple test call to validate DeepSeek API key
        await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
            temperature: 0.1,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.config.deepseekApiKey}`,
            },
          }
        );
        results.deepseek = true;
      } catch (error) {
        console.warn('DeepSeek API key validation failed:', error);
      }
    }

    return results;
  }

  getAvailablePersonas(): AIPersona[] {
    return Object.values(PERSONA_CONFIGS);
  }

  getPersonaConfig(role: PersonaRole): AIPersona {
    return PERSONA_CONFIGS[role];
  }
}
