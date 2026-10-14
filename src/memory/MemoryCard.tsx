import { useEffect, useState } from 'react'
import { memorySpots } from '../config/scene'
import { ERAS } from '../data/objects'
import { PlayButton } from '../agents/PlayButton'
import type { UserMemory } from './types'
import './memory.css'

// How long a newly placed memory takes to appear in the room. The scene uses the same value.
export const GENERATE_MS = 6000
const STAGES = ['Reading the description', 'Building the geometry', 'Applying colour and material', 'Anchoring it to the room']

// Progress of the object appearing in the scan. The stand-in form is simple, so this is
// a presentation of the step where a real 3D model would be generated.
function Generating({ memory: m }: { memory: UserMemory }) {
  const [now, setNow] = useState(Date.now)
  const p = Math.min(1, (now - m.createdAt) / GENERATE_MS)
  useEffect(() => {
    if (p >= 1) return
    const t = setInterval(() => setNow(Date.now()), 80)
    return () => clearInterval(t)
  }, [p >= 1])

  const [x, y, z] = m.position.map((n) => n.toFixed(2))
  const stage = Math.min(STAGES.length - 1, Math.floor(p * STAGES.length))
  return (
    <div className={p < 1 ? 'generating' : 'generating done'}>
      <div className="label">{p < 1 ? 'Generating object' : 'Object placed'}</div>
      <div className="bar">
        <span style={{ width: `${p * 100}%` }} />
      </div>
      <p>
        {p < 1 ? `${STAGES[stage]}…` : `${m.analysis.object.name}, about ${Math.round(m.analysis.object.sizeCm)} cm`}
        <code>
          x {x} · y {y} · z {z}
        </code>
      </p>
    </div>
  )
}

// Story card for a memory the visitor placed, shown where the built-in object cards go.
export function MemoryCard(props: {
  memory: UserMemory
  linking: boolean // the Historian is reading this memory right now
  onInterview: () => void
  onOpenLink: (targetId: string) => void
  onRemove: () => void
  onClose: () => void
}) {
  const { memory: m } = props
  const a = m.analysis
  const spot = memorySpots.find((s) => s.id === a.place.spotId)
  const era = ERAS[a.layer as keyof typeof ERAS]

  return (
    <aside className="card memory-card">
      <button className="close" onClick={props.onClose} aria-label="Close">
        ×
      </button>
      <div className="label">Added memory · {a.time.year ?? a.time.text}</div>
      <h2>{a.title}</h2>
      <p className="summary">{a.object.description}</p>
      <Generating key={m.id} memory={m} />
      <button className="link talk" onClick={props.onInterview}>
        Talk about this memory <span>●</span>
      </button>

      <dl>
        <dt>When</dt>
        <dd>{a.time.text}</dd>
        <dt>Where</dt>
        <dd>{spot?.label ?? a.place.text}</dd>
        {a.people.length > 0 && (
          <>
            <dt>Who</dt>
            <dd>
              {a.people.join(', ')}
              {m.relationship && <em> · {m.relationship}</em>}
            </dd>
          </>
        )}
        {era && (
          <>
            <dt>Layer</dt>
            <dd>
              {a.layer} · {era.label}
            </dd>
          </>
        )}
      </dl>
      <p className="story">{a.story}</p>
      <PlayButton text={a.story} label="Listen" />

      <section>
        <div className="label">Across time · Historian</div>
        {props.linking && <p className="small">Reading it against the rest of the home…</p>}
        {!props.linking && m.links?.length === 0 && (
          <p className="small">No confident connection to another object, person or memory. Nothing was merged.</p>
        )}
        {!props.linking && !m.links && <p className="small">Not read by the Historian yet.</p>}
        {!!m.links?.length && (
          <ul className="links">
            {m.links.map((l) => (
              <li key={l.targetId + l.relationship}>
                <button onClick={() => props.onOpenLink(l.targetId)}>
                  <span className="rel">
                    {l.relationship.replace(/_/g, ' ')}
                    <code>{Math.round(l.confidence * 100)}%</code>
                  </span>
                  <strong>{l.targetName}</strong>
                  <span className="reason">{l.reason}</span>
                  {l.timeline.length > 0 && (
                    <ol>
                      {l.timeline.map((t, i) => (
                        <li key={i}>
                          <span className="num">{t.year ?? '—'}</span>
                          <span>{[t.person, t.location].filter(Boolean).join(' · ') || 'Unknown'}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="parallel">
        <div className="label">Meanwhile</div>
        <p>{a.parallel}</p>
      </section>

      <section>
        <div className="label">In their words</div>
        {m.photo && <img className="photo-large" src={m.photo} alt="" />}
        <blockquote>{m.text}</blockquote>
        <p className="small">
          This version of the home exists alongside the others. Removing it deletes nothing but this layer.
        </p>
        <button className="link" onClick={props.onRemove}>
          Remove this memory <span>×</span>
        </button>
      </section>
    </aside>
  )
}
