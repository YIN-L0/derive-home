import { useState, type ReactNode } from 'react'
import { YEARS, objectPositions, type Year } from '../config/scene'
import { ERAS } from '../data/objects'
import type { UserMemory } from '../memory/types'
import { compareEras, type EraDiff } from './api'
import '../memory/memory.css'
import './agents.css'

// "Compare eras": the Temporal Compare agent reads two versions of the home and says what changed.
export function CompareDialog(props: {
  memories: UserMemory[]
  year: Year
  onYear: (y: Year) => void
  // select a built-in object or a placed memory in the room
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [a, setA] = useState<Year>(YEARS[0])
  const [b, setB] = useState<Year>(YEARS[YEARS.length - 1])
  const [diff, setDiff] = useState<{ a: Year; b: Year; d: EraDiff } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const d = await compareEras(a, b, props.memories)
      setDiff({ a: Math.min(a, b) as Year, b: Math.max(a, b) as Year, d })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const idOf = (item: object) => (item as { id?: string | null }).id ?? null
  const selectable = (id: string | null) => !!id && (id in objectPositions || props.memories.some((m) => m.id === id))
  const group = <T extends object>(label: string, items: T[], row: (item: T) => ReactNode) =>
    items.length > 0 && (
      <>
        <div className="label">
          {label} · {items.length}
        </div>
        <ul className="plain">
          {items.map((item, i) => (
            <li key={i}>
              {selectable(idOf(item)) ? (
                <button onClick={() => props.onSelect(idOf(item)!)}>{row(item)}</button>
              ) : (
                row(item)
              )}
            </li>
          ))}
        </ul>
      </>
    )

  const pick = (value: Year, set: (y: Year) => void) => (
    <div className="era-pick">
      {YEARS.map((y) => (
        <button key={y} className={y === value ? 'active' : ''} onClick={() => set(y)}>
          <span className="num">{y}</span>
          <span>{ERAS[y].label}</span>
        </button>
      ))}
    </div>
  )

  const d = diff?.d
  return (
    <section className="memory-dialog" role="dialog" aria-label="Compare eras">
      <header>
        <span className="pulse" />
        <span className="label">Compare eras · Temporal Compare</span>
        <button className="close" onClick={props.onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="thread">
        <div className="label">From</div>
        {pick(a, setA)}
        <div className="label">To</div>
        {pick(b, setB)}
        {error && <p className="error">{error}</p>}
        {busy && (
          <ol className="steps">
            <li className="now">Reading both versions of the home side by side</li>
          </ol>
        )}

        {d && diff && !busy && (
          <div className="diff rise">
            <h2>
              {diff.a} <em>→</em> {diff.b}
            </h2>
            <p className="manifesto">{d.summary}</p>
            <div className="actions view-year">
              {[diff.a, diff.b].map((y) => (
                <button key={y} className={y === props.year ? 'ghost live' : 'ghost'} onClick={() => props.onYear(y)}>
                  Show {y}
                </button>
              ))}
            </div>
            {group('Moved', d.movedObjects, (o) => (
              <>
                <strong>{o.name}</strong> {o.from} → {o.to}
              </>
            ))}
            {group('Stayed', d.persistentObjects, (o) => (
              <>
                <strong>{o.name}</strong> {o.location}
              </>
            ))}
            {group('New', d.newObjects, (o) => (
              <>
                <strong>{o.name}</strong> {o.location}
              </>
            ))}
            {group('Gone', d.removedObjects, (o) => (
              <>
                <strong>{o.name}</strong> {o.location}
              </>
            ))}
            {group('Changed hands', d.changedOwnership, (o) => (
              <>
                <strong>{o.name}</strong> {o.from} → {o.to}
              </>
            ))}
            {group('Same place, different use', d.changedSpatialUse, (u) => (
              <>
                <strong>{u.place}</strong> {u.from} → {u.to}
              </>
            ))}
            {group(
              'Movement',
              d.movementChanges.map((text) => ({ text })),
              (m) => m.text,
            )}
          </div>
        )}
      </div>

      <div className="composer">
        <div className="actions">
          <button className="primary" disabled={busy || a === b} onClick={run}>
            {busy ? 'Comparing…' : a === b ? 'Choose two different eras' : `Compare ${Math.min(a, b)} and ${Math.max(a, b)}`}
          </button>
        </div>
      </div>
    </section>
  )
}
