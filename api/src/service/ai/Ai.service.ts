/**
 * AI Service
 *
 * This service provides AI operations using Google Gemini through the AI SDK.
 * Following the architecture pattern:
 * - Export Elysia route handlers with /ai prefix
 * - Export abstract service class with static methods for business logic
 * - Use library clients (gemini) ONLY within service methods
 */

import { Elysia, t } from 'elysia';
import { generateText, streamText, generateObject } from 'ai';
import { gemini, GEMINI_MODELS, type GeminiModel } from '@/lib/ai';
import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

export interface GenerateTextRequest {
  prompt: string;
  model?: GeminiModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface GenerateTextResponse {
  text: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GenerateObjectRequest<T = unknown> {
  prompt: string;
  schema: z.ZodSchema<T>;
  model?: GeminiModel;
  temperature?: number;
  systemPrompt?: string;
}

// ============================================================================
// Route Handlers
// ============================================================================

export const aiRoutes = new Elysia({ prefix: '/ai' })
  /**
   * POST /ai/generate
   * Generate text completion using Gemini
   */
  .post(
    '/generate',
    async ({ body }) => {
      const result = await AiService.generateText({
        prompt: body.prompt,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        systemPrompt: body.systemPrompt,
      });

      return result;
    },
    {
      body: t.Object({
        prompt: t.String({ minLength: 1 }),
        model: t.Optional(t.String()),
        temperature: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
        maxTokens: t.Optional(t.Number({ minimum: 1 })),
        systemPrompt: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Generate text completion',
        description: 'Generate a text completion using Google Gemini',
        tags: ['AI'],
      },
    }
  )

  /**
   * POST /ai/stream
   * Stream text generation using Gemini
   */
  .post(
    '/stream',
    async ({ body }) => {
      const stream = await AiService.streamText({
        prompt: body.prompt,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        systemPrompt: body.systemPrompt,
      });

      return new Response(stream.toTextStreamResponse().body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    },
    {
      body: t.Object({
        prompt: t.String({ minLength: 1 }),
        model: t.Optional(t.String()),
        temperature: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
        maxTokens: t.Optional(t.Number({ minimum: 1 })),
        systemPrompt: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Stream text generation',
        description: 'Stream text generation using Google Gemini',
        tags: ['AI'],
      },
    }
  )

  /**
   * GET /ai/models
   * List available Gemini models
   */
  .get(
    '/models',
    () => {
      return {
        models: Object.entries(GEMINI_MODELS).map(([key, value]) => ({
          id: value,
          name: key,
        })),
        default: GEMINI_MODELS.FLASH,
      };
    },
    {
      detail: {
        summary: 'List available models',
        description: 'Get a list of all available Gemini models',
        tags: ['AI'],
      },
    }
  );

// ============================================================================
// Service Class
// ============================================================================

/**
 * AI Service
 *
 * Abstract service class containing all AI business logic.
 * All methods are static and can be called from routes or background jobs.
 */
export abstract class AiService {
  /**
   * Generate text completion using Gemini
   *
   * @param request - Generation request parameters
   * @returns Generated text with metadata
   */
  static async generateText(
    request: GenerateTextRequest
  ): Promise<GenerateTextResponse> {
    const {
      prompt,
      model = GEMINI_MODELS.FLASH,
      temperature = 1,
      maxTokens = 2048,
      systemPrompt,
    } = request;

    const result = await generateText({
      model: gemini(model),
      prompt,
      temperature,
      maxTokens,
      system: systemPrompt,
    });

    return {
      text: result.text,
      finishReason: result.finishReason,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    };
  }

  /**
   * Stream text generation using Gemini
   *
   * @param request - Generation request parameters
   * @returns Stream object for real-time text generation
   */
  static async streamText(request: GenerateTextRequest) {
    const {
      prompt,
      model = GEMINI_MODELS.FLASH,
      temperature = 1,
      maxTokens = 2048,
      systemPrompt,
    } = request;

    return streamText({
      model: gemini(model),
      prompt,
      temperature,
      maxTokens,
      system: systemPrompt,
    });
  }

  /**
   * Generate structured object using Gemini
   *
   * This method generates a structured object that conforms to a Zod schema.
   * Useful for extracting structured data from unstructured text.
   *
   * @param request - Generation request with schema
   * @returns Typed object matching the schema
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   name: z.string(),
   *   age: z.number(),
   *   hobbies: z.array(z.string()),
   * });
   *
   * const result = await AiService.generateObject({
   *   prompt: "Extract user info: John is 25 and likes coding, reading",
   *   schema,
   * });
   *
   * // result.object is typed as { name: string; age: number; hobbies: string[] }
   * console.log(result.object.name); // "John"
   * ```
   */
  static async generateObject<T>(request: GenerateObjectRequest<T>) {
    const {
      prompt,
      schema,
      model = GEMINI_MODELS.FLASH,
      temperature = 1,
      systemPrompt,
    } = request;

    const result = await generateObject({
      model: gemini(model),
      prompt,
      temperature,
      system: systemPrompt,
      schema,
    });

    return {
      object: result.object as T,
      finishReason: result.finishReason,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    };
  }

  /**
   * Generate chat completion with conversation history
   *
   * @param messages - Array of chat messages
   * @param model - Gemini model to use
   * @returns Generated response
   */
  static async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    model: GeminiModel = GEMINI_MODELS.FLASH
  ) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const lastUserMessage = conversationMessages[conversationMessages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    // Build context from conversation history
    const context = conversationMessages
      .slice(0, -1)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const prompt = context
      ? `${context}\n\nuser: ${lastUserMessage.content}`
      : lastUserMessage.content;

    return this.generateText({
      prompt,
      model,
      systemPrompt: systemMessage?.content,
    });
  }
}
