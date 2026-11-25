import { config } from '../config.js';
import type { AiProvider } from '../config.js';

export interface AIBlock {
  type: 'text' | 'image' | 'document';
  text?: string;
  mediaType?: string;
  /** داده‌ی base64 بدون پیشوند data: */
  data?: string;
}

export interface AIRequest {
  system?: string;
  content: AIBlock[];
  maxTokens?: number;
  temperature?: number;
  jsonSchema?: Record<string, unknown>;
  schemaName?: string;
  schemaDescription?: string;
}

export interface AIResult {
  text: string;
  json?: unknown;
  provider: string;
  model: string;
  demo: boolean;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AIStatus {
  provider: AiProvider;
  configured: boolean;
  demo: boolean;
  model: string;
  message: string;
}

class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new AIError('پاسخ سرویس هوش مصنوعی بیش از حد طول کشید. دوباره تلاش کنید.');
    }
    throw new AIError(`اتصال به سرویس هوش مصنوعی برقرار نشد: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new AIError('پاسخ مدل شامل JSON معتبر نبود.');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/* ============================== ارائه‌دهنده‌ها ============================== */

async function runAnthropic(req: AIRequest): Promise<AIResult> {
  const { apiKey, baseUrl, model, maxTokens } = config.ai.anthropic;
  if (!apiKey) throw new AIError('کلید ANTHROPIC_API_KEY تنظیم نشده است.');

  const content: unknown[] = req.content.map((block) => {
    if (block.type === 'text') return { type: 'text', text: block.text ?? '' };
    if (block.type === 'image') {
      return {
        type: 'image',
        source: { type: 'base64', media_type: block.mediaType ?? 'image/png', data: block.data ?? '' },
      };
    }
    return {
      type: 'document',
      source: { type: 'base64', media_type: block.mediaType ?? 'application/pdf', data: block.data ?? '' },
    };
  });

  const body: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? maxTokens,
    messages: [{ role: 'user', content }],
  };
  if (req.system) body.system = req.system;
  if (req.temperature !== undefined) body.temperature = req.temperature;

  if (req.jsonSchema) {
    body.tools = [
      {
        name: req.schemaName ?? 'emit_json',
        description: req.schemaDescription ?? 'خروجی ساختاریافته',
        input_schema: req.jsonSchema,
      },
    ];
    body.tool_choice = { type: 'tool', name: req.schemaName ?? 'emit_json' };
  }

  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/$/, '')}/v1/messages`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    },
    config.ai.requestTimeoutMs,
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new AIError(`خطای سرویس Anthropic (${response.status}): ${detail.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const toolUse = payload.content?.find((part) => part.type === 'tool_use');
  const textPart = payload.content?.find((part) => part.type === 'text');

  return {
    text: textPart?.text ?? '',
    json: toolUse?.input ?? (textPart?.text ? safeParse(textPart.text) : undefined),
    provider: 'anthropic',
    model,
    demo: false,
    usage: {
      inputTokens: payload.usage?.input_tokens,
      outputTokens: payload.usage?.output_tokens,
    },
  };
}

function safeParse(text: string): unknown {
  try {
    return extractJsonText(text);
  } catch {
    return undefined;
  }
}

async function runOpenAI(req: AIRequest): Promise<AIResult> {
  const { apiKey, baseUrl, model, maxTokens } = config.ai.openai;
  if (!apiKey) throw new AIError('کلید OPENAI_API_KEY تنظیم نشده است.');

  const userContent: unknown[] = req.content.map((block) => {
    if (block.type === 'text') return { type: 'text', text: block.text ?? '' };
    if (block.type === 'image') {
      return {
        type: 'image_url',
        image_url: { url: `data:${block.mediaType ?? 'image/png'};base64,${block.data ?? ''}` },
      };
    }
    return { type: 'text', text: '[فایل PDF پیوست شده است]' };
  });

  const messages: unknown[] = [];
  if (req.system) messages.push({ role: 'system', content: req.system });
  messages.push({ role: 'user', content: userContent });

  const body: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? maxTokens,
    messages,
    temperature: req.temperature ?? 0.2,
  };
  if (req.jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: req.schemaName ?? 'emit_json',
        schema: req.jsonSchema,
        strict: false,
      },
    };
  }

  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
    config.ai.requestTimeoutMs,
  );

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 400 && req.jsonSchema) {
      // برخی سرورها json_schema را پشتیبانی نمی‌کنند؛ با درخواست JSON ساده دوباره تلاش می‌کنیم.
      return runOpenAI({ ...req, jsonSchema: undefined, system: `${req.system ?? ''}\nفقط JSON معتبر پاسخ بده.`.trim() });
    }
    throw new AIError(`خطای سرویس OpenAI (${response.status}): ${detail.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = payload.choices?.[0]?.message?.content ?? '';

  return {
    text,
    json: req.jsonSchema ? safeParse(text) : undefined,
    provider: 'openai',
    model,
    demo: false,
    usage: {
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
    },
  };
}

async function runOllama(req: AIRequest): Promise<AIResult> {
  const { baseUrl, model, maxTokens } = config.ai.ollama;

  const images: string[] = [];
  const texts: string[] = [];
  for (const block of req.content) {
    if (block.type === 'text') texts.push(block.text ?? '');
    else if (block.type === 'image') images.push(block.data ?? '');
    else texts.push('[فایل PDF پیوست شده است]');
  }

  const messages: unknown[] = [];
  if (req.system) messages.push({ role: 'system', content: req.system });
  messages.push({
    role: 'user',
    content: texts.join('\n\n'),
    images: images.length ? images : undefined,
  });

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    options: { temperature: req.temperature ?? 0.2, num_predict: req.maxTokens ?? maxTokens },
  };
  if (req.jsonSchema) body.format = req.jsonSchema;

  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/$/, '')}/api/chat`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    config.ai.requestTimeoutMs,
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new AIError(`خطای سرویس Ollama (${response.status}): ${detail.slice(0, 400)}`);
  }

  const payload = (await response.json()) as { message?: { content?: string } };
  const text = payload.message?.content ?? '';
  return {
    text,
    json: req.jsonSchema ? safeParse(text) : undefined,
    provider: 'ollama',
    model,
    demo: false,
  };
}

/* ================================ حالت نمایشی =============================== */

const DEMO_QUESTIONS = [
  {
    type: 'MULTIPLE_CHOICE',
    title: 'کدام یک از گزینه‌های زیر یک پروتکل لایه‌ی شبکه نیست؟',
    description: '',
    options: [
      { text: 'TCP', isCorrect: false },
      { text: 'IP', isCorrect: false },
      { text: 'HTTP', isCorrect: true },
      { text: 'ARP', isCorrect: false },
    ],
    points: 2,
    difficulty: 2,
    explanation: 'HTTP پروتکل لایه‌ی کاربرد است.',
    tags: ['شبکه'],
    confidence: 0.92,
  },
  {
    type: 'TRUE_FALSE',
    title: 'در معماری سه‌لایه، لایه‌ی Presentation مسئول نمایش داده به کاربر است.',
    description: '',
    options: [
      { text: 'صحیح', isCorrect: true },
      { text: 'نادرست', isCorrect: false },
    ],
    points: 1,
    difficulty: 1,
    explanation: '',
    tags: [],
    confidence: 0.88,
  },
  {
    type: 'MULTIPLE_SELECT',
    title: 'کدام‌یک از موارد زیر از ویژگی‌های یک شبکه‌ی کامپیوتری است؟',
    description: '',
    options: [
      { text: 'اشتراک منابع', isCorrect: true },
      { text: 'قابلیت اطمینان', isCorrect: true },
      { text: 'دسترسی مستقل به یک دستگاه', isCorrect: false },
    ],
    points: 2.5,
    difficulty: 3,
    explanation: '',
    tags: ['مبانی'],
    confidence: 0.8,
  },
];

async function runDemo(req: AIRequest): Promise<AIResult> {
  if (req.jsonSchema && (req.schemaName ?? '').toLowerCase().includes('question')) {
    return {
      text: '',
      json: { questions: DEMO_QUESTIONS, notes: 'این خروجی نمایشی است.' },
      provider: 'demo',
      model: 'demo',
      demo: true,
    };
  }
  return {
    text: 'این یک پاسخ نمایشی است. برای دریافت نتیجه‌ی واقعی، کلید API سرویس هوش مصنوعی را تنظیم کنید.',
    provider: 'demo',
    model: 'demo',
    demo: true,
  };
}

/* ================================ نقطه‌ی ورود ============================== */

function providerModel(): string {
  switch (config.ai.provider) {
    case 'anthropic':
      return config.ai.anthropic.model;
    case 'openai':
      return config.ai.openai.model;
    case 'ollama':
      return config.ai.ollama.model;
    default:
      return 'demo';
  }
}

export function aiStatus(): AIStatus {
  const provider = config.ai.provider;
  const configured =
    (provider === 'anthropic' && !!config.ai.anthropic.apiKey) ||
    (provider === 'openai' && !!config.ai.openai.apiKey) ||
    (provider === 'ollama' && !!config.ai.ollama.baseUrl);

  let message = '';
  if (provider === 'none') {
    message = 'سرویس هوش مصنوعی غیرفعال است (AI_PROVIDER=none).';
  } else if (!configured) {
    message = `کلید یا آدرس سرویس «${provider}» تنظیم نشده است — حالت نمایشی فعال است.`;
  } else {
    message = `سرویس هوش مصنوعی: ${provider} (${providerModel()})`;
  }

  return { provider, configured, demo: !configured, model: providerModel(), message };
}

export async function runAI(req: AIRequest): Promise<AIResult> {
  const provider = config.ai.provider;
  const configured =
    (provider === 'anthropic' && !!config.ai.anthropic.apiKey) ||
    (provider === 'openai' && !!config.ai.openai.apiKey) ||
    (provider === 'ollama' && !!config.ai.ollama.baseUrl);

  if (!configured) return runDemo(req);

  if (provider === 'anthropic') return runAnthropic(req);
  if (provider === 'openai') return runOpenAI(req);
  if (provider === 'ollama') return runOllama(req);
  return runDemo(req);
}

export { AIError };
