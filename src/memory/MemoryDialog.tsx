import { useEffect, useRef, useState } from 'react'
import { memorySpots } from '../config/scene'
import { analyzeMemory, readPhoto } from './api'
import type { MemoryAnalysis } from './types'
import './memory.css'

const STEPS = ['Reading the memory', 'Separating time, object and place', 'Finding where it was in the room', 'Giving it a form']

// Chrome and Safari expose speech recognition under a prefix; there are no built-in types for it.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void
  onend: () => void
  onerror: () => void
  start: () => void
  stop: () => void
}
const SpeechRecognition = (window as unknown as Record<string, new () => Recognition>).SpeechRecognition ??
  (window as unknown as Record<string, new () => Recognition>).webkitSpeechRecognition

export function MemoryDialog(props: {
  onPlace: (text: string, analysis: MemoryAnalysis, photo?: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string>()
  const [phase, setPhase] = useState<'compose' | 'analyzing' | 'result'>('compose')
  const [step, setStep] = useState(0)
  const [analysis, setAnalysis] = useState<MemoryAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const recognition = useRef<Recognition | null>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase !== 'analyzing') return
    setStep(0)
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => () => recognition.current?.stop(), [])

  const toggleMic = () => {
    if (listening) return recognition.current?.stop()
    const r = new SpeechRecognition()
    const before = text.trim()
    r.lang = navigator.language
    r.interimResults = true
    r.continuous = true
    r.onresult = (e) => {
      const said = Array.from(e.results, (result) => result[0].transcript).join('')
      setText(before ? `${before} ${said}` : said)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recognition.current = r
    r.start()
    setListening(true)
  }

  const submit = async () => {
    recognition.current?.stop()
    setError(null)
    setPhase('analyzing')
    try {
      setAnalysis(await analyzeMemory(text.trim(), !!photo))
      setPhase('result')
    } catch (err) {
      setError((err as Error).message)
      setPhase('compose')
    }
  }

  const onPhoto = async (f: File | undefined) => {
    if (!f) return
    try {
      setPhoto(await readPhoto(f))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const a = analysis
  const spot = a && memorySpots.find((s) => s.id === a.place.spotId)

  return (
    <section className="memory-dialog" role="dialog" aria-label="Leave a memory">
      <button className="close" onClick={props.onClose} aria-label="Close">
        ×
      </button>
      <div className="label">Leave a memory</div>

      {phase !== 'result' && (
        <>
          <h2>This home has more than one version.</h2>
          <p className="manifesto">
            The room you remember and the room that was scanned are parallel universes that happen to share
            coordinates. Neither one is the original.
          </p>
          <p className="manifesto">
            Tell it something that happened here: an object, a year, who was in the room. Your words will be taken
            apart into time, thing and place, and set back into the scan as a new object.
          </p>
          <p className="manifesto quiet">
            Nothing is overwritten. Your version does not correct the others. It runs alongside them.
          </p>
        </>
      )}

      {phase === 'compose' && (
        <>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) submit()
            }}
            placeholder={
              'In the winter of 2009 my mother kept a blue enamel kettle beside the stove. The night the power went out she boiled water on a camping burner and we all drank tea on the rug.\n\n也可以用中文讲。'
            }
            rows={6}
          />
          {photo && (
            <div className="photo">
              <img src={photo} alt="" />
              <span>Photograph attached</span>
              <button onClick={() => setPhoto(undefined)}>Remove</button>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <div className="actions">
            {SpeechRecognition && (
              <button className={listening ? 'ghost live' : 'ghost'} onClick={toggleMic}>
                {listening ? '● Listening — tap to stop' : 'Speak'}
              </button>
            )}
            <button className="ghost" onClick={() => file.current?.click()}>
              {photo ? 'Change photo' : 'Add a photo'}
            </button>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            <button className="primary" disabled={!text.trim()} onClick={submit}>
              Read this memory
            </button>
          </div>
        </>
      )}

      {phase === 'analyzing' && (
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
              {s}
            </li>
          ))}
        </ol>
      )}

      {phase === 'result' && a && (
        <>
          <h2>{a.title}</h2>
          <blockquote>{text.trim()}</blockquote>

          <dl className="breakdown">
            <dt>When</dt>
            <dd>
              {a.time.text}
              {a.time.certainty !== 'exact' && <em> · {a.time.certainty}</em>}
            </dd>
            <dt>Object</dt>
            <dd>{a.object.name}</dd>
            <dt>Where</dt>
            <dd>
              {a.place.text}
              {spot && <em> · placed at: {spot.label}</em>}
            </dd>
            {a.people.length > 0 && (
              <>
                <dt>Who</dt>
                <dd>{a.people.join(', ')}</dd>
              </>
            )}
            <dt>What happened</dt>
            <dd>{a.event}</dd>
            <dt>Feeling</dt>
            <dd>{a.feeling}</dd>
          </dl>

          <div className="parallel">
            <div className="label">Parallel universe</div>
            <p>{a.parallel}</p>
          </div>

          <div className="form">
            <span className="swatch" style={{ background: a.object.color }} />
            <div>
              <strong>New object: {a.object.name}</strong>
              <span>
                {a.object.description} About {Math.round(a.object.sizeCm)} cm.
              </span>
              <span className="note">
                {photo
                  ? 'Demo: the form comes from your words. Rebuilding the object in 3D from the photograph is not connected yet.'
                  : 'Demo: the form is a simple stand-in derived from your words.'}
              </span>
            </div>
          </div>

          {a.followUp && <p className="followup">{a.followUp}</p>}

          <div className="actions">
            <button className="ghost" onClick={() => setPhase('compose')}>
              Rewrite
            </button>
            <button className="primary" onClick={() => props.onPlace(text.trim(), a, photo)}>
              Place it in the home
            </button>
          </div>
        </>
      )}
    </section>
  )
}
