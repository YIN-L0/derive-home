// Text to speech with ElevenLabs, behind POST /api/speak. Called only when someone presses play,
// so nothing is spoken (or billed) on its own. The key stays server-side.
//
//   request body  { text, passcode? }
//   result        audio/mpeg, or { error } as JSON
// Shared by the Vite dev server (server/memoryApi.ts) and the Vercel function (api/speak.ts).

export interface SpeechOptions {
  elevenKey?: string
  voice?: string
  speechModel?: string
  passcode?: string
}

// "Brian", one of the ElevenLabs default voices: a middle-aged man, resonant and calm.
const DEFAULT_VOICE = 'nPczCjzI2devNBz1zQrb'
export const DEFAULT_SPEECH_MODEL = 'eleven_v4'
const MAX_CHARS = 1200

type Result = { status: number; json: { error: string } } | { status: 200; audio: Buffer; model: string }

export async function speak(body: any, opts: SpeechOptions): Promise<Result> {
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return { status: 400, json: { error: 'Nothing to say.' } }
  if (text.length > MAX_CHARS) return { status: 400, json: { error: `Too long to read aloud (over ${MAX_CHARS} characters).` } }
  if (opts.passcode && body.passcode !== opts.passcode) {
    return { status: 401, json: { error: 'This deployment needs its access key. Open the link that ends in ?key=… once and try again.' } }
  }
  if (!opts.elevenKey) {
    return {
      status: 503,
      json: { error: 'No ElevenLabs key found. Add ELEVENLABS_API_KEY=… to .env (local) or to the Vercel project environment variables.' },
    }
  }

  const model = opts.speechModel || DEFAULT_SPEECH_MODEL
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${opts.voice || DEFAULT_VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': opts.elevenKey },
    body: JSON.stringify({ text, model_id: model }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as any
    const detail = data?.detail?.message ?? (typeof data?.detail === 'string' ? data.detail : res.statusText)
    console.error(`[speak] ElevenLabs ${res.status}: ${detail}`)
    return { status: 502, json: { error: `ElevenLabs (${model}) returned ${res.status}: ${detail}` } }
  }
  return { status: 200, audio: Buffer.from(await res.arrayBuffer()), model }
}
