import OpenAI from 'openai';

const OPENAI_MODELS = ['o3-mini', 'o1', 'gpt-4o'];
const OPENROUTER_MODELS = [
  'deepseek/deepseek-r1',
  // other models commented out
];

/**
 * Creates and configures an OpenAI client instance based on the requested model
 */
export function instantiateOpenAI(model: string): OpenAI {
  if (OPENAI_MODELS.includes(model)) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('missing OPENAI_API_KEY');
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else if (OPENROUTER_MODELS.includes(model)) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('missing OPENROUTER_API_KEY');
    }
    return new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }
  throw new Error(`unknown model '${model}'`);
}
