import type { Vec3 } from '../config/scene'

export type MemoryShape = 'paper' | 'book' | 'vessel' | 'box' | 'sphere' | 'soft' | 'tall' | 'other'

// What the language model returns for one described memory (see server/memoryApi.ts).
export interface MemoryAnalysis {
  language: string
  title: string
  object: { name: string; description: string; shape: MemoryShape; color: string; sizeCm: number }
  time: { year: number | null; text: string; certainty: 'exact' | 'approximate' | 'unknown' }
  layer: number
  place: { spotId: string; text: string }
  people: string[]
  event: string
  feeling: string
  story: string
  parallel: string
  // verbatim fragments of the visitor's text, for highlighting; may be missing on older saved memories
  quotes?: { time: string; object: string; place: string; people: string }
  followUp: string | null
}

export type MemoryId = `mem-${string}`

// A memory the visitor has placed in the home.
export interface UserMemory {
  id: MemoryId
  text: string // the visitor's own words
  photo?: string // small data URL, kept only in this browser
  analysis: MemoryAnalysis
  position: Vec3
  createdAt: number
  relationship?: string // how the person in the memory is related to the visitor (Voice Interview agent)
  links?: MemoryLink[] // what the Historian agent connected it to; undefined until it has run
}

export type Relationship = 'same_object' | 'moved' | 'inherited' | 'shared' | 'left_behind' | 'same_person' | 'possible_conflict'

// One connection from a placed memory to another node of the home.
export interface MemoryLink {
  targetId: string // an ObjectId, a `mem-…` id, or `person-…`
  targetName: string
  entity: string
  relationship: Relationship
  timeline: { year: number | null; person: string | null; location: string | null }[]
  reason: string
  confidence: number
}

export const isMemoryId = (id: string | null): id is MemoryId => !!id && id.startsWith('mem-')
