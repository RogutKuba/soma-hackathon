# AI Service Quick Start Guide

This guide will help you get started with the Google Gemini AI service integration.

## 📁 What Was Created

```
api/
├── src/
│   ├── lib/
│   │   ├── env.ts                    # Environment variable validation
│   │   └── ai.ts                     # Gemini client initialization
│   ├── service/
│   │   └── ai/
│   │       ├── Ai.service.ts         # AI service with routes & business logic
│   │       ├── README.md             # Detailed documentation
│   │       └── examples.ts           # Usage examples
│   └── index.ts                      # Updated with AI routes
├── .env.example                      # Environment variables template
└── tsconfig.json                     # Updated with path aliases
```

## 🚀 Quick Start

### 1. Install Dependencies

Already done! The following packages were installed:
- `ai` - Vercel AI SDK
- `@ai-sdk/google` - Google Gemini provider
- `zod` - Schema validation

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
# Get it from: https://aistudio.google.com/app/apikey
```

Your `.env` should look like:
```env
GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
NODE_ENV=development
```

### 3. Start the Server

```bash
bun dev
```

The server will start at `http://localhost:3000`

## 📝 Test the API

### Using cURL

```bash
# Test the API is running
curl http://localhost:3000

# Generate text
curl -X POST http://localhost:3000/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a haiku about TypeScript",
    "temperature": 0.8
  }'

# List available models
curl http://localhost:3000/ai/models
```

### Using JavaScript/Fetch

```javascript
// Generate text
const response = await fetch('http://localhost:3000/ai/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Explain REST APIs in simple terms',
    temperature: 0.7
  })
});

const result = await response.json();
console.log(result.text);
```

### Run Example File

```bash
# Make sure you have your API key in .env
bun run src/service/ai/examples.ts
```

This will run 10 different examples demonstrating various AI capabilities.

## 🎯 Common Use Cases

### 1. Text Generation

```typescript
import { AiService } from '@/service/ai/Ai.service';

const result = await AiService.generateText({
  prompt: 'Your prompt here',
  temperature: 0.7
});

console.log(result.text);
```

### 2. Streaming Responses

```typescript
const stream = await AiService.streamText({
  prompt: 'Write a long article...'
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### 3. Structured Data Extraction

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number()
});

const result = await AiService.generateObject({
  prompt: 'Extract: John Doe, john@example.com, 25 years old',
  schema
});

// result.object is fully typed!
console.log(result.object.name); // TypeScript knows this is a string
```

### 4. Chat with History

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi! How can I help?' },
  { role: 'user', content: 'Tell me about TypeScript' }
];

const result = await AiService.chat(messages);
```

## 📚 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/generate` | POST | Generate text completion |
| `/ai/stream` | POST | Stream text generation (SSE) |
| `/ai/models` | GET | List available Gemini models |

## 🎨 Available Models

| Model | Best For |
|-------|----------|
| `gemini-1.5-flash` | Fast responses, general tasks ⚡ |
| `gemini-1.5-flash-8b` | High volume, low latency 🚀 |
| `gemini-1.5-pro` | Complex reasoning, analysis 🧠 |
| `gemini-2.0-flash-exp` | Experimental features 🔬 |

## 🏗️ Architecture

The implementation follows the API structure pattern defined in `API_STRUCTURE.md`:

1. **Library Layer** (`src/lib/ai.ts`)
   - Initializes Gemini client
   - Defines available models
   - NEVER used directly

2. **Service Layer** (`src/service/ai/Ai.service.ts`)
   - Exports Elysia routes with `/ai` prefix
   - Exports `AiService` abstract class with static methods
   - All business logic lives here

3. **Environment** (`src/lib/env.ts`)
   - Validates required environment variables
   - Provides typed configuration

## 🔒 Best Practices

1. **Never expose the Gemini client directly** - Always use `AiService` methods
2. **Use appropriate models** - Flash for speed, Pro for complexity
3. **Set temperature wisely** - Lower (0-0.5) for factual, higher (1-2) for creative
4. **Add error handling** - Always wrap AI calls in try-catch
5. **Monitor token usage** - Track costs via `result.usage`

## 🧪 Testing

```typescript
// Test basic generation
const result = await AiService.generateText({
  prompt: 'Test',
  temperature: 0.7
});

console.assert(result.text.length > 0, 'Should generate text');
console.assert(result.usage.totalTokens > 0, 'Should report usage');
```

## 🔧 Next Steps

1. **Add Database Integration**
   - Store conversations in SQLite
   - Track usage per user

2. **Create Background Jobs**
   - Use with Inngest for async processing
   - See `API_STRUCTURE.md` for patterns

3. **Add Rate Limiting**
   - Protect your API from abuse
   - Use Elysia plugins

4. **Create Prompt Templates**
   - Reusable prompts for common tasks
   - Store in database or config

5. **Add Authentication**
   - Protect your AI endpoints
   - Track usage per user

## 📖 Documentation

- Full documentation: `src/service/ai/README.md`
- Code examples: `src/service/ai/examples.ts`
- API structure: `API_STRUCTURE.md`
- Vercel AI SDK: https://sdk.vercel.ai/docs
- Google Gemini: https://ai.google.dev/docs

## ❓ Troubleshooting

### "Missing required environment variable: GOOGLE_GEMINI_API_KEY"
- Make sure you created a `.env` file
- Add your API key from https://aistudio.google.com/app/apikey

### "Cannot find module '@/lib/ai'"
- Path aliases are configured in `tsconfig.json`
- Restart your IDE/editor to pick up changes

### API key errors
- Verify your key is valid
- Check if you have quota remaining
- Visit https://aistudio.google.com to check status

### Rate limiting
- Free tier has limits
- Consider upgrading or implementing caching

## 🎉 You're Ready!

The AI service is now fully set up and ready to use. Start building amazing AI-powered features!

```bash
# Start coding!
bun dev
```
