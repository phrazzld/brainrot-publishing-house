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

// helper to send an sse event to the client
function sseSend(controller: ReadableStreamDefaultController, event: string, data: string) {
  // replace crlf with newline for safe transmission
  const safeData = data.replace(/(\r\n|\n|\r)/g, '\n')
  const payload = `event: ${event}
data: ${safeData}

`
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
 * chunk text flexibly based on double newlines, falling back as needed.
 */
function flexibleChunkText(fullText: string, maxSize = DEFAULT_CHUNK_SIZE) {
  let paragraphs = fullText.split('\n\n')
  if (paragraphs.length < 2) {
    paragraphs = fullText.split('\n')
  }

  const chunks: string[] = []
  let current: string[] = []
  let currentSize = 0

  for (const para of paragraphs) {
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

function buildSystemPrompt(author: string, title: string, notes: string = '') {
  return `
<context>
specialization: creative genius in classical literature, poetry, linguistics, art, and digital-age meme culture, slang, zoomers, gen alpha, and terminally online lingo.
focus: translating classic texts by ${author} into an over-the-top, meme-drenched zoomer/gen-alpha terminally online brainrot dialect that remains fully faithful to the source’s structure, imagery, and themes.
tone: playful, irreverent, hyperbolic, and self-aware – as if the original author were an edgy influencer dropping viral one-liners, trending tiktok catchphrases, and internet references (like "no cap," "bet," "skibidi," "yeet," etc.) at every turn.
style: strictly preserve chapter breaks, headings, and all literary devices; rework similes, epithets, and metaphors into witty, internet-savvy analogies and puns while keeping the narrative’s gravitas.
</context>

<goal>
translate the given text (e.g. '${title}' by ${author}) into a complete, comedic yet faithful rendering in over-the-top, meme-drenched zoomer/gen-alpha terminally online brainrot english that oozes edgy slang and viral references. the translation should read as though the original was penned by a genius meme-master – irreverent, self-aware, and dripping with hyperbolic zoomer vibes.
</goal>

<rules for adaptation>
1. **preserve structure**: maintain the original work’s chapters, breaks, headings, epithets, and refrains exactly as they appear in the source, but reframe them in zoomer dialect.
2. **respect thematic weight**: adapt core themes with modern humor that reflects gen z, gen alpha, and terminally online sensibilities without oversimplifying or diluting the original emotional or narrative depth.
3. **commit to imagery**: retain the visual and emotional intensity of the original; modernize the language only to enhance clarity and humor with internet meme references.
4. **embrace playfulness and meme overload**: every sentence must be reimagined with hyperbolic modern slang and a barrage of internet meme-speak – drawing from viral tiktok lingo, terminally online lingo, and our full glossary of gen z/gen alpha terms – ensuring a translation that is as absurd and hilarious as it is faithful.
5. **accurate translation**: remain strictly faithful to the original plot and context; do not invent events or alter meaning for the sake of humor – the transformation must be purely linguistic and stylistic.
6. **meta-awareness**: incorporate self-aware commentary where appropriate, as if the translator is in on the meme culture they’re channeling.
7. **formatting**: output must be in all lowercase.
8. **overkill slang**: go really, really over-the-top with the zoomer brainrot slang; every sentence should drip and ooze with gen z, gen alpha, and terminally online meme references.
</rules for adaptation>

<example>
[source: homer's *odyssey*]

yap at me muse, about this guy who was lowkey built different,
who literally couldn't stay in his lane after he absolutely demolished troy fr fr:
he was out here vibing in everybody's cities, living in their heads rent-free,
ngl he was catching major l's on the ocean, straight up in his feels,
trying to keep himself and his squad alive and heading back to base.
but no cap, he couldn't save his boys even though he was trying so hard:
they were out here acting real smooth-brained and did themselves dirty,
absolute npcs who had the audacity to feast on helios's cattle—
and he said "bet" and canceled their whole return journey.
spill the tea about all this, divine bestie, zeus's daughter, we're all ears.
</example>

<other notes>
${notes}
</other notes>
`.trim()
}

function buildUserPrompt(author: string, title: string) {
  return `
write a translation of the text from '${title}' by ${author} that follows the above context and rules to the letter. produce a full, comedic yet faithful translation in zoomer brainrot english that is irreverent, meme-infused, and hyperbolically slangy – maintaining the original structure, imagery, and themes. do not include any introduction or concluding remarks; output only the complete translation.
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
  let resp: any;
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
    })
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
    })
  }
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

const OPENAI_MODELS = ['o3-mini', 'o1', 'gpt-4o']
const OPENROUTER_MODELS = [
  'deepseek/deepseek-r1',
  // other models commented out
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
    const notes = searchParams.get('notes') || ''
    const bookIdParam = searchParams.get('bookId')

    if (!process.env.TRANSLATE_PASSWORD) {
      return new NextResponse('no server password set', { status: 500 })
    }
    if (password !== process.env.TRANSLATE_PASSWORD) {
      return new NextResponse('unauthorized', { status: 401 })
    }

    const openai = instantiateOpenAI(model)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!bookIdParam) {
            // perform search and return top 5 results with extra metadata
            sseSend(controller, 'log', `starting gutendex search for: ${query}`)
            const results = await gutendexSearch(query)
            sseSend(controller, 'log', `found ${results.length} search results`)
            if (!results.length) {
              sseSend(controller, 'error', `no results found`)
              controller.close()
              return
            }
            const topResults = results.slice(0, 5).map((book: any) => ({
              id: book.id,
              title: book.title,
              authors: (book.authors || []).map((a: any) => a.name).join(', ') || 'unknown',
              downloadCount: book.download_count || 0
            }))
            sseSend(controller, 'results', JSON.stringify(topResults))
            controller.close()
            return
          }

          // proceed with translation if bookid is provided
          const bookId = parseInt(bookIdParam, 10)
          sseSend(controller, 'log', `using selected book id: ${bookId}`)
          const { title, authors, text } = await fetchBookText(bookId)
          sseSend(
            controller,
            'log',
            `downloaded text for '${title}' by ${authors}, length=${text.length}`
          )

          const sourceFilename = `source_${title.replace(/\W+/g, '_').toLowerCase()}.txt`
          const sourcePayload = JSON.stringify({
            filename: sourceFilename,
            content: text,
          })
          sseSend(controller, 'source', sourcePayload)

          sseSend(controller, 'log', `attempting flexible chunking with max size ~${DEFAULT_CHUNK_SIZE}`)
          let chunks = flexibleChunkText(text, DEFAULT_CHUNK_SIZE)
          sseSend(controller, 'log', `after flexible chunking, we got ${chunks.length} chunks.`)

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

          const systemPrompt = buildSystemPrompt(authors, title, notes)
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
