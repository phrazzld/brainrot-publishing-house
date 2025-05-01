import OpenAI from 'openai';
import { ReadableStreamDefaultController } from 'stream/web';

import { fetchBookText } from '../services/gutendexService';
import {
  TranslateChunkWithRetriesOptions,
  translateChunkWithRetries,
} from '../services/translationService';
import { buildSystemPrompt, buildUserPrompt } from '../utils/promptUtils';
import { sseSend } from '../utils/sseUtils';
import { flexibleChunkText } from '../utils/textUtils';

const DEFAULT_CHUNK_SIZE = 20000;
const DEFAULT_TEMP = 0.6; // Define default temperature

/**
 * Options for handling a translation request for a specific book.
 */
export interface HandleTranslationRequestOptions {
  bookId: number;
  model: string;
  notes: string;
  openai: OpenAI;
  controller: ReadableStreamDefaultController;
  // Optional: Allow overriding default temperature if needed in the future
  temp?: number;
}

/**
 * Options for translating all text chunks.
 */
interface TranslateAllChunksOptions {
  chunks: string[];
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temp: number;
  openai: OpenAI;
  controller: ReadableStreamDefaultController;
}

/**
 * Handles the translation functionality when a bookId is provided.
 * Fetches book text, chunks it, translates each chunk, and streams the result.
 * @param options - The parameters for the translation request.
 */
export async function handleTranslationRequest(
  options: HandleTranslationRequestOptions
): Promise<void> {
  const { bookId, model, notes, openai, controller } = options;
  const temp = options.temp ?? DEFAULT_TEMP; // Use provided temp or default

  try {
    // Fetch and log book text
    sseSend(controller, 'log', `using selected book id: ${bookId}`);
    const { title, authors, text } = await fetchBookText(bookId);
    sseSend(
      controller,
      'log',
      `downloaded text for '${title}' by ${authors}, length=${text.length}`
    );

    // Send source text to client
    await sendSourceText(title, text, controller);

    // Chunk the text for processing
    const chunks = chunkTextForProcessing(text, controller);

    // Generate prompts
    const systemPrompt = buildSystemPrompt(authors, title, notes);
    const userPrompt = buildUserPrompt(authors, title);

    // Translate chunks and combine results
    const translateAllOptions: TranslateAllChunksOptions = {
      chunks,
      systemPrompt,
      userPrompt,
      model,
      temp,
      openai,
      controller,
    };

    // Call translateAllChunks with the options object
    const combined = await translateAllChunks(translateAllOptions);

    // Send final translation
    await sendFinalTranslation(title, combined, controller);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Error is sent to the client via SSE
    sseSend(controller, 'error', `Handler Error: ${message}`);
    controller.close(); // Ensure controller is closed on error
  }
}

/**
 * Sends the original source text to the client
 */
async function sendSourceText(
  title: string,
  text: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const sourceFilename = `source_${title.replace(/\W+/g, '_').toLowerCase()}.txt`;
  const sourcePayload = JSON.stringify({
    filename: sourceFilename,
    content: text,
  });
  sseSend(controller, 'source', sourcePayload);
}

/**
 * Chunks text for processing, with adaptive sizing based on content
 */
function chunkTextForProcessing(
  text: string,
  controller: ReadableStreamDefaultController
): string[] {
  sseSend(controller, 'log', `attempting flexible chunking with max size ~${DEFAULT_CHUNK_SIZE}`);

  let chunks = flexibleChunkText(text, DEFAULT_CHUNK_SIZE);
  sseSend(controller, 'log', `after flexible chunking, we got ${chunks.length} chunks.`);

  // Force subdivision if we ended up with a single large chunk
  if (chunks.length === 1 && chunks[0].length > DEFAULT_CHUNK_SIZE * 1.5) {
    sseSend(controller, 'log', 'only 1 chunk found, forcibly subdividing into ~10k chars each.');

    const forcedSubChunks: string[] = [];
    const single = chunks[0];
    let start = 0;
    const forcedSize = 10000;

    while (start < single.length) {
      forcedSubChunks.push(single.slice(start, start + forcedSize));
      start += forcedSize;
    }

    chunks = forcedSubChunks;
    sseSend(controller, 'log', `forced chunking yields ${chunks.length} chunk(s).`);
  }

  sseSend(controller, 'log', `final chunk count: ${chunks.length}`);
  return chunks;
}

/**
 * Translates all chunks and combines them into a single text.
 * @param options - The parameters for translating all chunks.
 * @returns The combined translated text.
 */
async function translateAllChunks(options: TranslateAllChunksOptions): Promise<string> {
  const { chunks, systemPrompt, userPrompt, model, temp, openai, controller } = options;
  const translatedPieces: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkNum = i + 1; // Use 1-based index for logging
    sseSend(
      controller,
      'log',
      `translating chunk ${chunkNum}/${chunks.length}, size=${chunkText.length}`
    );

    // Prepare options for translateChunkWithRetries
    const retryOptions: TranslateChunkWithRetriesOptions = {
      openai,
      sseController: controller,
      systemPrompt,
      userPrompt,
      chunk: chunkText,
      model,
      temp,
      chunkIndex: i, // Use 0-based index internally
      chunkCount: chunks.length,
    };

    // Call translateChunkWithRetries with the options object
    const partial = await translateChunkWithRetries(retryOptions);

    sseSend(
      controller,
      'log',
      `finished chunk ${chunkNum} of ${chunks.length}, partial length=${partial.length}`
    );

    translatedPieces.push(partial);
  }

  return translatedPieces.join('\n\n');
}

/**
 * Sends the final translation to the client
 */
async function sendFinalTranslation(
  title: string,
  translatedText: string,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const filename = `brainrot_${title.replace(/\W+/g, '_').toLowerCase()}.txt`;
  sseSend(
    controller,
    'log',
    `translation complete (final length=${translatedText.length}). sending "done" event.`
  );

  const finalPayload = JSON.stringify({
    filename,
    content: translatedText,
  });

  sseSend(controller, 'done', finalPayload);
  controller.close();
}
