import { memorySpots } from '../config/scene'
import { ERAS } from '../data/objects'
import type { UserMemory } from './types'
import './memory.css'

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
        <div className="label">Parallel universe</div>
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
