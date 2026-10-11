import { YEARS, memorySpots } from '../config/scene'
import { ERAS } from '../data/objects'
import type { MemoryAnalysis, UserMemory } from './types'

const STORE_KEY = 'derive.memories.v1'
const PASS_KEY = 'derive.key'

// A deployment can be protected with an access key. Opening the site once with ?key=… remembers it.
function passcode(): string | undefined {
  try {
    const fromUrl = new URLSearchParams(location.search).get('key')
    if (fromUrl) localStorage.setItem(PASS_KEY, fromUrl)
    return fromUrl ?? localStorage.getItem(PASS_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export async function analyzeMemory(text: string, hasPhoto: boolean): Promise<MemoryAnalysis> {
  let res: Response
  try {
    res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        hasPhoto,
        passcode: passcode(),
        spots: memorySpots.map(({ id, label }) => ({ id, label })),
        layers: YEARS.map((year) => ({ year, label: ERAS[year].label })),
      }),
    })
  } catch {
    throw new Error('Could not reach the server.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.analysis) throw new Error(data?.error ?? `Analysis failed (${res.status}).`)
  return data.analysis
}

export function loadMemories(): UserMemory[] {
  try {
    const list = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveMemories(list: UserMemory[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list))
  } catch {
    // storage full or blocked: the memories still live for this session
  }
}

// Shrink an attached photo so it fits comfortably in localStorage.
export function readPhoto(file: File, max = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file is not an image this browser can read.'))
    }
    img.src = url
  })
}
