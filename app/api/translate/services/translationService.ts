import OpenAI from 'openai';
import { ReadableStreamDefaultController } from 'stream/web';

import { sseSend } from '../utils/sseUtils';

const MAX_RETRIES = 3;

/**
 * Options for the translateChunk function.
 */
export interface TranslateChunkOptions {
  openai: OpenAI;
  systemPrompt: string;
  userPrompt: string;
  chunk: string;
  model: string;
  temp: number;
}

/**
 * Options for the translateChunkWithRetries function.
 */
export interface TranslateChunkWithRetriesOptions {
  openai: OpenAI;
  sseController: ReadableStreamDefaultController;
  systemPrompt: string;
  userPrompt: string;
  chunk: string;
  model: string;
  temp: number;
  chunkIndex: number; // 0-based index
  chunkCount: number;
}

/**
 * Translates a single text chunk using the specified OpenAI model.
 * @param options - The translation parameters.
 * @returns The translated text chunk.
 */
export async function translateChunk(options: TranslateChunkOptions): Promise<string> {
  const { openai, systemPrompt, userPrompt, chunk, model, temp } = options;

  const basePayload = {
    model,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: `${userPrompt}

---
original text chunk:

${chunk}`,
      },
    ],
  };

  // Use reasoning_effort or temperature based on model
  const payload = ['o3-mini', 'o1'].includes(model)
    ? { ...basePayload, reasoning_effort: 'high' as const } // Specific to certain models
    : { ...basePayload, temperature: temp };

  const resp = await openai.chat.completions.create(payload);

  if (!resp.choices?.length) {
    throw new Error('[error: no choices returned]');
  }

  return resp.choices[0].message?.content || '[error: no content]';
}

/**
 * Translates a chunk with automatic retries on failure.
 * @param options - The translation parameters including retry context.
 * @returns The translated text chunk after successful translation or throws after retries.
 */
export async function translateChunkWithRetries(
  options: TranslateChunkWithRetriesOptions
): Promise<string> {
  const {
    openai,
    sseController,
    systemPrompt,
    userPrompt,
    chunk,
    model,
    temp,
    chunkIndex,
    chunkCount,
  } = options;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      // Use 1-based index for user-facing logs
      sseSend(
        sseController,
        'log',
        `attempt ${attempt}/${MAX_RETRIES} on chunk ${chunkIndex + 1}/${chunkCount} with model '${model}' (chunk size=${chunk.length})`
      );

      // Prepare options for the underlying translateChunk call
      const translateOptions: TranslateChunkOptions = {
        openai,
        systemPrompt,
        userPrompt,
        chunk,
        model,
        temp,
      };

      // Call translateChunk with the options object
      const result = await translateChunk(translateOptions);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Use 1-based index for user-facing logs
      sseSend(
        sseController,
        'log',
        `error on attempt ${attempt} for chunk ${chunkIndex + 1}/${chunkCount} (model '${model}'): ${errorMessage}`
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
