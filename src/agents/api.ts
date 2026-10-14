import { YEARS, memorySpots, personRoutes, type Year } from '../config/scene'
import { ERAS, OBJECTS } from '../data/objects'
import { PEOPLE } from '../data/people'
import { passcode } from '../memory/api'
import type { MemoryLink, UserMemory } from '../memory/types'
import { track, type AgentId } from './activity'

// Client side of POST /api/agent (server/agents.ts): one function per agent.
// Each builds the agent's input from the app's data and reports the run to the activity panel.

async function post(agent: Exclude<AgentId, 'capture'>, body: Record<string, unknown>) {
  let res: Response
  try {
    res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent, passcode: passcode(), ...body }),
    })
  } catch {
    throw new Error('Could not reach the server.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok || !data) throw new Error(data?.error ?? `The ${agent} agent failed (${res.status}).`)
  return data
}

const clip = (s: string, n = 48) => (s.length > n ? `${s.slice(0, n)}…` : s)

// ---------- Voice Interview ----------

export type InterviewField = 'person' | 'relationship' | 'year' | 'event' | 'location'
export interface InterviewFields {
  person: string | null
  relationship: string | null
  year: number | null
  yearText: string | null
  event: string | null
  location: string | null
}
export interface InterviewTurn {
  question: string | null
  fields: InterviewFields
  unknown: InterviewField[]
  done: boolean
}
export type Line = { role: 'agent' | 'user'; text: string }

export function missingFields(m: UserMemory): InterviewField[] {
  const a = m.analysis
  const missing: InterviewField[] = []
  if (!a.people.length) missing.push('person')
  if (!m.relationship) missing.push('relationship')
  if (a.time.year === null) missing.push('year')
  if (!a.event.trim()) missing.push('event')
  if (!a.place.text.trim()) missing.push('location')
  return missing
}

export function interviewTurn(m: UserMemory, missing: InterviewField[], transcript: Line[]): Promise<InterviewTurn> {
  const last = transcript[transcript.length - 1]
  const input = last?.role === 'user' ? `Answer: “${clip(last.text)}”` : `${m.analysis.title} · missing ${missing.join(', ') || 'nothing'}`
  return track('interview', input, async () => {
    const a = m.analysis
    const data = await post('interview', {
      missing,
      transcript,
      memory: {
        language: a.language,
        title: a.title,
        object: a.object.name,
        people: a.people,
        relationship: m.relationship ?? null,
        year: a.time.year,
        when: a.time.text,
        event: a.event,
        location: a.place.text,
        inTheirWords: m.text,
      },
    })
    const turn = data as InterviewTurn
    const filled = Object.entries(turn.fields)
      .filter(([k, v]) => v !== null && k !== 'yearText')
      .map(([k, v]) => `${k} = ${v}`)
    const output = turn.done
      ? filled.length
        ? `Filled ${filled.join(', ')}`
        : 'Nothing new learned'
      : `Asks: ${clip(turn.question ?? '', 44)}`
    return { result: turn, output, model: data.model }
  })
}

// Era of the home a calendar year falls in: the latest version that had begun by then.
export const eraOf = (year: number): Year => [...YEARS].reverse().find((y) => y <= year) ?? YEARS[0]

export function applyInterview(m: UserMemory, f: InterviewFields): UserMemory {
  const a = m.analysis
  const known = f.person ? a.people.some((p) => p.toLowerCase() === f.person!.toLowerCase()) : true
  return {
    ...m,
    relationship: f.relationship ?? m.relationship,
    analysis: {
      ...a,
      people: known ? a.people : [...a.people, f.person!],
      time: f.year !== null ? { year: f.year, text: f.yearText ?? `Around ${f.year}`, certainty: 'approximate' } : a.time,
      layer: f.year !== null ? eraOf(f.year) : a.layer,
      event: f.event ?? a.event,
      place: f.location ? { ...a.place, text: f.location } : a.place,
    },
  }
}

// ---------- Historian ----------

const describe = (m: UserMemory) => ({
  title: m.analysis.title,
  object: m.analysis.object.name,
  description: m.analysis.object.description,
  year: m.analysis.time.year,
  when: m.analysis.time.text,
  era: m.analysis.layer,
  people: m.analysis.people,
  relationship: m.relationship ?? null,
  event: m.analysis.event,
  location: m.analysis.place.text,
})

// Link one saved memory to the built-in objects, the residents and the other placed memories.
export function linkMemory(m: UserMemory, others: UserMemory[]): Promise<MemoryLink[]> {
  return track('historian', `${m.analysis.title} against ${OBJECTS.length + PEOPLE.length + others.length} nodes`, async () => {
    const names = new Map<string, string>()
    const nodes = [
      ...OBJECTS.map((o) => {
        names.set(o.id, o.name)
        return {
          id: o.id,
          kind: 'object',
          name: o.name,
          summary: o.summary,
          byYear: Object.fromEntries(YEARS.map((y) => [y, { owner: o.ownerByYear[y], location: o.locationByYear[y], story: o.storyByYear[y] }])),
        }
      }),
      ...PEOPLE.map((p) => {
        names.set(`person-${p.id}`, p.name)
        return { id: `person-${p.id}`, kind: 'person', name: p.name, role: p.role, livedHereIn: p.year, fate: p.fate ?? null }
      }),
      ...others.map((o) => {
        names.set(o.id, o.analysis.title)
        return { id: o.id, kind: 'memory', ...describe(o) }
      }),
    ]
    const data = await post('historian', { memory: { language: m.analysis.language, ...describe(m) }, nodes })
    const links: MemoryLink[] = (data.links as Omit<MemoryLink, 'targetName'>[]).map((l) => ({
      ...l,
      targetName: names.get(l.targetId) ?? l.entity,
      // the memory and the node often say the same thing about the same year: show it once
      timeline: l.timeline.filter((t, i, all) => all.findIndex((o) => o.year === t.year && o.person === t.person && o.location === t.location) === i),
    }))
    const output = links.length
      ? links.map((l) => `${l.relationship.replace(/_/g, ' ')} → ${l.targetName}`).join(' · ')
      : 'No confident link, nothing merged'
    return { result: links, output, model: data.model }
  })
}

// ---------- Literature Import ----------

export interface StoryScene {
  order: number
  place: string
  characters: string[]
  objects: string[]
  eventSummary: string
  placeType: 'explicit' | 'inferred'
  confidence: number
  evidence: string // verbatim from the text, or empty
  spotId: string | null // where the scene is staged in the apartment, if anywhere fits
}
export interface Story {
  title: string
  characters: string[]
  places: string[]
  objects: string[]
  scenes: StoryScene[]
  movement: { character: string; from: string; to: string }[]
}

export function importStory(text: string, title: string): Promise<Story> {
  return track('literature', `${title || 'Pasted text'} · ${text.length.toLocaleString()} characters`, async () => {
    const data = await post('literature', { text, title, spots: memorySpots.map(({ id, label }) => ({ id, label })) })
    const story = data.story as Story
    story.scenes.sort((a, b) => a.order - b.order)
    const staged = story.scenes.filter((s) => s.spotId).length
    return {
      result: story,
      output: `${story.scenes.length} scenes · ${story.characters.length} characters · ${staged} staged in the home`,
      model: data.model,
    }
  })
}

const STORY_KEY = 'derive.story.v1'
export function loadStory(): Story | null {
  try {
    return JSON.parse(localStorage.getItem(STORY_KEY) ?? 'null')
  } catch {
    return null
  }
}
export function saveStory(story: Story | null) {
  try {
    if (story) localStorage.setItem(STORY_KEY, JSON.stringify(story))
    else localStorage.removeItem(STORY_KEY)
  } catch {
    // storage blocked: the story still lives for this session
  }
}

// ---------- Temporal Compare ----------

type Change<T> = ({ id: string | null; name: string } & T)[]
export interface EraDiff {
  movedObjects: Change<{ from: string; to: string }>
  persistentObjects: Change<{ location: string }>
  newObjects: Change<{ location: string }>
  removedObjects: Change<{ location: string }>
  changedOwnership: Change<{ from: string; to: string }>
  changedSpatialUse: { place: string; from: string; to: string }[]
  movementChanges: string[]
  summary: string
}

// One version of the home as plain data. Identity is already settled here: built-in objects keep
// their id across years, and a memory the Historian tied to an object says so.
function sceneState(year: Year, memories: UserMemory[]) {
  return {
    year,
    label: ERAS[year].label,
    objects: OBJECTS.map((o) => ({ id: o.id, name: o.name, owner: o.ownerByYear[year], location: o.locationByYear[year], story: o.storyByYear[year] })),
    addedMemories: memories
      .filter((m) => m.analysis.layer === year)
      .map((m) => ({
        id: m.id,
        name: m.analysis.title,
        location: m.analysis.place.text,
        people: m.analysis.people,
        event: m.analysis.event,
        sameAs: m.links?.find((l) => l.relationship === 'same_object' || l.relationship === 'moved')?.targetId ?? null,
      })),
    route: { person: personRoutes[year].person, stops: personRoutes[year].stops },
  }
}

export function compareEras(a: Year, b: Year, memories: UserMemory[]): Promise<EraDiff> {
  const [from, to] = a < b ? [a, b] : [b, a]
  return track('compare', `${from} → ${to}`, async () => {
    const data = await post('compare', { a: sceneState(from, memories), b: sceneState(to, memories) })
    const d = data.diff as EraDiff
    return {
      result: d,
      output: `${d.movedObjects.length} moved · ${d.persistentObjects.length} stayed · ${d.changedOwnership.length} changed hands`,
      model: data.model,
    }
  })
}
