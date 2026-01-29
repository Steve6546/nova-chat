export type MessageRole = 'user' | 'assistant' | 'system';
export type ContentType = 'text' | 'code' | 'image';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  content_type: ContentType;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model_default: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'image';
  badge: 'gpt' | 'gemini' | 'image';
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    description: 'Enhanced reasoning & complex problem-solving',
    type: 'text',
    badge: 'gpt',
  },
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Fast & balanced multimodal',
    type: 'text',
    badge: 'gemini',
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'Next-gen advanced reasoning',
    type: 'text',
    badge: 'gemini',
  },
  {
    id: 'google/gemini-3-pro-image-preview',
    name: 'Gemini Image',
    description: 'Advanced image generation',
    type: 'image',
    badge: 'image',
  },
];

export const DEFAULT_MODEL = 'google/gemini-3-flash-preview';
