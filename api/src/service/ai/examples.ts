/**
 * AI Service Usage Examples
 *
 * This file contains practical examples of using the AI service.
 * Run individual examples with: bun run src/service/ai/examples.ts
 */

import { AiService } from './Ai.service';
import { z } from 'zod';
import { GEMINI_MODELS } from '@/lib/ai';

/**
 * Example 1: Basic Text Generation
 */
async function basicTextGeneration() {
  console.log('=== Example 1: Basic Text Generation ===\n');

  const result = await AiService.generateText({
    prompt: 'Explain what TypeScript is in 2-3 sentences.',
    temperature: 0.7,
  });

  console.log('Generated Text:');
  console.log(result.text);
  console.log('\nUsage:', result.usage);
  console.log('---\n');
}

/**
 * Example 2: Text Generation with System Prompt
 */
async function textGenerationWithSystemPrompt() {
  console.log('=== Example 2: Text Generation with System Prompt ===\n');

  const result = await AiService.generateText({
    prompt: 'How do I center a div?',
    systemPrompt: 'You are a senior frontend developer. Give concise, practical answers with code examples.',
    model: GEMINI_MODELS.FLASH,
    temperature: 0.5,
  });

  console.log('Generated Text:');
  console.log(result.text);
  console.log('---\n');
}

/**
 * Example 3: Streaming Text Generation
 */
async function streamingTextGeneration() {
  console.log('=== Example 3: Streaming Text Generation ===\n');

  const stream = await AiService.streamText({
    prompt: 'Write a short poem about coding.',
    temperature: 1.2,
  });

  console.log('Streaming output:');
  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }
  console.log('\n---\n');
}

/**
 * Example 4: Structured Object Generation
 */
async function structuredObjectGeneration() {
  console.log('=== Example 4: Structured Object Generation ===\n');

  // Define a schema for user data
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
    occupation: z.string(),
    hobbies: z.array(z.string()),
  });

  const result = await AiService.generateObject({
    prompt: `Extract user information from this text:
    "Sarah Johnson is a 32-year-old software engineer. Her email is sarah.j@example.com.
    In her free time, she enjoys rock climbing, reading sci-fi novels, and playing the guitar."`,
    schema: userSchema,
    temperature: 0.3, // Lower temperature for more deterministic extraction
  });

  console.log('Extracted User Data:');
  console.log(JSON.stringify(result.object, null, 2));
  console.log('\nUsage:', result.usage);
  console.log('---\n');
}

/**
 * Example 5: Complex Structured Data
 */
async function complexStructuredData() {
  console.log('=== Example 5: Complex Structured Data ===\n');

  // Define a schema for a recipe
  const recipeSchema = z.object({
    name: z.string(),
    cuisine: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    prepTime: z.number().describe('Preparation time in minutes'),
    cookTime: z.number().describe('Cooking time in minutes'),
    servings: z.number(),
    ingredients: z.array(
      z.object({
        item: z.string(),
        amount: z.string(),
      })
    ),
    steps: z.array(z.string()),
    tags: z.array(z.string()),
  });

  const result = await AiService.generateObject({
    prompt: 'Create a simple pasta carbonara recipe',
    schema: recipeSchema,
    temperature: 0.8,
  });

  console.log('Generated Recipe:');
  console.log(JSON.stringify(result.object, null, 2));
  console.log('---\n');
}

/**
 * Example 6: Chat with Conversation History
 */
async function chatWithHistory() {
  console.log('=== Example 6: Chat with Conversation History ===\n');

  const messages = [
    {
      role: 'system' as const,
      content: 'You are a helpful coding assistant specializing in JavaScript and TypeScript.',
    },
    {
      role: 'user' as const,
      content: 'What is the difference between map and forEach?',
    },
    {
      role: 'assistant' as const,
      content:
        'map() returns a new array with transformed elements, while forEach() just iterates without returning anything.',
    },
    {
      role: 'user' as const,
      content: 'Can you show me an example of both?',
    },
  ];

  const result = await AiService.chat(messages, GEMINI_MODELS.FLASH);

  console.log('Chat Response:');
  console.log(result.text);
  console.log('---\n');
}

/**
 * Example 7: Code Analysis
 */
async function codeAnalysis() {
  console.log('=== Example 7: Code Analysis ===\n');

  const codeToAnalyze = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}
  `;

  const result = await AiService.generateText({
    prompt: `Analyze this code and suggest improvements:\n\`\`\`javascript${codeToAnalyze}\`\`\``,
    systemPrompt:
      'You are a code reviewer. Provide constructive feedback on code quality, performance, and best practices.',
    model: GEMINI_MODELS.PRO,
    temperature: 0.5,
  });

  console.log('Code Analysis:');
  console.log(result.text);
  console.log('---\n');
}

/**
 * Example 8: Multiple Model Comparison
 */
async function modelComparison() {
  console.log('=== Example 8: Multiple Model Comparison ===\n');

  const prompt = 'Explain recursion in one sentence.';

  console.log(`Prompt: "${prompt}"\n`);

  // Test with Flash model
  const flashResult = await AiService.generateText({
    prompt,
    model: GEMINI_MODELS.FLASH,
    temperature: 0.7,
  });

  console.log('FLASH Model Response:');
  console.log(flashResult.text);
  console.log('Tokens:', flashResult.usage.totalTokens);
  console.log();

  // Test with Pro model
  const proResult = await AiService.generateText({
    prompt,
    model: GEMINI_MODELS.PRO,
    temperature: 0.7,
  });

  console.log('PRO Model Response:');
  console.log(proResult.text);
  console.log('Tokens:', proResult.usage.totalTokens);
  console.log('---\n');
}

/**
 * Example 9: Error Handling
 */
async function errorHandling() {
  console.log('=== Example 9: Error Handling ===\n');

  try {
    const result = await AiService.generateText({
      prompt: 'Test prompt',
      temperature: 0.7,
    });
    console.log('Success:', result.text);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error occurred:', error.message);

      // Handle specific error types
      if (error.message.includes('API key')) {
        console.error('Authentication failed. Check your GOOGLE_GEMINI_API_KEY');
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        console.error('Rate limit exceeded. Try again later.');
      } else {
        console.error('Unknown error:', error);
      }
    }
  }
  console.log('---\n');
}

/**
 * Example 10: Batch Processing
 */
async function batchProcessing() {
  console.log('=== Example 10: Batch Processing ===\n');

  const prompts = [
    'Name a popular programming language',
    'Name a popular framework',
    'Name a popular database',
  ];

  console.log('Processing multiple prompts in parallel...\n');

  const results = await Promise.all(
    prompts.map((prompt) =>
      AiService.generateText({
        prompt,
        temperature: 0.8,
        maxTokens: 50,
      })
    )
  );

  results.forEach((result, index) => {
    console.log(`Prompt ${index + 1}: "${prompts[index]}"`);
    console.log(`Response: ${result.text}`);
    console.log();
  });

  console.log('---\n');
}

// Run examples
async function main() {
  try {
    // Run each example
    await basicTextGeneration();
    await textGenerationWithSystemPrompt();
    await streamingTextGeneration();
    await structuredObjectGeneration();
    await complexStructuredData();
    await chatWithHistory();
    await codeAnalysis();
    await modelComparison();
    await errorHandling();
    await batchProcessing();

    console.log('✅ All examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.main) {
  main();
}
