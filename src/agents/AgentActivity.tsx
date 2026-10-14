import { useState } from 'react'
import { AGENTS, useRuns, type AgentStatus } from './activity'
import './agents.css'

const ICON: Record<AgentStatus, string> = { idle: '○', running: '→', success: '✓', error: '×' }
const seconds = (ms?: number) => (ms === undefined ? '' : `${(ms / 1000).toFixed(1)}s`)

// Which agent is working, what it was given and what it answered. Closed by default: a small button
// opens it, and that button itself shows when an agent is running.
export function AgentActivity({ shifted }: { shifted: boolean }) {
  const runs = useRuns()
  const [log, setLog] = useState(false)
  const [open, setOpen] = useState(false)
  const running = runs.find((r) => r.status === 'running')

  if (!open) {
    return (
      <button className={`agents-toggle${shifted ? ' shifted' : ''}${running ? ' running' : ''}`} onClick={() => setOpen(true)}>
        <span className="icon">{running ? '→' : '○'}</span>
        {running ? AGENTS.find((a) => a.id === running.agent)!.name : 'Agent Activity'}
      </button>
    )
  }

  return (
    <aside className={shifted ? 'agents shifted' : 'agents'} aria-label="Agent activity">
      <div className="agents-head">
        <span className="label">Agent Activity</span>
        <button className="label" onClick={() => setLog((v) => !v)}>
          {log ? 'Agents' : `Log · ${runs.length}`}
        </button>
        <button className="label" onClick={() => setOpen(false)} aria-label="Hide agent activity">
          Hide
        </button>
      </div>

      {!log &&
        AGENTS.map((agent) => {
          const run = runs.find((r) => r.agent === agent.id)
          const status: AgentStatus = run?.status ?? 'idle'
          return (
            <div key={agent.id} className={`agent ${status}`}>
              <span className="icon">{ICON[status]}</span>
              <div>
                <strong>
                  {agent.name}
                  <em>{run?.model ?? agent.model}</em>
                  {run?.ms !== undefined && <code>{seconds(run.ms)}</code>}
                </strong>
                <span>{!run ? 'Idle' : status === 'running' ? run.input : run.output}</span>
              </div>
            </div>
          )
        })}

      {log && (
        <ol className="agent-log">
          {runs.length === 0 && <li className="empty">No agent has run yet.</li>}
          {runs.map((r) => (
            <li key={r.id} className={r.status}>
              <strong>
                <span className="icon">{ICON[r.status]}</span>
                {AGENTS.find((a) => a.id === r.agent)!.name}
                <code>{seconds(r.ms)}</code>
              </strong>
              <span>in · {r.input}</span>
              {r.output && <span>out · {r.output}</span>}
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
