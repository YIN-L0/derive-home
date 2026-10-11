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
}

export const isMemoryId = (id: string | null): id is MemoryId => !!id && id.startsWith('mem-')
