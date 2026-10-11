import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { memorySpots } from '../config/scene'
import { analyzeMemory, readPhoto } from './api'
import { EXAMPLES } from './examples'
import type { MemoryAnalysis } from './types'
import './memory.css'

const STEPS = ['Listening', 'Separating time, object and place', 'Finding where it was in the room', 'Imagining the other version']
type Example = (typeof EXAMPLES)[number]

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

const delay = (i: number) => ({ '--i': i }) as CSSProperties

// The visitor's words with the fragments the model picked out underlined and tagged.
function Marked({ text, quotes }: { text: string; quotes: MemoryAnalysis['quotes'] }) {
  const tags: [string, string | undefined][] = [
    ['when', quotes?.time],
    ['object', quotes?.object],
    ['where', quotes?.place],
    ['who', quotes?.people],
  ]
  const lower = text.toLowerCase()
  const spans = tags
    .map(([tag, quote]) => {
      const at = quote ? lower.indexOf(quote.toLowerCase()) : -1
      return { tag, start: at, end: at + (quote?.length ?? 0) }
    })
    .filter((s) => s.start >= 0)
    .sort((a, b) => a.start - b.start)

  const out: ReactNode[] = []
  let cursor = 0
  let n = 0
  for (const s of spans) {
    if (s.start < cursor) continue // overlaps the previous fragment
    out.push(text.slice(cursor, s.start))
    out.push(
      <mark key={s.tag} style={delay(n++)}>
        {text.slice(s.start, s.end)}
        <sup>{s.tag}</sup>
      </mark>,
    )
    cursor = s.end
  }
  out.push(text.slice(cursor))
  return <>{out}</>
}

export function MemoryDialog(props: {
  onPlace: (text: string, analysis: MemoryAnalysis, photo?: string) => void
  // called with a spot id while the dialog proposes a place for the memory, and null when it stops
  onPreview: (spotId: string | null) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string>()
  const [phase, setPhase] = useState<'compose' | 'analyzing' | 'result'>('compose')
  const [step, setStep] = useState(0)
  const [analysis, setAnalysis] = useState<MemoryAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [recorded, setRecorded] = useState(false) // showing a recorded answer because the live call failed
  const [answer, setAnswer] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const typing = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const file = useRef<HTMLInputElement>(null)
  const thread = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (phase !== 'analyzing') return
    setStep(0)
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1300)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(
    () => () => {
      recognition.current?.stop()
      clearInterval(typing.current)
    },
    [],
  )

  // While a result is on screen, the room shows where the memory would go.
  const spotId = phase === 'result' ? (analysis?.place.spotId ?? null) : null
  useEffect(() => {
    props.onPreview(spotId)
    return () => props.onPreview(null)
  }, [spotId])

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = 0
  }, [phase])

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

  const submit = async (memory: string, example?: Example) => {
    recognition.current?.stop()
    clearInterval(typing.current)
    setError(null)
    setRecorded(false)
    setAnswer('')
    setText(memory)
    setPhase('analyzing')
    try {
      setAnalysis(await analyzeMemory(memory, !!photo))
      setPhase('result')
    } catch (err) {
      if (example) {
        // keep a presentation going without the network, and say that is what happened
        setAnalysis(example.analysis)
        setRecorded(true)
        setPhase('result')
        return
      }
      setError((err as Error).message)
      setPhase('compose')
    }
  }

  // Type an example in, then read it like any other memory.
  const runExample = (example: Example) => {
    recognition.current?.stop()
    clearInterval(typing.current)
    setError(null)
    const chars = Array.from(example.text)
    const perTick = Math.max(1, Math.round(chars.length / 80))
    let n = 0
    typing.current = setInterval(() => {
      n = Math.min(chars.length, n + perTick)
      setText(chars.slice(0, n).join(''))
      if (n < chars.length) return
      clearInterval(typing.current)
      setTimeout(() => submit(example.text, example), 600)
    }, 26)
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
  const said = text.trim()

  return (
    <section className="memory-dialog" role="dialog" aria-label="Leave a memory">
      <header>
        <span className="pulse" />
        <span className="label">Leave a memory</span>
        <button className="close" onClick={props.onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="thread" ref={thread}>
        {phase === 'compose' && (
          <>
            <h2 className="rise">
              This home has more than <em>one version.</em>
            </h2>
            <p className="manifesto rise" style={delay(1)}>
              The room you remember and the room that was scanned are parallel universes that happen to share
              coordinates. Neither one is the original.
            </p>
            <p className="manifesto rise" style={delay(2)}>
              Tell it something that happened here: an object, a year, who was in the room. Your words will be taken
              apart into time, thing and place, and set back into the scan as a new object.
            </p>
            <p className="manifesto quiet rise" style={delay(3)}>
              Nothing is overwritten. Your version does not correct the others. It runs alongside them.
            </p>
            <p className="prompt-line rise" style={delay(5)}>
              What do you remember here?
            </p>
          </>
        )}

        {phase === 'analyzing' && (
          <>
            <p className="said scanning">{said}</p>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
                  {s}
                </li>
              ))}
            </ol>
          </>
        )}

        {phase === 'result' && a && (
          <>
            <p className="said">
              <Marked text={said} quotes={a.quotes} />
            </p>

            <h2 className="rise" style={delay(5)}>
              {a.title}
            </h2>

            <div className="fragments">
              <div className="fragment rise" style={delay(6)}>
                <span className="label">When</span>
                <strong>{a.time.text}</strong>
                {a.time.certainty !== 'exact' && <span>{a.time.certainty}</span>}
              </div>
              <div className="fragment rise" style={delay(7)}>
                <span className="label">Object</span>
                <strong>{a.object.name}</strong>
              </div>
              <div className="fragment rise" style={delay(8)}>
                <span className="label">Where</span>
                <strong>{a.place.text}</strong>
                {spot && <span>marked in the room: {spot.label}</span>}
              </div>
              <div className="fragment rise" style={delay(9)}>
                <span className="label">Who</span>
                <strong>{a.people.length ? a.people.join(', ') : 'Nobody named'}</strong>
              </div>
              <div className="fragment wide rise" style={delay(10)}>
                <span className="label">What happened</span>
                <strong>{a.event}</strong>
                <span>{a.feeling}</span>
              </div>
            </div>

            <div className="parallel rise" style={delay(12)}>
              <div className="label">Meanwhile</div>
              <p>{a.parallel}</p>
            </div>

            <div className="form rise" style={delay(14)}>
              <span className="swatch" style={{ background: a.object.color }} />
              <div>
                <strong>
                  New object: {a.object.name}, about {Math.round(a.object.sizeCm)} cm
                </strong>
                <span className="note">
                  {photo
                    ? 'Demo: the form comes from your words. Rebuilding it in 3D from the photograph is not connected yet.'
                    : 'Demo: a simple stand-in form derived from your words.'}
                </span>
              </div>
            </div>

            {a.followUp && (
              <form
                className="ask rise"
                style={delay(15)}
                onSubmit={(e) => {
                  e.preventDefault()
                  if (answer.trim()) submit(`${said} ${answer.trim()}`)
                }}
              >
                <p>{a.followUp}</p>
                <div>
                  <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer, and it reads again" />
                  <button className="ghost" type="submit" disabled={!answer.trim()}>
                    Answer
                  </button>
                </div>
              </form>
            )}
            {recorded && (
              <p className="followup">The model could not be reached, so this is the answer recorded for this example.</p>
            )}

            <div className="actions rise" style={delay(15)}>
              <button className="ghost" onClick={() => setPhase('compose')}>
                Rewrite
              </button>
              <button className="primary" onClick={() => props.onPlace(said, a, photo)}>
                Place it in the home
              </button>
            </div>
          </>
        )}
      </div>

      {phase === 'compose' && (
        <div className="composer">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && said) submit(said)
            }}
            placeholder="It was winter. There was a kettle beside the stove…"
            rows={4}
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
                {listening ? '● Listening' : 'Speak'}
              </button>
            )}
            <button className="ghost" onClick={() => file.current?.click()}>
              {photo ? 'Change photo' : 'Photo'}
            </button>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            <button className="primary" disabled={!said} onClick={() => submit(said)}>
              Read this memory
            </button>
          </div>
          <div className="examples">
            <span className="label">Or begin with someone else's</span>
            {EXAMPLES.map((ex) => (
              <button key={ex.label} onClick={() => runExample(ex)}>
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
