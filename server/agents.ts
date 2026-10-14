// The agents behind POST /api/agent. Each one owns a single job and its own model:
//
//   interview   asks one question at a time to fill what a placed memory is missing
//   historian   links one memory to the nodes already in the home, across years
//   literature  turns a pasted story into scenes that can be staged in the home
//   compare     describes what changed between two versions of the home
//
// (Memory Capture, the fifth agent, is server/analyze.ts behind /api/memory.)
// Shared by the Vite dev server (server/memoryApi.ts) and the Vercel function (api/agent.ts).
import { AgentError, arr, nullable, obj, openai, str, type Provider } from './provider.js'

export type AgentName = 'interview' | 'historian' | 'literature' | 'compare'

export interface AgentOptions {
  apiKey?: string
  passcode?: string
  models?: Partial<Record<AgentName, string>>
}

// A fast model where the job is extraction, a stronger one where it is judgement,
// a long-context one for whole stories.
const DEFAULT_MODELS: Record<AgentName, string> = {
  interview: 'gpt-5-mini',
  historian: 'gpt-5',
  literature: 'gpt-4.1',
  compare: 'gpt-5-mini',
}

export const RELATIONSHIPS = ['same_object', 'moved', 'inherited', 'shared', 'left_behind', 'same_person', 'possible_conflict'] as const
const INTERVIEW_FIELDS = ['person', 'relationship', 'year', 'event', 'location'] as const
const MAX_STORY = 60_000

const today = () => new Date().toISOString().slice(0, 10)
const json = (v: unknown) => JSON.stringify(v, null, 1)

// ---------- Voice Interview ----------

async function interview(body: any, provider: Provider, model: string) {
  const transcript: { role: string; text: string }[] = Array.isArray(body.transcript) ? body.transcript.slice(-20) : []
  const missing: string[] = Array.isArray(body.missing) ? body.missing.filter((f: string) => INTERVIEW_FIELDS.includes(f as any)) : []
  if (!body.memory) throw new AgentError(400, 'Missing memory.')

  const out = await provider.json({
    model,
    name: 'interview',
    system: `You are the interviewer of Dérive Home, a spatial memory map of one apartment. A resident placed a memory in the home and some of its fields are empty. You are talking with them, by voice, to fill those fields and nothing else.

The fields you may ask about, in this order: ${missing.join(', ') || '(none)'}.
- person: who the object belonged to or who was there
- relationship: how that person is related to the resident
- year: roughly when it was
- event: what happened
- location: where in the home the object was

Rules:
- Ask exactly one short, warm, concrete question at a time, in the language "${body.memory.language ?? 'en'}". No preamble, no summary of what you learned.
- "fields" holds only what the resident has said during this interview. Leave a field null if they have not answered it. Never guess, infer from general knowledge, or fill a field yourself.
- If the resident says they do not know or cannot remember, put that field name in "unknown", leave it null, and move on. Do not ask again.
- For an approximate time ("late 1990s"), set "year" to the most likely single year and "yearText" to their words. Today is ${today()}.
- When every field in the list is answered or unknown, set "done" to true and "question" to null. Otherwise "done" is false and "question" is the next question.
- Do not ask about anything outside the list. Do not ask about other objects or other memories.`,
      messages: [
        {
          role: 'user',
          content: `The memory as it stands:\n${json(body.memory)}\n\nThe interview so far:\n${
            transcript.length ? transcript.map((t) => `${t.role === 'agent' ? 'Interviewer' : 'Resident'}: ${t.text}`).join('\n') : '(not started)'
          }`,
        },
      ],
      schema: obj({
        question: nullable('string'),
        fields: obj({
          person: nullable('string'),
          relationship: nullable('string'),
          year: nullable('integer'),
          yearText: nullable('string'),
          event: nullable('string'),
          location: nullable('string'),
        }),
        unknown: arr({ type: 'string', enum: INTERVIEW_FIELDS }),
        done: { type: 'boolean' },
      }),
    })
    // only the fields that were missing can be filled, and only once the resident has spoken
    const spoke = transcript.some((t) => t.role === 'user')
    for (const k of Object.keys(out.fields)) {
      if (!spoke || !missing.includes(k === 'yearText' ? 'year' : k)) out.fields[k] = null
    }
    return out
}

// ---------- Historian ----------

async function historian(body: any, provider: Provider, model: string) {
  const nodes: { id: string }[] = Array.isArray(body.nodes) ? body.nodes.filter((n: any) => n && typeof n.id === 'string') : []
  if (!body.memory) throw new AgentError(400, 'Missing memory.')
  if (!nodes.length) return { links: [] }

  const out = await provider.json({
    model,
    name: 'historian',
    effort: 'low',
    system: `You are the historian of Dérive Home, a spatial memory map of one apartment across three eras. You are given one memory a resident just saved, and the nodes already in the home: objects with their owner and location in each year, people, and other residents' memories. Find where the new memory touches them across time.

Allowed relationships:
- same_object: the memory is about the very same physical thing as an existing object or memory
- moved: the same thing, and the memory shows it in a different place than the node records
- inherited: the thing passed from one person to another
- shared: several people used the same thing
- left_behind: someone moved out or died and the thing stayed in the home
- same_person: a person in the memory is the same person as an existing person node
- possible_conflict: the memory and a node seem to be about the same thing but disagree on year, owner or place

Rules:
- Link only on evidence in the data. Two things of the same kind are not the same thing: "a camera" is the home's camera only if year, people or place agree. A generic word like "mother" or "grandfather" is the same person as a named resident only if role and era both fit.
- If you are not sure, do not link. Returning no links is a correct answer.
- When the kind of object matches but the facts disagree, use possible_conflict rather than same_object.
- At most 4 links, strongest first. "confidence" is 0 to 1.
- "timeline" lists what is known about the entity in year order, using only facts from the data, and includes the new memory itself. Use null for a missing year, person or location.
- "reason" is one plain sentence naming the evidence, in the language "${body.memory.language ?? 'en'}".`,
    messages: [{ role: 'user', content: `New memory:\n${json(body.memory)}\n\nNodes in the home:\n${json(nodes)}` }],
    schema: obj({
      links: arr(
        obj({
          targetId: { type: 'string', enum: nodes.map((n) => n.id) },
          entity: str,
          relationship: { type: 'string', enum: RELATIONSHIPS },
          timeline: arr(obj({ year: nullable('integer'), person: nullable('string'), location: nullable('string') })),
          reason: str,
          confidence: { type: 'number' },
        }),
      ),
    }),
  })
  // unsure means no merge
  return { links: (out.links as any[]).filter((l) => l.confidence >= 0.5).slice(0, 4) }
}

// ---------- Literature Import ----------

async function literature(body: any, provider: Provider, model: string) {
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (text.length < 80) throw new AgentError(400, 'Paste a passage of at least a few sentences.')
  if (text.length > MAX_STORY) throw new AgentError(400, `That text is too long. Keep it under ${MAX_STORY.toLocaleString()} characters.`)
  const spots: { id: string; label: string }[] = Array.isArray(body.spots) ? body.spots.filter((s: any) => s && typeof s.id === 'string') : []

  const out = await provider.json({
    model,
    name: 'story',
    system: `You read a literary text supplied by the user and turn it into a spatial story graph: who is where, with what, in what order.

Rules:
- Use only what is in the text. Do not add characters, places, objects or events from your knowledge of the work or its author.
- "placeType" is "explicit" when the text names the place of a scene and "inferred" when you deduced it from context. If a scene has no discernible place, use the place "Unknown" with placeType "inferred" and low confidence.
- "evidence" must be a short phrase copied character for character from the text that supports the scene. If you cannot copy one exactly, use an empty string. Never write a quote that is not in the text.
- Scenes are in the order things happen in the story; "order" starts at 1. Between 2 and 12 scenes.
- "movement" lists each time a character goes from one place to another, in order, using place names from "places".
- "title" is the title given by the user if any, otherwise a short descriptive label, not an invented title.
- "spotId" stages the scene in a real apartment. Choose a listed spot only when the scene's place is the same kind of place (a kitchen scene at a kitchen spot, something on a shelf at a shelf). Otherwise null. This is staging, not a claim about the text.
- Write in the language of the text.

Spots in the apartment:
${spots.map((s) => `- ${s.id}: ${s.label}`).join('\n') || '(none)'}`,
    messages: [{ role: 'user', content: `${typeof body.title === 'string' && body.title.trim() ? `Title: ${body.title.trim()}\n\n` : ''}${text}` }],
    schema: obj({
      title: str,
      characters: arr(str),
      places: arr(str),
      objects: arr(str),
      scenes: arr(
        obj({
          order: { type: 'integer' },
          place: str,
          characters: arr(str),
          objects: arr(str),
          eventSummary: str,
          placeType: { type: 'string', enum: ['explicit', 'inferred'] },
          confidence: { type: 'number' },
          evidence: str,
          spotId: spots.length ? { type: ['string', 'null'], enum: [...spots.map((s) => s.id), null] } : { type: 'null' },
        }),
      ),
      movement: arr(obj({ character: str, from: str, to: str })),
    }),
  })
  // a quote that is not in the text is dropped, whatever the model says
  const flat = text.replace(/\s+/g, ' ')
  for (const s of out.scenes) if (s.evidence && !flat.includes(s.evidence.replace(/\s+/g, ' '))) s.evidence = ''
  return { story: out }
}

// ---------- Temporal Compare ----------

async function compare(body: any, provider: Provider, model: string) {
  const { a, b } = body
  if (!a?.year || !b?.year) throw new AgentError(400, 'Choose two eras.')
  if (a.year === b.year) throw new AgentError(400, 'Choose two different eras.')
  const change = (extra: Record<string, unknown> = {}) => arr(obj({ id: nullable('string'), name: str, ...extra }))

  const out = await provider.json({
    model,
    name: 'compare',
    system: `You compare two states of the same apartment, an earlier and a later one. Each state lists its objects (with owner, location and what the object was used for), the memories residents added to that era, and how a resident walked through the home.

Rules:
- Objects with the same "id" in both states are the same object; that was decided before you. Do not match objects on your own, and do not merge two different ids.
- movedObjects: same id, different location. persistentObjects: same id, same location.
- newObjects: present only in the later state. removedObjects: present only in the earlier state. Added memories count here.
- changedOwnership: same id, different owner.
- changedSpatialUse: a place in the home that was used for one thing in the earlier state and another in the later, read from the stories and routes ("kitchen counter: tea at six → shared by three tenants"). Only what the data supports. At most 5.
- movementChanges: at most 4 plain sentences on how the walking route differs.
- Copy "id" from the data; null if the item has none. Keep "from", "to" and "location" to a few words.
- summary: 2 or 3 restrained sentences, like a museum label. No exclamation marks.`,
    messages: [{ role: 'user', content: `Earlier state:\n${json(a)}\n\nLater state:\n${json(b)}` }],
    schema: obj({
      movedObjects: change({ from: str, to: str }),
      persistentObjects: change({ location: str }),
      newObjects: change({ location: str }),
      removedObjects: change({ location: str }),
      changedOwnership: change({ from: str, to: str }),
      changedSpatialUse: arr(obj({ place: str, from: str, to: str })),
      movementChanges: arr(str),
      summary: str,
    }),
  })
  return { diff: out }
}

// ---------- entry ----------

const AGENTS = { interview, historian, literature, compare }

export async function runAgent(body: any, opts: AgentOptions): Promise<{ status: number; json: Record<string, unknown> }> {
  const name = body?.agent as AgentName
  if (!Object.hasOwn(AGENTS, name)) return { status: 400, json: { error: 'Unknown agent.' } }
  if (opts.passcode && body.passcode !== opts.passcode) {
    return { status: 401, json: { error: 'This deployment needs its access key. Open the link that ends in ?key=… once and try again.' } }
  }
  if (!opts.apiKey) {
    return {
      status: 503,
      json: { error: 'No OpenAI key found. Add OPENAI_API_KEY=sk-… to .env (local) or to the Vercel project environment variables.' },
    }
  }
  const model = opts.models?.[name] || DEFAULT_MODELS[name]
  const provider = openai(opts.apiKey)
  try {
    const result = await AGENTS[name](body, provider, model)
    return { status: 200, json: { ...result, model, provider: provider.id } }
  } catch (err) {
    if (err instanceof AgentError) return { status: err.status, json: { error: err.message } }
    console.error(`[agent:${name}]`, err)
    const timedOut = (err as Error)?.name === 'TimeoutError'
    return { status: timedOut ? 504 : 500, json: { error: timedOut ? 'The model took too long to answer. Try again.' : `The ${name} agent failed.` } }
  }
}
