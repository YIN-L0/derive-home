import { passcode } from '../memory/api'
import { track } from './activity'

// Speech: the browser's recognition for the visitor's answers, and an ElevenLabs voice that reads
// a text aloud only when asked to (see PlayButton).
// Chrome and Safari expose recognition under a prefix; there are no built-in types for it.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void
  onend: () => void
  onerror: () => void
  start: () => void
  stop: () => void
  abort: () => void
}
const Ctor = (window as unknown as Record<string, new () => Recognition>).SpeechRecognition ??
  (window as unknown as Record<string, new () => Recognition>).webkitSpeechRecognition

export const canListen = !!Ctor
// Listen for one utterance. `onText` gets the words so far; `onEnd` gets the final words when the visitor stops.
export function listen(lang: string, onText: (text: string) => void, onEnd: (text: string) => void) {
  const r = new Ctor()
  let said = ''
  r.lang = lang
  r.interimResults = true
  r.continuous = false
  r.onresult = (e) => {
    said = Array.from(e.results, (result) => result[0].transcript).join('')
    onText(said)
  }
  r.onend = () => onEnd(said.trim())
  r.onerror = () => {}
  r.start()
  return () => {
    r.onend = () => {}
    r.abort()
  }
}

// One voice at a time. Audio already generated in this session is replayed, not generated again.
const cache = new Map<string, string>()
let playing: { audio: HTMLAudioElement; done: () => void } | null = null

export function hush() {
  playing?.audio.pause()
  playing?.done()
  playing = null
}

// Read a text aloud with the ElevenLabs voice. Resolves when it has finished or been stopped.
export async function speak(text: string, onStart?: () => void): Promise<void> {
  hush()
  let url = cache.get(text)
  if (!url) {
    url = await track('interview', `Voice: “${text.length > 44 ? `${text.slice(0, 44)}…` : text}”`, async () => {
      let res: Response
      try {
        res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, passcode: passcode() }),
        })
      } catch {
        throw new Error('Could not reach the server.')
      }
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `The voice failed (${res.status}).`)
      const result = URL.createObjectURL(await res.blob())
      return { result, output: `Spoke ${text.length} characters`, model: `ElevenLabs ${res.headers.get('X-Speech-Model') ?? ''}`.trim() }
    })
    cache.set(text, url)
  }
  const audio = new Audio(url)
  await new Promise<void>((resolve, reject) => {
    playing = { audio, done: resolve }
    audio.onended = () => {
      if (playing?.audio === audio) playing = null
      resolve()
    }
    audio.onerror = () => reject(new Error('This browser could not play the audio.'))
    audio.play().then(onStart, reject)
  })
}
