import * as cheerio from 'cheerio'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const DEFAULT_CHUNK_SIZE = 20000
const PREFERRED_FORMATS = [
  'text/plain; charset=utf-8',
  'text/plain',
  'text/html; charset=utf-8',
  'text/html',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
]

// helper to send an SSE event to the client
function sseSend(controller: ReadableStreamDefaultController, event: string, data: string) {
  // data must be JSON-escaped or free of CRLF
  // we do a simple approach: replace CRLF with \n
  const safeData = data.replace(/\r?\n/g, '\n')
  const payload = `event: ${event}\ndata: ${safeData}\n\n`
  controller.enqueue(new TextEncoder().encode(payload))
}

function parseHtmlIntoText(html: string) {
  const $ = cheerio.load(html)
  $('script, style').remove()

  const textChunks: string[] = []
  $('h1, h2, h3, p, br').each((_, el) => {
    const tag = el.tagName.toLowerCase()
    if (['h1', 'h2', 'h3'].includes(tag)) {
      const headingText = $(el).text().trim()
      if (headingText) {
        textChunks.push(headingText.toUpperCase(), '')
      }
    } else if (tag === 'p') {
      const pText = $(el).text().trim().replace(/\s+/g, ' ')
      if (pText) {
        textChunks.push(pText, '')
      }
    } else if (tag === 'br') {
      textChunks.push('')
    }
  })

  let combined = textChunks.join('\n')
  combined = combined.replace(/\n{3,}/g, '\n\n').trim()
  return combined
}

async function gutendexSearch(query: string) {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`gutendex search failed: ${res.status}`)
  const data = await res.json()
  return data.results
}

function pickBestFormat(formats: Record<string, string>) {
  for (const fmt of PREFERRED_FORMATS) {
    if (formats[fmt]) {
      return { chosenFormat: fmt, downloadUrl: formats[fmt] }
    }
  }
  throw new Error('no recognized format found in gutendex data')
}

async function fetchBookText(id: number) {
  const url = `https://gutendex.com/books/${id}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`gutendex metadata fetch failed: ${res.status}`)
  const data = await res.json()

  const { chosenFormat, downloadUrl } = pickBestFormat(data.formats)
  const title = data.title
  const authors = (data.authors || []).map((a: any) => a.name).join(', ') || 'unknown'

  const downloadRes = await fetch(downloadUrl)
  if (!downloadRes.ok) throw new Error(`failed to download text: ${downloadRes.status}`)
  const buf = await downloadRes.arrayBuffer()
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(buf)

  if (chosenFormat.includes('text/plain')) {
    return { title, authors, text: utf8Text }
  } else if (chosenFormat.includes('text/html')) {
    return { title, authors, text: parseHtmlIntoText(utf8Text) }
  }
  throw new Error('no plain text/html found; only epub/mobi. cannot parse.')
}

/**
 * tries to chunk on double newlines first.
 * if that yields only 1 chunk of large size, try single newline approach.
 * or forcibly chunk by size in the worst case.
 */
function flexibleChunkText(fullText: string, maxSize = DEFAULT_CHUNK_SIZE) {
  // 1) attempt splitting on double newlines
  let paragraphs = fullText.split('\n\n')
  if (paragraphs.length < 2) {
    // might be a single block => try splitting on single newline
    paragraphs = fullText.split('\n')
  }

  // we now have an array of paragraphs (some might be short).
  const chunks: string[] = []
  let current: string[] = []
  let currentSize = 0

  for (const para of paragraphs) {
    // +2 accounts for double newlines we'll re-inject
    const sizeWithBuffer = para.length + 2
    if (currentSize + sizeWithBuffer > maxSize) {
      chunks.push(current.join('\n\n'))
      current = [para]
      currentSize = sizeWithBuffer
    } else {
      current.push(para)
      currentSize += sizeWithBuffer
    }
  }
  if (current.length) {
    chunks.push(current.join('\n\n'))
  }

  return chunks
}

function buildSystemPrompt(author: string, title: string) {
  return `
<context>
specialization: creative genius with mastery of poetry, history, linguistics, art, and classical literature
focus: translating classic works by ${author} into "zoomer brainrot" english dialect
style adherence: strict compliance with the example style provided below, emphasizing faithful adaptation of the source material’s poetic structure, imagery, and thematic resonance, while embracing a playful, irreverent, and highly colloquial tone. the translation should read as though the original author crafted the text in zoomer brainrot dialect, not as though a modern commentator is summarizing it.
</context>

<goal>
write translations of classic texts (like '${title}') into the zoomer brainrot dialect, capturing the original's meaning and poetic devices, including imagery, epithets, extended similes, and rhythm, while fully committing to the playful, irreverent voice. the final output should feel like an authentic, alternate-universe version of the original. successful output is a *translation*, not a summary.
</goal>

<example>
Yap at me Muse, about this guy who was lowkey built different,
who literally couldn't stay in his lane after he absolutely demolished Troy fr fr:
He was out here vibing in everybody's cities, living in their heads rent-free,
ngl he was catching major L's on the ocean, straight up in his feels,
trying to keep himself and his squad alive and heading back to base.
But no cap, he couldn't save his boys even though he was trying so hard:
they were out here acting real smooth-brained and did themselves dirty,
absolute NPCs who had the audacity to feast on Helios's cattle—
and he said "bet" and canceled their whole return journey.
Spill the tea about all this, divine bestie, Zeus's daughter, we're all ears.

All the other mains who didn't get rekt
were chilling at home, having dipped from the war and ocean situation:
but my guy was stuck in his villain era, no wifey, no home,
'cause this baddie Calypso (she's literally a goddess btw) had him on lock
in her cave, down bad trying to get him to put a ring on it.
But when the time finally came around in this whole seasonal rotation,
when the gods were like "aight, let him head back to his crib
in Ithaca"—but he was still catching hands even there,
even with his day ones. All the gods were like "free my man,"
except Poseidon was big mad, no chill,
beefing with god-tier Odysseus before he could pull up to his ends.

But rn he was posted up with the Ethiopians in their faraway spot,
(they're like split in two groups btw, absolute edge of the map type energy),
some where the sun dips, others where it does its little morning slay,
collecting his W in the form of mad bulls and sheep.
Man's was living his best life at the function, meanwhile all the other gods
were having a whole vibe check up in Zeus's crib on Olympus.
That's when the GOAT of gods and humans started spitting facts:
'cause he was thinking about that guy Aegisthus (absolute W person btw),
who got unalived by Orestes (Agamemnon's son, kind of a big deal):
thinking about all that, he started throwing shade to the immortal squad:
</example>

<rules for adaptation>
1. preserve structure: keep epithets, similes, refrains, just reframe them in zoomer dialect
2. keep thematic gravity: adapt core themes with modern humor but no oversimplification
3. commit to imagery: keep visual/emotional intensity, just modernize the language
4. embrace playfulness: infuse humor while keeping the story’s stakes real
5. accurate translation: preserve plot as much as possible; do not omit or distort events
6. do not use emojis
7. respond in all lowercase
8. maintain book / chapter breaks and headings as they are
</rules for adaptation>
`.trim()
}

function buildUserPrompt(author: string, title: string) {
  return `
now: write a translation of the text from '${title}' by ${author}.
preserve the structure and style, but let it drip with gen-z fervor.
do not write any prelude, nor any concluding remarks -- respond with the translation of the source material and *only* the translation of the source material.
`.trim()
}

async function translateChunk(
  openai: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  chunk: string,
  model: string,
  temp: number
): Promise<string> {
  const resp = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${userPrompt}\n\n---\noriginal text chunk:\n\n${chunk}`,
      },
    ],
    temperature: temp,
  })
  if (!resp.choices?.length) {
    throw new Error('[error: no choices returned]')
  }
  return resp.choices[0].message?.content || '[error: no content]'
}

const MAX_RETRIES = 3

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
  let attempt = 0
  while (attempt < MAX_RETRIES) {
    attempt++
    try {
      sseSend(
        sseController,
        'log',
        `attempt ${attempt}/${MAX_RETRIES} on chunk ${chunkIndex}/${chunkCount} with model '${model}' (chunk size=${chunk.length})`
      )
      const result = await translateChunk(openai, systemPrompt, userPrompt, chunk, model, temp)
      return result
    } catch (err: any) {
      sseSend(
        sseController,
        'log',
        `error on attempt ${attempt} for chunk ${chunkIndex}/${chunkCount} (model '${model}'): ${String(err)}`
      )
      if (attempt < MAX_RETRIES) {
        sseSend(sseController, 'log', 'retrying in 3s...')
        await new Promise((r) => setTimeout(r, 3000))
      } else {
        throw err
      }
    }
  }
  throw new Error('all retries failed')
}

const OPENAI_MODELS = ['gpt-4o']
const OPENROUTER_MODELS = [
  'deepseek/deepseek-r1',
  'anthropic/claude-3.5-sonnet:beta',
  'anthropic/claude-3.5-sonnet'
]

function instantiateOpenAI(model: string): OpenAI {
  if (OPENAI_MODELS.includes(model)) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('missing OPENAI_API_KEY')
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  } else if (OPENROUTER_MODELS.includes(model)) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('missing OPENROUTER_API_KEY')
    }
    return new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }
  throw new Error(`unknown model '${model}'`)
}

export const config = {
  runtime: 'edge',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const model = searchParams.get('model') || ''
    const password = searchParams.get('password') || ''

    if (!process.env.TRANSLATE_PASSWORD) {
      return new NextResponse('no server password set', { status: 500 })
    }
    if (password !== process.env.TRANSLATE_PASSWORD) {
      return new NextResponse('unauthorized', { status: 401 })
    }

    if (!query.trim()) {
      return new NextResponse('missing query param', { status: 400 })
    }
    if (!model) {
      return new NextResponse('missing model param', { status: 400 })
    }

    const openai = instantiateOpenAI(model)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          sseSend(controller, 'log', `starting gutendex search for: ${query}`)
          const results = await gutendexSearch(query)
          sseSend(controller, 'log', `found ${results.length} search results`)

          if (!results.length) {
            sseSend(controller, 'error', `no results found`)
            controller.close()
            return
          }

          const best = results[0]
          sseSend(controller, 'log', `using first result: ${best.title} (id=${best.id})`)

          const { title, authors, text } = await fetchBookText(best.id)
          sseSend(
            controller,
            'log',
            `downloaded text for '${title}' by ${authors}, length=${text.length}`
          )

          // send "source" event
          const sourceFilename = `source_${title.replace(/\W+/g, '_').toLowerCase()}.txt`
          const sourcePayload = JSON.stringify({
            filename: sourceFilename,
            content: text,
          })
          sseSend(controller, 'source', sourcePayload)

          sseSend(controller, 'log', `attempting flexible chunking with max size ~${DEFAULT_CHUNK_SIZE}`)
          let chunks = flexibleChunkText(text, DEFAULT_CHUNK_SIZE)
          sseSend(controller, 'log', `after flexible chunking, we got ${chunks.length} chunks.`)

          // if for some reason it's still only 1 chunk but it's huge, forcibly chop it up
          // to smaller segments. e.g. chunk the single chunk into smaller slices:
          // note: you can skip this if you trust flexibleChunkText is enough.
          if (chunks.length === 1 && chunks[0].length > DEFAULT_CHUNK_SIZE * 1.5) {
            sseSend(controller, 'log', 'only 1 chunk found, forcibly subdividing into ~10k chars each.')
            const forcedSubChunks: string[] = []
            const single = chunks[0]
            let start = 0
            const forcedSize = 10000
            while (start < single.length) {
              forcedSubChunks.push(single.slice(start, start + forcedSize))
              start += forcedSize
            }
            chunks = forcedSubChunks
            sseSend(controller, 'log', `forced chunking yields ${chunks.length} chunk(s).`)
          }

          sseSend(controller, 'log', `final chunk count: ${chunks.length}`)

          const systemPrompt = buildSystemPrompt(authors, title)
          const userPrompt = buildUserPrompt(authors, title)

          const translatedPieces: string[] = []
          for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i]
            const chunkNum = i + 1
            sseSend(
              controller,
              'log',
              `translating chunk ${chunkNum}/${chunks.length}, size=${chunkText.length}`
            )

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
            )

            sseSend(
              controller,
              'log',
              `finished chunk ${chunkNum} of ${chunks.length}, partial length=${partial.length}`
            )

            translatedPieces.push(partial)
          }

          const combined = translatedPieces.join('\n\n')
          const filename = `brainrot_${title.replace(/\W+/g, '_').toLowerCase()}.txt`
          sseSend(controller, 'log', `translation complete (final length=${combined.length}). sending "done" event.`)

          const finalPayload = JSON.stringify({
            filename,
            content: combined,
          })
          sseSend(controller, 'done', finalPayload)
          controller.close()
        } catch (err: any) {
          sseSend(controller, 'error', `caught error: ${String(err)}`)
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (err: any) {
    return new NextResponse(`error: ${String(err)}`, { status: 500 })
  }
}
