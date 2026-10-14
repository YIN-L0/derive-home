// Vercel Serverless Function: POST /api/speak. Same logic as the dev-server endpoint.
// Environment variables: ELEVENLABS_API_KEY (required), ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL and DERIVE_PASSCODE (optional).
import { speak } from '../server/speech.js'

export const config = { maxDuration: 60 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
    const out = await speak(body, {
      elevenKey: process.env.ELEVENLABS_API_KEY,
      voice: process.env.ELEVENLABS_VOICE_ID,
      speechModel: process.env.ELEVENLABS_MODEL,
      passcode: process.env.DERIVE_PASSCODE,
    })
    if ('audio' in out) {
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('X-Speech-Model', out.model)
      return res.status(200).send(out.audio)
    }
    res.status(out.status).json(out.json)
  } catch (err) {
    console.error('[speak]', err)
    res.status(500).json({ error: 'Could not generate the voice.' })
  }
}
