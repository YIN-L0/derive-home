// Vercel Serverless Function: POST /api/agent. Same logic as the dev-server endpoint.
// Environment variables: OPENAI_API_KEY (required), DERIVE_PASSCODE and DERIVE_MODEL_* (optional).
import { runAgent } from '../server/agents.js'

export const config = { maxDuration: 60 }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  let body: any
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  } catch {
    return res.status(400).json({ error: 'Invalid JSON.' })
  }
  const out = await runAgent(body, {
    apiKey: process.env.OPENAI_API_KEY,
    passcode: process.env.DERIVE_PASSCODE,
    models: {
      interview: process.env.DERIVE_MODEL_INTERVIEW,
      historian: process.env.DERIVE_MODEL_HISTORIAN,
      literature: process.env.DERIVE_MODEL_LITERATURE,
      compare: process.env.DERIVE_MODEL_COMPARE,
    },
  })
  res.status(out.status).json(out.json)
}
