import { useSyncExternalStore } from 'react'

// What every agent has been doing, for the AGENT ACTIVITY panel.
// Agents report through track(); nothing here knows what an agent does.

export type AgentId = 'capture' | 'interview' | 'historian' | 'literature' | 'compare'
export type AgentStatus = 'idle' | 'running' | 'success' | 'error'

export const AGENTS: { id: AgentId; name: string; job: string; model: string }[] = [
  { id: 'capture', name: 'Memory Capture', job: 'Words → a placed object', model: 'gpt-5-mini' },
  { id: 'interview', name: 'Voice Interview', job: 'Asks for what is missing', model: 'gpt-5-mini · ElevenLabs v4' },
  { id: 'historian', name: 'Historian', job: 'Links memories across time', model: 'gpt-5' },
  { id: 'literature', name: 'Literature', job: 'A story → scenes in the home', model: 'gpt-4.1' },
  { id: 'compare', name: 'Temporal Compare', job: 'What changed between two eras', model: 'gpt-5-mini' },
]

export interface Run {
  id: number
  agent: AgentId
  status: Exclude<AgentStatus, 'idle'>
  input: string // short summaries only: never a key or a full payload
  output: string
  model?: string
  ms?: number
  at: number
}

let runs: Run[] = []
const listeners = new Set<() => void>()
let nextId = 1

function update(id: number, patch: Partial<Run>) {
  runs = runs.map((r) => (r.id === id ? { ...r, ...patch } : r))
  listeners.forEach((l) => l())
}

// Run one agent call and record it. `fn` resolves with the result plus a one-line summary of it.
export async function track<T>(agent: AgentId, input: string, fn: () => Promise<{ result: T; output: string; model?: string }>): Promise<T> {
  const id = nextId++
  const started = performance.now()
  runs = [{ id, agent, status: 'running' as const, input, output: '', at: Date.now() }, ...runs].slice(0, 40)
  listeners.forEach((l) => l())
  try {
    const { result, output, model } = await fn()
    update(id, { status: 'success', output, model, ms: Math.round(performance.now() - started) })
    return result
  } catch (err) {
    update(id, { status: 'error', output: (err as Error).message, ms: Math.round(performance.now() - started) })
    throw err
  }
}

export function useRuns() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => runs,
  )
}
