// Dev-server endpoints: POST /api/memory (the "Leave a memory" dialog), POST /api/agent (the other agents)
// and POST /api/speak (reading a text aloud).
// Runs inside Vite (npm run dev / npm run preview). On Vercel the same logic is served by api/memory.ts and api/agent.ts.
import type { Connect, Plugin } from 'vite'
import { analyze, type Options } from './analyze'
import { runAgent, type AgentOptions } from './agents'
import { speak, type SpeechOptions } from './speech'

function handler(opts: Options & AgentOptions & SpeechOptions): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path !== '/api/memory' && path !== '/api/agent' && path !== '/api/speak') return next()
    const send = (status: number, json: unknown) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(json))
    }
    if (req.method !== 'POST') return send(405, { error: 'POST only' })
    // a pasted story is much longer than a memory
    const limit = path === '/api/agent' ? 400_000 : 64_000
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > limit) req.destroy()
    })
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}')
        if (path === '/api/speak') {
          const spoken = await speak(body, opts)
          if (!('audio' in spoken)) return send(spoken.status, spoken.json)
          res.statusCode = 200
          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('X-Speech-Model', spoken.model)
          return res.end(spoken.audio)
        }
        const out = path === '/api/agent' ? await runAgent(body, opts) : await analyze(body, opts)
        send(out.status, out.json)
      } catch (err) {
        console.error('[memory]', err)
        const timedOut = (err as Error)?.name === 'TimeoutError'
        send(timedOut ? 504 : 500, { error: timedOut ? 'OpenAI took too long to answer. Try again.' : 'Could not analyse the memory.' })
      }
    })
  }
}

export function memoryApi(opts: Options & AgentOptions & SpeechOptions): Plugin {
  return {
    name: 'derive-memory-api',
    configureServer(server) {
      server.middlewares.use(handler(opts))
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler(opts))
    },
  }
}
