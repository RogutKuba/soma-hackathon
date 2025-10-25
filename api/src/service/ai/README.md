# AI Service - Google Gemini Integration

This service provides AI capabilities using Google's Gemini models through the Vercel AI SDK.

## Overview

The AI service follows the architecture pattern defined in `API_STRUCTURE.md`:
- **Library Layer** (`src/lib/ai.ts`): Initializes the Gemini client
- **Service Layer** (`src/service/ai/Ai.service.ts`): Exposes routes and business logic
- **Environment** (`src/lib/env.ts`): Validates required API keys

## Setup

### 1. Get API Key

Get your Google Gemini API key from: https://aistudio.google.com/app/apikey

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
GOOGLE_GEMINI_API_KEY=your_api_key_here
NODE_ENV=development
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Run the Server

```bash
bun dev
```

## Available Endpoints

### POST `/ai/generate`

Generate text completion using Gemini.

**Request:**
```json
{
  "prompt": "Explain quantum computing in simple terms",
  "model": "gemini-1.5-flash",
  "temperature": 1,
  "maxTokens": 2048,
  "systemPrompt": "You are a helpful assistant"
}
```

**Response:**
```json
{
  "text": "Generated text...",
  "finishReason": "stop",
  "usage": {
    "promptTokens": 10,
    "completionTokens": 50,
    "totalTokens": 60
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a haiku about coding",
    "temperature": 0.7
  }'
```

### POST `/ai/stream`

Stream text generation using Gemini (Server-Sent Events).

**Request:**
```json
{
  "prompt": "Write a long story about AI",
  "model": "gemini-1.5-flash"
}
```

**Response:**
Server-Sent Events stream with real-time text generation.

**JavaScript Example:**
```javascript
const response = await fetch('http://localhost:3000/ai/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Write a story about space exploration'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  console.log(text);
}
```

### GET `/ai/models`

List available Gemini models.

**Response:**
```json
{
  "models": [
    { "id": "gemini-1.5-flash", "name": "FLASH" },
    { "id": "gemini-1.5-flash-8b", "name": "FLASH_8B" },
    { "id": "gemini-1.5-pro", "name": "PRO" },
    { "id": "gemini-2.0-flash-exp", "name": "FLASH_2" }
  ],
  "default": "gemini-1.5-flash"
}
```

## Using the Service in Code

### Basic Text Generation

```typescript
import { AiService } from '@/service/ai/Ai.service';

const result = await AiService.generateText({
  prompt: 'Explain TypeScript generics',
  temperature: 0.7,
  systemPrompt: 'You are an expert programming teacher'
});

console.log(result.text);
```

### Streaming Text

```typescript
import { AiService } from '@/service/ai/Ai.service';

const stream = await AiService.streamText({
  prompt: 'Write a detailed tutorial on React hooks',
  model: 'gemini-1.5-pro'
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Structured Object Generation

Generate typed objects that conform to a schema:

```typescript
import { AiService } from '@/service/ai/Ai.service';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
  hobbies: z.array(z.string())
});

const result = await AiService.generateObject({
  prompt: 'Extract user info: John Doe, 28 years old, john@example.com, likes coding and hiking',
  schema: userSchema
});

// result.object is fully typed!
console.log(result.object.name);    // string
console.log(result.object.age);     // number
console.log(result.object.hobbies); // string[]
```

### Chat with Conversation History

```typescript
import { AiService } from '@/service/ai/Ai.service';

const messages = [
  { role: 'system', content: 'You are a helpful coding assistant' },
  { role: 'user', content: 'What is TypeScript?' },
  { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript...' },
  { role: 'user', content: 'Can you give me an example?' }
];

const result = await AiService.chat(messages);
console.log(result.text);
```

## Available Models

| Model | ID | Best For |
|-------|----|----|
| Flash | `gemini-1.5-flash` | Fast responses, general tasks, high throughput |
| Flash 8B | `gemini-1.5-flash-8b` | Ultra-fast, high volume, low latency |
| Pro | `gemini-1.5-pro` | Complex reasoning, analysis, long context |
| Flash 2.0 | `gemini-2.0-flash-exp` | Latest features, experimental |

## Parameters

### Common Parameters

- `prompt` (required): The input text prompt
- `model` (optional): Gemini model to use (default: `gemini-1.5-flash`)
- `temperature` (optional): Controls randomness (0-2, default: 1)
  - 0: Deterministic, focused
  - 1: Balanced creativity
  - 2: Very creative, random
- `maxTokens` (optional): Maximum tokens to generate (default: 2048)
- `systemPrompt` (optional): System instructions for the model

## Using in Background Jobs

Following the architecture pattern, you can use the AI service in Inngest jobs:

```typescript
// src/service/experiment/Experiment.jobs.ts
import { inngestClient } from '@/lib/inngest-client';
import { AiService } from '@/service/ai/Ai.service';

export const analyzeExperimentJob = inngestClient.createFunction(
  { id: 'analyze-experiment' },
  { event: 'experiment/analyze' },
  async ({ event, step }) => {
    const analysis = await step.run('analyze-results', async () => {
      return await AiService.generateText({
        prompt: `Analyze these experiment results: ${event.data.results}`,
        model: 'gemini-1.5-pro',
        systemPrompt: 'You are an expert data analyst'
      });
    });

    return { analysis: analysis.text };
  }
);
```

## Architecture

```
Client Request
      ↓
  POST /ai/generate
      ↓
aiRoutes (Elysia)
      ↓
AiService.generateText()
      ↓
gemini (AI SDK Client)
      ↓
Google Gemini API
```

## Best Practices

1. **Use appropriate models**: Use Flash for speed, Pro for complexity
2. **Set temperature wisely**: Lower for factual, higher for creative
3. **Add system prompts**: Guide the model's behavior and tone
4. **Handle errors**: Wrap AI calls in try-catch blocks
5. **Monitor usage**: Track token consumption for cost management
6. **Keep prompts clear**: Better prompts = better results

## Error Handling

```typescript
try {
  const result = await AiService.generateText({
    prompt: 'Your prompt here'
  });
  return result.text;
} catch (error) {
  if (error.message.includes('API key')) {
    // Handle authentication error
  } else if (error.message.includes('quota')) {
    // Handle rate limit
  } else {
    // Handle other errors
  }
}
```

## Cost Considerations

Gemini models have different pricing tiers. Monitor your usage:

```typescript
const result = await AiService.generateText({ prompt: '...' });

console.log(`Tokens used: ${result.usage.totalTokens}`);
console.log(`Prompt tokens: ${result.usage.promptTokens}`);
console.log(`Completion tokens: ${result.usage.completionTokens}`);
```

## Next Steps

1. **Add Database Integration**: Store AI conversations in the database
2. **Create Job Workflows**: Use AI in background jobs for experiments
3. **Add Caching**: Cache frequent prompts to reduce costs
4. **Add Rate Limiting**: Protect your API from abuse
5. **Add Prompt Templates**: Create reusable prompt templates

## References

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [API Structure](../../API_STRUCTURE.md)
