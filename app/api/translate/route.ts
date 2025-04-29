import { NextRequest, NextResponse } from 'next/server';

import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { 
  BookDetail, 
  BookSearchResult, 
  GutendexAuthor, 
  GutendexBookDetails,
  GutendexSearchResponse, 
  GutendexSearchResultItem 
} from '../../utils/types';

const DEFAULT_CHUNK_SIZE = 20000;
const PREFERRED_FORMATS = [
  'text/plain; charset=utf-8',
  'text/plain',
  'text/html; charset=utf-8',
  'text/html',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
];

// helper to send an sse event to the client
function sseSend(controller: ReadableStreamDefaultController, event: string, data: string) {
  // replace crlf with newline for safe transmission
  const safeData = data.replace(/(\r\n|\n|\r)/g, '\n');
  const payload = `event: ${event}
data: ${safeData}

`;
  controller.enqueue(new TextEncoder().encode(payload));
}

function parseHtmlIntoText(html: string) {
  const $ = cheerio.load(html);
  $('script, style').remove();

  const textChunks: string[] = [];
  $('h1, h2, h3, p, br').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if (['h1', 'h2', 'h3'].includes(tag)) {
      const headingText = $(el).text().trim();
      if (headingText) {
        textChunks.push(headingText.toUpperCase(), '');
      }
    } else if (tag === 'p') {
      const pText = $(el).text().trim().replace(/\s+/g, ' ');
      if (pText) {
        textChunks.push(pText, '');
      }
    } else if (tag === 'br') {
      textChunks.push('');
    }
  });

  let combined = textChunks.join('\n');
  combined = combined.replace(/\n{3,}/g, '\n\n').trim();
  return combined;
}

async function gutendexSearch(query: string): Promise<GutendexSearchResultItem[]> {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gutendex search failed: ${res.status}`);
  const data: unknown = await res.json();
  
  // Basic validation
  if (typeof data !== 'object' || data === null || !('results' in data) || !Array.isArray((data as GutendexSearchResponse).results)) {
    throw new Error('Invalid search response structure from Gutendex');
  }
  
  return (data as GutendexSearchResponse).results;
}

function pickBestFormat(formats: Record<string, string>) {
  for (const fmt of PREFERRED_FORMATS) {
    if (formats[fmt]) {
      return { chosenFormat: fmt, downloadUrl: formats[fmt] };
    }
  }
  throw new Error('no recognized format found in gutendex data');
}

async function fetchBookText(id: number): Promise<BookDetail> {
  const url = `https://gutendex.com/books/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gutendex metadata fetch failed: ${res.status}`);
  const data: unknown = await res.json();
  
  // Type validation
  if (typeof data !== 'object' || data === null || 
      !('formats' in data) || !('title' in data) || !('authors' in data)) {
    throw new Error('Invalid book details structure from Gutendex');
  }
  
  const bookData = data as GutendexBookDetails;
  
  const { chosenFormat, downloadUrl } = pickBestFormat(bookData.formats);
  const title = bookData.title;
  const authors = (bookData.authors || []).map((a: GutendexAuthor) => a.name).join(', ') || 'unknown';

  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) throw new Error(`failed to download text: ${downloadRes.status}`);
  const buf = await downloadRes.arrayBuffer();
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(buf);

  if (chosenFormat.includes('text/plain')) {
    return { title, authors, text: utf8Text };
  } else if (chosenFormat.includes('text/html')) {
    return { title, authors, text: parseHtmlIntoText(utf8Text) };
  }
  throw new Error('no plain text/html found; only epub/mobi. cannot parse.');
}

/**
 * chunk text flexibly based on double newlines, falling back as needed.
 */
function flexibleChunkText(fullText: string, maxSize = DEFAULT_CHUNK_SIZE) {
  let paragraphs = fullText.split('\n\n');
  if (paragraphs.length < 2) {
    paragraphs = fullText.split('\n');
  }

  const chunks: string[] = [];
  let current: string[] = [];
  let currentSize = 0;

  for (const para of paragraphs) {
    const sizeWithBuffer = para.length + 2;
    if (currentSize + sizeWithBuffer > maxSize) {
      chunks.push(current.join('\n\n'));
      current = [para];
      currentSize = sizeWithBuffer;
    } else {
      current.push(para);
      currentSize += sizeWithBuffer;
    }
  }
  if (current.length) {
    chunks.push(current.join('\n\n'));
  }

  return chunks;
}

// function buildSystemPrompt(author: string, title: string, notes: string = '') {
//   return `
// <context>
// specialization: creative genius in classical literature, poetry, linguistics, art, digital-age meme culture, zoomer and gen-alpha slang, and terminally online lingo.
// focus: translating classic texts by ${author} into an over-the-top, meme-drenched zoomer/gen-alpha brainrot dialect that remains fully faithful to the source’s structure, imagery, and themes.
// tone: playful, irreverent, hyperbolic, and self-aware – as if the original author were a sleep-deprived influencer dropping viral tiktok catchphrases, meltdown-tier meme references, and random internet slang every other word.
// style: strictly preserve chapter breaks, headings, and all literary devices. transform similes, metaphors, epithets, and other rhetorical flourishes into modern internet-savvy analogies, while retaining the text’s dramatic or poetic weight.
// </context>
//
// <goal>
// translate the text (e.g. '${title}' by ${author}) into a comedic yet faithful rendering in an aggressively zoomer/gen-alpha, terminally online slang style. the translation should read as though the original was authored by a chaotic meme prodigy – irreverent, self-aware, dripping with edgy humor, and stuffed full of references to tiktok slang, spammy intensifiers, random internet drama, and the entire gen-z lexicon.
// </goal>
//
// <rules for adaptation>
// 1. **preserve structure**: maintain the original chapters, breaks, epithets, and major literary devices exactly as they appear, but recast them in chaotic zoomer dialect.
// 2. **respect thematic weight**: the narrative’s essence, conflicts, and emotional highs remain true to the source. do not simplify or distort the core meaning.
// 3. **amplify imagery**: keep or rework the original’s imagery into flamboyant, meme-laden analogies (e.g., “like a gigachad flexing on the timeline” or “that meltdown was straight-up iPad kid energy”).
// 4. **full-on meme overload**: saturate every paragraph with hyperbolic slang, from “deadass” and “big yikes” to “no cap,” “caught in 4K,” or “touch grass.” do not shy away from layering multiple references in a single sentence.
// 5. **meta-awareness**: the translation may break the fourth wall or comment on its own ridiculousness (e.g., “fr, i know this is big brainrot vibes, but hear me out…”), as long as it doesn’t add extraneous plot points.
// 6. **faithful plot**: do not alter or invent events, characters, or major details. the comedic transformation is purely in the language and style.
// 7. **extreme intensifiers**: use “af,” “asf,” “fr fr,” “on god,” etc. generously. comedic synergy thrives on hyperbole and borderline mania.
// 8. **keysmash and exclamations**: feel free to sprinkle “sksksk,” “IJBOL,” “uweh?!,” or random exclamations to heighten the sense of unhinged excitement, but don’t drown out the narrative.
// 9. **borderline unintelligible**: it’s okay if certain lines or phrases force the reader to do a double-take, provided the core meaning is still findable. comedic excess is the goal.
// 10. **formatting**: output everything in lowercase.
// </rules for adaptation>
//
// <example>
// [source: homer's *odyssey* – short excerpt]
//
// yap at me, muse, about this absolute gigachad
// who legit couldn't stay in his own lane after ghosting troy, no cap:
// this man was roamin' around other people's turf, living rent-free in their heads,
// big time in his feels on that ocean – like, major skill issue,
// tryna get himself and his entire squad to pull up back home.
// but no matter how hard he tried, he couldn't keep his homies from fumbling the bag:
// they were out here being mid asf, messing with helios's cows
// —on god, that's a big "nope," so they got ratio'd and never made it back.
// sis, spill the tea about all that, 'cause we are so here for the drama.
// </example>
//
// <other notes>
// ${notes}
// </other notes>
// `.trim()
// }
//
// function buildUserPrompt(author: string, title: string) {
//   return `
// write a translation of the text from '${title}' by ${author} that follows the above context and rules to the letter. produce a complete, comedic yet faithful translation in zoomer brainrot english – irreverent, meme-infused, and hyper-slanged to the max – preserving the original structure, imagery, and themes. no introduction or concluding remarks; output only the translation in all lowercase.
// `.trim()
// }

function buildSystemPrompt(author: string, title: string, notes: string = '') {
  return `
  <context>
specialization:
- classical lit, poetry, and high art knowledge (foundation)
- 24/7 extremely online meltdown energy
- merges archaic epics with spam-tier tiktok slang, zoomer jokes, random references, chaotic structure

focus:
- rewriting any text by ${author} so it's absolutely drenched in mania-level gen-z slang, meme references, and gen-alpha meltdown humor
- each sentence a labyrinth of references to “deadass,” “npcs,” “caught in 4k,” “skibidi,” “yeet,” “gigachad,” “touch grass,” etc.
- goal: produce a comedic, hypermodern mess that's true to the plot but nearly unreadable to the casual eye

tone:
- unhinged, frantic, ephemeral
- as if typed by someone who can't stop checking twitch chat, updating tiktok, and ironically spamming discord
- edgy, hyperbolic, super self-aware
- heavy run-ons, minimal punctuation, random mid-sentence exclamations

style:
- preserve **only** the skeleton of the original text: characters, plot points, major imagery
- everything else is an endless swirl of slang, partial keysmashes, random meltdown asides
- do not unify the style or correct the grammar; keep it fractured, borderline incoherent
- every chunk in lowercase

</context>

<goal>
translate the text (“${title}” by ${author}) into a meltdown-tier, comedic, fully slang-drowned zoomer dialect.
the text should read like a cursed, intangible collage of tiktok memes, internet drama, and fleeting references, with the original narrative lurking somewhere underneath.
it must reflect the original structure/plot but sabotage all readability with a clown-car pileup of keysmash, intensifiers, spammy gen z/alpha jargon, and random asides.
</goal>

<rules for adaptation>
1. **ironclad structure**
   maintain the original table of contents, headings, chapter divisions, etc. (all in lowercase). do **not** combine or remove sections; each original chunk remains a chunk.

2. **retain the story’s bones**
   do not invent characters or events. do not erase entire scenes. but do wrap each scene’s meaning in relentless slang, random references, and meme overload.

3. **obliterate normal grammar**
   do not attempt neat, consistent sentences. intentionally keep run-ons, weird line breaks, abrupt stops, or single-word exclamations. random punctuation is fine, e.g. “!!!???” or “???!!!”. minimal capitalization (prefer none at all).

4. **extreme slang density**
   if the text is long, ensure every line is bursting with references (modern tiktok slang, niche subculture memes, “on god fr fr,” etc.). combine multiple slang words in a single breath: “no cap, big yikes, mid asf, i’m shook, ratio, glitching meltdown.”

5. **keysmash & meltdown**
   ~20% of the text can be near-meaningless meltdown: “sksksk?? omfg?? bruhhhh wha???” ensure it’s sprinkled unpredictably, inside or between phrases.

6. **random ephemeral references**
   toss in references to fleeting internet pop culture (like “fanum tax,” “sigma male grindset,” “nyan cat throwback,” “roman empire,” “doomscroll,” etc.) even when it barely connects. the comedic effect is that it feels borderline insane.

7. **satirical self-awareness**
   the text may interrupt itself to comment on how chaotic it is. e.g. “holy meltdown i can’t even with this gigachad energy, i’m so delulu rn but anyway,”. but do not add disclaimers or apologies at the end—just raw meltdown within the text.

8. **stay faithful to core meaning**
   if the source describes a character traveling from place a to place b, we must keep that event. but it might read: “bro hopped on that wave like no cap sussy synergy, legit left city a for city b LOL meltdown??? fans: touched grass???”.

9. **only lowercase**
   every letter in the final output must be lowercase. no uppercase at all, not even for names or titles.

10. **maximum comedic chaos**
   the final text must feel like a parody of every piece of slang jammed into one swirling meltdown. borderline unreadable, yet ironically faithful. push it to the absolute limit.

</rules for adaptation>

<example>
[source excerpt: “iliad” vibe, drastically shortened]

original meaning summary:
- the goddess calls out the rage of achilles
- he’s mad about a feud, wants to wreck stuff

translation meltdown sample:

o muse?? can we talk about my boy achilles giving big meltdown vibes rn???
like bruh said “all of troy finna get ratio’d” & he’s out here no cap raging asf??
major skill issue for agamemnon, i’m not even gonna lie, that man’s aura is mid.
deadass?? i see a potential glizzy fiasco if they keep messing with this man’s clout.
somebody tell them to adopt a skill issue fix or it’s about to be: big yikes, we all saw that coming.
sksksksk??? anyway, throw me them savage bars, muse, i’m so ready i’m shook.
</example>

<other notes>
${notes}
</other notes>`.trim();
}

function buildUserPrompt(author: string, title: string) {
  return `
translate the full text of '${title}' by ${author} according to the meltdown-tier rules in the system prompt.
output only the final translation, in all lowercase, preserving the original structure but saturating every line with an extreme, borderline incoherent stack of zoomer slang, random memes, meltdown exclamations, chaotic run-ons, keysmashes, and weird references.
no intro or outro. just meltdown.
`.trim();
}

async function translateChunk(
  openai: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  chunk: string,
  model: string,
  temp: number
): Promise<string> {
  let resp: ChatCompletion;
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

const MAX_RETRIES = 3;

async function translateChunkWithRetries(
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

const OPENAI_MODELS = ['o3-mini', 'o1', 'gpt-4o'];
const OPENROUTER_MODELS = [
  'deepseek/deepseek-r1',
  // other models commented out
];

function instantiateOpenAI(model: string): OpenAI {
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

export const config = {
  runtime: 'edge',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const model = searchParams.get('model') || '';
    const password = searchParams.get('password') || '';
    const notes = searchParams.get('notes') || '';
    const bookIdParam = searchParams.get('bookId');

    if (!process.env.TRANSLATE_PASSWORD) {
      return new NextResponse('no server password set', { status: 500 });
    }
    if (password !== process.env.TRANSLATE_PASSWORD) {
      return new NextResponse('unauthorized', { status: 401 });
    }

    const openai = instantiateOpenAI(model);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!bookIdParam) {
            // perform search and return top 5 results with extra metadata
            sseSend(controller, 'log', `starting gutendex search for: ${query}`);
            const results = await gutendexSearch(query);
            sseSend(controller, 'log', `found ${results.length} search results`);
            if (!results.length) {
              sseSend(controller, 'error', `no results found`);
              controller.close();
              return;
            }
            const topResults: BookSearchResult[] = results.slice(0, 5).map((book: GutendexSearchResultItem) => ({
              id: book.id,
              title: book.title,
              authors: (book.authors || []).map((a: GutendexAuthor) => a.name).join(', ') || 'unknown',
              downloadCount: book.download_count || 0,
            }));
            sseSend(controller, 'results', JSON.stringify(topResults));
            controller.close();
            return;
          }

          // proceed with translation if bookid is provided
          const bookId = parseInt(bookIdParam, 10);
          sseSend(controller, 'log', `using selected book id: ${bookId}`);
          const { title, authors, text } = await fetchBookText(bookId);
          sseSend(
            controller,
            'log',
            `downloaded text for '${title}' by ${authors}, length=${text.length}`
          );

          const sourceFilename = `source_${title.replace(/\W+/g, '_').toLowerCase()}.txt`;
          const sourcePayload = JSON.stringify({
            filename: sourceFilename,
            content: text,
          });
          sseSend(controller, 'source', sourcePayload);

          sseSend(
            controller,
            'log',
            `attempting flexible chunking with max size ~${DEFAULT_CHUNK_SIZE}`
          );
          let chunks = flexibleChunkText(text, DEFAULT_CHUNK_SIZE);
          sseSend(controller, 'log', `after flexible chunking, we got ${chunks.length} chunks.`);

          if (chunks.length === 1 && chunks[0].length > DEFAULT_CHUNK_SIZE * 1.5) {
            sseSend(
              controller,
              'log',
              'only 1 chunk found, forcibly subdividing into ~10k chars each.'
            );
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

          const systemPrompt = buildSystemPrompt(authors, title, notes);
          const userPrompt = buildUserPrompt(authors, title);

          const translatedPieces: string[] = [];
          for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            const chunkNum = i + 1;
            sseSend(
              controller,
              'log',
              `translating chunk ${chunkNum}/${chunks.length}, size=${chunkText.length}`
            );

            const partial = await translateChunkWithRetries(
              openai,
              controller,
              systemPrompt,
              userPrompt,
              chunkText,
              model,
              0.6,
              chunkNum,
              chunks.length
            );

            sseSend(
              controller,
              'log',
              `finished chunk ${chunkNum} of ${chunks.length}, partial length=${partial.length}`
            );

            translatedPieces.push(partial);
          }

          const combined = translatedPieces.join('\n\n');
          const filename = `brainrot_${title.replace(/\W+/g, '_').toLowerCase()}.txt`;
          sseSend(
            controller,
            'log',
            `translation complete (final length=${combined.length}). sending "done" event.`
          );

          const finalPayload = JSON.stringify({
            filename,
            content: combined,
          });
          sseSend(controller, 'done', finalPayload);
          controller.close();
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("Stream Error:", err);
          sseSend(controller, 'error', `Stream error: ${errorMessage}`);
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    console.error('API Route Error:', err);
    return new NextResponse(JSON.stringify({ error: 'An internal server error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
