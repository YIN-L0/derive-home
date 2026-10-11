// Dev-server endpoint for the "Leave a memory" dialog: POST /api/memory.
// Runs inside Vite (npm run dev / npm run preview). On Vercel the same logic is served by api/memory.ts.
import type { Connect, Plugin } from 'vite'
import { analyze, type Options } from './analyze'

function handler(opts: Options): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/memory') return next()
    const send = (status: number, json: unknown) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(json))
    }
    if (req.method !== 'POST') return send(405, { error: 'POST only' })
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 64_000) req.destroy()
    })
    req.on('end', async () => {
      try {
        const out = await analyze(JSON.parse(raw || '{}'), opts)
        send(out.status, out.json)
      } catch (err) {
        console.error('[memory]', err)
        const timedOut = (err as Error)?.name === 'TimeoutError'
        send(timedOut ? 504 : 500, { error: timedOut ? 'OpenAI took too long to answer. Try again.' : 'Could not analyse the memory.' })
      }
    })
  }
}

export function memoryApi(opts: Options): Plugin {
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
