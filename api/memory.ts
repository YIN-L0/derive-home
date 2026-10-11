// Vercel Serverless Function: POST /api/memory. Same logic as the dev-server endpoint.
// Environment variables: OPENAI_API_KEY (required), OPENAI_MODEL and DERIVE_PASSCODE (optional).
import { analyze } from '../server/analyze.js'

export const config = { maxDuration: 60 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
    const out = await analyze(body, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      passcode: process.env.DERIVE_PASSCODE,
    })
    res.status(out.status).json(out.json)
  } catch (err) {
    console.error('[memory]', err)
    const timedOut = (err as Error)?.name === 'TimeoutError'
    res.status(timedOut ? 504 : 500).json({ error: timedOut ? 'OpenAI took too long to answer. Try again.' : 'Could not analyse the memory.' })
  }
}
