import { useEffect, useState } from 'react'
import { memorySpots } from '../config/scene'
import { ERAS } from '../data/objects'
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
export function MemoryCard(props: { memory: UserMemory; onRemove: () => void; onClose: () => void }) {
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

      <dl>
        <dt>When</dt>
        <dd>{a.time.text}</dd>
        <dt>Where</dt>
        <dd>{spot?.label ?? a.place.text}</dd>
        {a.people.length > 0 && (
          <>
            <dt>Who</dt>
            <dd>{a.people.join(', ')}</dd>
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
