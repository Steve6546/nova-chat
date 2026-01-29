# AI Adapter Documentation

This document describes the AI adapter architecture used in the Roblox AI chat application.

## Overview

The AI adapter is implemented as Supabase Edge Functions that interface with the Lovable AI Gateway. It provides a unified interface for:
- Text generation (GPT-5.2, Gemini 3 Flash, Gemini 3 Pro)
- Image generation (Gemini 3 Pro Image)

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   Client    │────▶│  Edge Function   │────▶│  Lovable AI Gateway│
│  (React)    │◀────│  (chat/image)    │◀────│  (OpenAI/Google)   │
└─────────────┘     └──────────────────┘     └────────────────────┘
```

## Edge Functions

### `/functions/v1/chat`

Handles text-based AI conversations with streaming support.

**Request:**
```typescript
{
  messages: Array<{role: 'user' | 'assistant', content: string}>,
  model: string,        // e.g., "google/gemini-3-flash-preview"
  conversationId: string
}
```

**Response:** Server-Sent Events (SSE) stream

### `/functions/v1/generate-image`

Handles image generation requests.

**Request:**
```typescript
{
  prompt: string,
  conversationId: string
}
```

**Response:**
```typescript
{
  imageUrl: string,  // Base64 data URL
  text?: string      // Optional caption
}
```

## Supported Models

| Model ID | Name | Type | Description |
|----------|------|------|-------------|
| `openai/gpt-5.2` | GPT-5.2 | Text | Enhanced reasoning & problem-solving |
| `google/gemini-3-flash-preview` | Gemini 3 Flash | Text | Fast & balanced multimodal |
| `google/gemini-3-pro-preview` | Gemini 3 Pro | Text | Next-gen advanced reasoning |
| `google/gemini-3-pro-image-preview` | Gemini Image | Image | Advanced image generation |

## System Instructions

All text generation requests include comprehensive system instructions that configure the AI as a Roblox Studio expert. See `docs/system_instructions.md` for details.

## Error Handling

The adapter handles common error scenarios:
- **429 Too Many Requests**: Rate limiting exceeded
- **402 Payment Required**: Credits depleted
- **500 Internal Error**: Gateway or processing errors

## Security

- API keys are stored securely in Supabase secrets
- CORS headers are configured for web access
- JWT verification is disabled for public access (handled by client-side auth)

## Extending the Adapter

To add a new AI capability:

1. Create a new edge function in `supabase/functions/`
2. Add it to `supabase/config.toml`
3. Implement the Lovable AI Gateway call
4. Handle errors appropriately
5. Deploy with `supabase functions deploy`

## Local Development

Edge functions are automatically deployed when you make changes. To test locally:

```bash
# Functions are deployed automatically
# Check logs in the Lovable Cloud dashboard
```
