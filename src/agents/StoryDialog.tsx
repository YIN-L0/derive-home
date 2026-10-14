import { useRef, useState } from 'react'
import { memorySpots } from '../config/scene'
import { importStory, type Story } from './api'
import { DEMO_STORY } from './demoStory'
import '../memory/memory.css'
import './agents.css'

// "Import a story": the Literature agent reads a pasted text into scenes, and the ones
// whose place has a counterpart in the apartment are staged there as the LITERATURE layer.
export function StoryDialog(props: {
  story: Story | null
  onStory: (story: Story | null) => void
  // show one scene's spot in the room, or stop showing it
  onFocus: (spotId: string | null) => void
  onClose: () => void
}) {
  const { story } = props
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const read = async () => {
    setBusy(true)
    setError(null)
    try {
      props.onStory(await importStory(text.trim(), title.trim()))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (!/\.txt$/i.test(f.name) && f.type !== 'text/plain') return setError('Only plain .txt files for now.')
    setText(await f.text())
    setTitle(f.name.replace(/\.txt$/i, ''))
    setError(null)
  }

  return (
    <section className="memory-dialog" role="dialog" aria-label="Import a story">
      <header>
        <span className="pulse" />
        <span className="label">Import a story · Literature layer</span>
        <button className="close" onClick={props.onClose} aria-label="Close">
          ×
        </button>
      </header>

      {!story ? (
        <>
          <div className="thread">
            <h2 className="rise">
              A story is also <em>a floor plan.</em>
            </h2>
            <p className="manifesto rise" style={{ '--i': 1 } as React.CSSProperties}>
              Paste a passage. It is read for who is where, with what, and in what order, and the scenes that fit a room
              of this home are staged in it as a separate layer.
            </p>
            <p className="manifesto quiet rise" style={{ '--i': 2 } as React.CSSProperties}>
              Only what the text says. A place the text does not name is marked as inferred, and no line is quoted that
              is not in it. Use your own writing or a public-domain text.
            </p>
            {busy && (
              <ol className="steps">
                <li className="now">Reading {text.length.toLocaleString()} characters for people, places and objects</li>
              </ol>
            )}
          </div>
          <div className="composer">
            <input className="story-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
            <textarea className="story-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the passage here…" rows={7} />
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button
                className="ghost"
                onClick={() => {
                  setTitle(DEMO_STORY.title)
                  setText(DEMO_STORY.text)
                }}
              >
                Demo text
              </button>
              <button className="ghost" onClick={() => file.current?.click()}>
                .txt file
              </button>
              <input ref={file} type="file" accept=".txt,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <button className="primary" disabled={text.trim().length < 80 || busy} onClick={read}>
                {busy ? 'Reading…' : 'Read this story'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="thread">
            <h2>{story.title}</h2>
            <div className="fragments">
              <div className="fragment wide">
                <span className="label">Characters</span>
                <strong>{story.characters.join(', ') || 'None named'}</strong>
              </div>
              <div className="fragment">
                <span className="label">Places</span>
                <strong>{story.places.join(', ') || 'None named'}</strong>
              </div>
              <div className="fragment">
                <span className="label">Objects</span>
                <strong>{story.objects.join(', ') || 'None'}</strong>
              </div>
            </div>

            <div className="label">Scenes, in order</div>
            <ol className="scenes">
              {story.scenes.map((s) => {
                const spot = memorySpots.find((p) => p.id === s.spotId)
                return (
                  <li key={s.order}>
                    <button
                      className={active === s.order ? 'active' : ''}
                      onClick={() => {
                        const on = active !== s.order
                        setActive(on ? s.order : null)
                        props.onFocus(on ? s.spotId : null)
                      }}
                    >
                      <span className="num">{s.order}</span>
                      <div>
                        <strong>
                          {s.place}
                          <em className={s.placeType}>{s.placeType}</em>
                          <code>{Math.round(s.confidence * 100)}%</code>
                        </strong>
                        <span>{s.eventSummary}</span>
                        <span className="who">{[...s.characters, ...s.objects].join(' · ')}</span>
                        {s.evidence && <q>{s.evidence}</q>}
                        <span className="staged">{spot ? `Staged at: ${spot.label}` : 'Not staged: no matching place in this home'}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>

            {story.movement.length > 0 && (
              <>
                <div className="label">Movement</div>
                <ul className="plain">
                  {story.movement.map((mv, i) => (
                    <li key={i}>
                      <strong>{mv.character}</strong> {mv.from} → {mv.to}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="composer">
            <div className="actions">
              <button
                className="ghost"
                onClick={() => {
                  props.onFocus(null)
                  props.onStory(null)
                }}
              >
                Remove this layer
              </button>
              <button className="primary" onClick={props.onClose}>
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
