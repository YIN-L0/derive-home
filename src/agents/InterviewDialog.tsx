import { useEffect, useRef, useState } from 'react'
import type { UserMemory } from '../memory/types'
import { interviewTurn, missingFields, type InterviewFields, type InterviewTurn, type Line } from './api'
import { PlayButton } from './PlayButton'
import { canListen, listen } from './speech'
import '../memory/memory.css'
import './agents.css'

const MAX_QUESTIONS = 5
const LABELS: [keyof InterviewFields, string][] = [
  ['person', 'Who'],
  ['relationship', 'Relationship'],
  ['year', 'When'],
  ['event', 'What happened'],
  ['location', 'Where'],
]

// "Talk about this memory": the Voice Interview agent asks for what the memory is missing,
// one question at a time. A question is read aloud only when its play button is pressed.
// Answers are spoken or typed. Nothing is saved until the end.
export function InterviewDialog(props: { memory: UserMemory; onSave: (fields: InterviewFields) => void; onClose: () => void }) {
  const { memory: m } = props
  const [missing] = useState(() => missingFields(m))
  const [lines, setLines] = useState<Line[]>([])
  const [turn, setTurn] = useState<InterviewTurn | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [listening, setListening] = useState(false)
  const stopListening = useRef<(() => void) | null>(null)
  const alive = useRef(true)
  const thread = useRef<HTMLDivElement>(null)

  const stop = () => {
    stopListening.current?.()
    stopListening.current = null
    setListening(false)
  }

  const hear = () => {
    if (!canListen) return
    stop()
    setListening(true)
    stopListening.current = listen(m.analysis.language || navigator.language, setAnswer, (said) => {
      setListening(false)
      stopListening.current = null
      if (said) send(said)
    })
  }

  const ask = async (transcript: Line[]) => {
    setBusy(true)
    setError(null)
    try {
      const next = await interviewTurn(m, missing, transcript)
      if (!alive.current) return
      const asked = transcript.filter((l) => l.role === 'agent').length
      // the agent decides when it is finished, but never gets more than a handful of questions
      const done = next.done || !next.question || asked >= MAX_QUESTIONS
      setTurn({ ...next, done })
      if (done) return setLines(transcript)
      setLines([...transcript, { role: 'agent', text: next.question! }])
    } catch (err) {
      if (alive.current) setError((err as Error).message)
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const send = (text: string) => {
    if (!text.trim() || busy) return
    stop()
    setAnswer('')
    const next: Line[] = [...linesRef.current, { role: 'user', text: text.trim() }]
    setLines(next)
    ask(next)
  }
  const linesRef = useRef(lines)
  linesRef.current = lines

  useEffect(() => {
    alive.current = true
    if (missing.length) ask([])
    return () => {
      alive.current = false
      stopListening.current?.()
    }
  }, [])

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' })
  }, [lines, turn, busy])

  const fields = turn?.fields
  const learned = fields ? LABELS.filter(([k]) => fields[k] !== null) : []
  const done = !missing.length || !!turn?.done

  return (
    <section className="memory-dialog" role="dialog" aria-label="Talk about this memory">
      <header>
        <span className="pulse" />
        <span className="label">Voice Interview · {m.analysis.title}</span>
        <button className="close" onClick={props.onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="thread" ref={thread}>
        <p className="manifesto quiet">
          {missing.length
            ? `This memory is missing: ${missing.join(', ')}. One question at a time. “I don't know” is a complete answer.`
            : 'Nothing is missing from this memory. There is nothing to ask.'}
        </p>

        {lines.map((l, i) => (
          <p key={i} className={`line ${l.role} rise`}>
            {l.text}
            {l.role === 'agent' && <PlayButton text={l.text} label="Hear it" />}
          </p>
        ))}
        {busy && <p className="line agent thinking">…</p>}
        {error && <p className="error">{error}</p>}

        {done && missing.length > 0 && (
          <div className="rise">
            <div className="fragments">
              {learned.map(([k, label]) => (
                <div key={k} className="fragment">
                  <span className="label">{label}</span>
                  <strong>{k === 'year' ? (fields!.yearText ?? fields!.year) : fields![k]}</strong>
                  {k === 'year' && fields!.yearText && <span>≈ {fields!.year}</span>}
                </div>
              ))}
              {turn!.unknown.map((k) => (
                <div key={k} className="fragment">
                  <span className="label">{LABELS.find(([key]) => key === k)![1]}</span>
                  <strong className="unknown">Unknown</strong>
                  <span>left empty, not guessed</span>
                </div>
              ))}
            </div>
            {!learned.length && <p className="followup">Nothing new to add. The memory stays as it was.</p>}
          </div>
        )}
      </div>

      <div className="composer">
        {!done && (
          <form
            className="ask"
            onSubmit={(e) => {
              e.preventDefault()
              send(answer)
            }}
          >
            <div>
              <input
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={listening ? 'Listening…' : 'Answer, or say it aloud'}
                disabled={busy && !lines.length}
              />
              <button className="ghost" type="submit" disabled={!answer.trim() || busy}>
                Answer
              </button>
            </div>
          </form>
        )}
        <div className="actions">
          {!done && canListen && (
            <button className={listening ? 'ghost live' : 'ghost'} onClick={() => (listening ? stop() : hear())} disabled={busy}>
              {listening ? '● Listening' : 'Speak'}
            </button>
          )}
          {!done && lines.some((l) => l.role === 'user') && (
            <button className="ghost" onClick={() => {
                stop()
                setTurn((t) => t && { ...t, done: true })
              }} disabled={busy}>
              Finish
            </button>
          )}
          {done &&
            (learned.length ? (
              <button className="primary" onClick={() => props.onSave(fields!)}>
                Save to the memory
              </button>
            ) : (
              <button className="primary" onClick={props.onClose}>
                Close
              </button>
            ))}
        </div>
      </div>
    </section>
  )
}
