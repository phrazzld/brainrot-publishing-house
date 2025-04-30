import { ReadableStreamDefaultController } from 'stream/web';
import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { sseSend } from '../utils/sseUtils';

const MAX_RETRIES = 3;

/**
 * Translates a single text chunk using the specified OpenAI model
 */
export async function translateChunk(
  openai: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  chunk: string,
  model: string,
  temp: number
): Promise<string> {
  let resp: ChatCompletion;
  
  // Different parameters based on model type
  if (['o3-mini', 'o1'].includes(model)) {
    resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${userPrompt}

---
original text chunk:

${chunk}`,
        },
      ],
      reasoning_effort: 'high',
    });
  } else {
    resp = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${userPrompt}

---
original text chunk:

${chunk}`,
        },
      ],
      temperature: temp,
    });
  }
  
  if (!resp.choices?.length) {
    throw new Error('[error: no choices returned]');
  }
  
  return resp.choices[0].message?.content || '[error: no content]';
}

/**
 * Translates a chunk with automatic retries on failure
 */
export async function translateChunkWithRetries(
  openai: OpenAI,
  sseController: ReadableStreamDefaultController,
  systemPrompt: string,
  userPrompt: string,
  chunk: string,
  model: string,
  temp: number,
  chunkIndex: number,
  chunkCount: number
): Promise<string> {
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      sseSend(
        sseController,
        'log',
        `attempt ${attempt}/${MAX_RETRIES} on chunk ${chunkIndex}/${chunkCount} with model '${model}' (chunk size=${chunk.length})`
      );
      
      const result = await translateChunk(openai, systemPrompt, userPrompt, chunk, model, temp);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      sseSend(
        sseController,
        'log',
        `error on attempt ${attempt} for chunk ${chunkIndex}/${chunkCount} (model '${model}'): ${errorMessage}`
      );
      
      if (attempt < MAX_RETRIES) {
        sseSend(sseController, 'log', 'retrying in 3s...');
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        // Re-throw original error if possible, or a new one with context
        if (err instanceof Error) {
          throw err;
        } else {
          throw new Error(`Translation failed after ${MAX_RETRIES} retries: ${errorMessage}`);
        }
      }
    }
  }
  
  throw new Error('all retries failed');
}