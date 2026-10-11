// Turns a free-text memory into structured data with the OpenAI API.
// Shared by the Vite dev server (server/memoryApi.ts) and the Vercel function (api/memory.ts),
// so the API key stays server-side in both places.
//
//   request body  { text, hasPhoto, spots: [{ id, label }], layers: [{ year, label }] }
//   result        { status, json: { analysis } | { error } }

export const SHAPES = ['paper', 'book', 'vessel', 'box', 'sphere', 'soft', 'tall', 'other'] as const

export interface Options {
  apiKey?: string
  model?: string
  passcode?: string // if set, requests must carry the same value
}

export interface Body {
  text?: unknown
  hasPhoto?: unknown
  passcode?: unknown
  spots?: { id: string; label: string }[]
  layers?: { year: number; label: string }[]
}

function schema(spotIds: string[], years: number[]) {
  const str = { type: 'string' }
  const object = (properties: Record<string, unknown>) => ({
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  })
  return object({
    language: { ...str, description: 'BCP-47 tag of the language the memory was written in, e.g. "en", "zh-CN".' },
    title: { ...str, description: 'Name for this memory as an object, 2 to 4 words, like a museum label.' },
    object: object({
      name: { ...str, description: 'The physical thing at the centre of the memory.' },
      description: { ...str, description: 'One sentence on what it looks like, using only what was said or clearly implied.' },
      shape: { type: 'string', enum: SHAPES, description: 'Closest simple form for a 3D stand-in.' },
      color: { ...str, description: 'Its main colour as a #rrggbb hex value. If not stated, a plausible muted colour.' },
      sizeCm: { type: 'number', description: 'Longest side in centimetres, between 5 and 90.' },
    }),
    time: object({
      year: { type: ['integer', 'null'], description: 'Calendar year it happened, or null if it cannot be inferred.' },
      text: { ...str, description: 'When it happened, as a short human phrase ("Winter 2009", "a Sunday in the late nineties").' },
      certainty: { type: 'string', enum: ['exact', 'approximate', 'unknown'] },
    }),
    layer: { type: 'integer', enum: years, description: 'Which version of the home this memory belongs to.' },
    place: object({
      spotId: { type: 'string', enum: spotIds, description: 'The listed spot closest to where the object was.' },
      text: { ...str, description: 'Where in the home it was, in the words of the memory.' },
    }),
    people: { type: 'array', items: str, description: 'Who was there, as they are called in the memory. Empty if nobody is mentioned.' },
    event: { ...str, description: 'What happened, in one plain sentence.' },
    feeling: { ...str, description: 'The emotional tone in 1 to 3 words.' },
    story: { ...str, description: 'The memory retold in 2 or 3 restrained third-person sentences for a story card.' },
    parallel: {
      ...str,
      description:
        'One sentence beginning "In a parallel universe" (translated) describing the version of this home where the moment went differently. Quiet, concrete, not science fiction.',
    },
    quotes: object({
      time: { ...str, description: 'The exact words of the memory that say when, copied character for character. Empty string if none.' },
      object: { ...str, description: 'The exact words of the memory that name the object, copied character for character.' },
      place: { ...str, description: 'The exact words of the memory that say where the object was, copied character for character. Empty string if none.' },
      people: { ...str, description: 'The exact words of the memory that name who was there (the first mention), copied character for character. Empty string if none.' },
    }),
    followUp: { type: ['string', 'null'], description: 'One short question if the time or the object is missing, otherwise null.' },
  })
}

function systemPrompt(body: Required<Pick<Body, 'spots' | 'layers'>>) {
  return `You are the archivist of Dérive Home, a spatial memory map of one real apartment.
A resident describes something that happened in this home. Take the memory apart into time, object, place, people and event so it can be placed back into the 3D scan as a new object.

Rules:
- Use only what the resident said or clearly implied. Never invent names, dates or events. If something is missing, say so through "certainty" and "followUp" rather than guessing.
- Write every text field in the language the resident used.
- Today is ${new Date().toISOString().slice(0, 10)}. Resolve relative dates ("ten years ago") against it.
- "quotes" must be verbatim substrings of the resident's text, as short as possible (a few words each), so they can be highlighted in it.
- The tone is that of a careful museum label: concrete, warm, unsentimental. No exclamation marks.

Versions of the home (choose "layer" by who lived there at the time; if the time is unknown, choose the latest):
${body.layers.map((l) => `- ${l.year}: ${l.label}`).join('\n')}

Spots where an object can be placed (choose "place.spotId"; pick the nearest plausible one if none matches):
${body.spots.map((s) => `- ${s.id}: ${s.label}`).join('\n')}`
}

export async function analyze(body: Body, opts: Options) {
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return { status: 400, json: { error: 'Describe the memory first.' } }
  if (text.length > 4000) return { status: 400, json: { error: 'That memory is too long. Keep it under 4000 characters.' } }
  const spots = Array.isArray(body.spots) ? body.spots.filter((s) => s && typeof s.id === 'string') : []
  const layers = Array.isArray(body.layers) ? body.layers.filter((l) => l && Number.isInteger(l.year)) : []
  if (!spots.length || !layers.length) return { status: 400, json: { error: 'Missing spots or layers.' } }
  if (opts.passcode && body.passcode !== opts.passcode) {
    return { status: 401, json: { error: 'This deployment needs its access key. Open the link that ends in ?key=… once and try again.' } }
  }
  if (!opts.apiKey) {
    return {
      status: 503,
      json: { error: 'No OpenAI key found. Add OPENAI_API_KEY=sk-… to .env (local) or to the Vercel project environment variables.' },
    }
  }

  const model = opts.model || 'gpt-5-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({
      model,
      // keep reasoning models quick; older chat models do not accept this field
      ...(model.startsWith('gpt-5') ? { reasoning_effort: 'low' } : {}),
      messages: [
        { role: 'system', content: systemPrompt({ spots, layers }) },
        {
          role: 'user',
          content: body.hasPhoto ? `${text}\n\n(The resident also attached a photograph of the object. You cannot see it.)` : text,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'memory', strict: true, schema: schema(spots.map((s) => s.id), layers.map((l) => l.year)) },
      },
    }),
    signal: AbortSignal.timeout(60_000),
  })

  const data = (await res.json().catch(() => null)) as any
  if (!res.ok) {
    const detail = data?.error?.message ?? res.statusText
    console.error(`[memory] OpenAI ${res.status}: ${detail}`)
    return { status: 502, json: { error: `OpenAI (${model}) returned ${res.status}: ${detail}` } }
  }
  const message = data?.choices?.[0]?.message
  if (message?.refusal) return { status: 422, json: { error: message.refusal } }
  try {
    return { status: 200, json: { analysis: JSON.parse(message.content), model } }
  } catch {
    return { status: 502, json: { error: 'The model did not return valid JSON. Try again.' } }
  }
}
