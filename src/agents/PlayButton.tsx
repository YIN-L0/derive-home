import { useEffect, useRef, useState } from 'react'
import { hush, speak } from './speech'
import './agents.css'

// Reads a text aloud when pressed, and only then. Pressing again stops it.
export function PlayButton({ text, label = 'Play' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const mine = useRef(false) // this button started what is playing now

  useEffect(
    () => () => {
      if (mine.current) hush()
    },
    [text],
  )

  const toggle = async () => {
    if (state === 'loading') return
    if (state === 'playing') return hush()
    setError(null)
    setState('loading')
    mine.current = true
    try {
      await speak(text, () => setState('playing'))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      mine.current = false
      setState('idle')
    }
  }

  return (
    <>
      <button className={`play ${state}`} onClick={toggle} title={error ?? undefined} aria-label={state === 'idle' ? `${label} aloud` : 'Stop'}>
        <span>{state === 'playing' ? '■' : state === 'loading' ? '…' : '▶'}</span>
        {state === 'playing' ? 'Stop' : state === 'loading' ? 'Loading' : label}
      </button>
      {error && <span className="play-error">{error}</span>}
    </>
  )
}
