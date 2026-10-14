import { useEffect, useState } from 'react'
import './xr.css'

// In the headset there is no system keyboard for the page, so typing into a field happens here.
// It is ordinary page UI, drawn onto the floating screen like everything else, and only shows
// while a text field has focus. Keys edit the focused field the way typing would, so React's
// onChange and onKeyDown handlers run as usual.

type Field = HTMLInputElement | HTMLTextAreaElement

const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const SYMBOLS = ['1234567890', '-/:;()&@"', ".,?!'#%"]

const isField = (el: Element | null): el is Field =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !['checkbox', 'radio', 'file', 'range', 'hidden'].includes(el.type))

export function XRKeyboard() {
  const [field, setField] = useState<Field | null>(() => (isField(document.activeElement) ? document.activeElement : null))
  const [shift, setShift] = useState(false)
  const [symbols, setSymbols] = useState(false)

  useEffect(() => {
    const onFocus = () => setField(isField(document.activeElement) ? document.activeElement : null)
    const onBlur = () => setTimeout(onFocus) // activeElement only settles after focusout
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
    }
  }, [])

  if (!field) return null

  const edit = (text: string, back = false) => {
    const start = field.selectionStart ?? field.value.length
    const end = field.selectionEnd ?? start
    if (back) {
      if (start === end && start > 0) field.setRangeText('', start - 1, end, 'end')
      else field.setRangeText('', start, end, 'end')
    } else field.setRangeText(text, start, end, 'end')
    // the value changed behind React's back; an input event makes it notice, like real typing
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const type = (ch: string) => {
    edit(shift ? ch.toUpperCase() : ch)
    if (shift) setShift(false)
  }

  const enter = () => {
    const e = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })
    // a dialog may take Enter as "send"; otherwise a text area gets a new line
    if (field.dispatchEvent(e) && field instanceof HTMLTextAreaElement) edit('\n')
  }

  const rows = symbols ? SYMBOLS : LETTERS
  return (
    <div className="xr-keyboard" data-keep-focus>
      {rows.map((row, i) => (
        <div key={row} className="row">
          {i === 2 && !symbols && (
            <button className={shift ? 'wide on' : 'wide'} onClick={() => setShift((v) => !v)}>
              ⇧
            </button>
          )}
          {[...row].map((ch) => (
            <button key={ch} onClick={() => type(ch)}>
              {shift ? ch.toUpperCase() : ch}
            </button>
          ))}
          {i === 2 && (
            <button className="wide" onClick={() => edit('', true)}>
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="row">
        <button className="wide" onClick={() => setSymbols((v) => !v)}>
          {symbols ? 'ABC' : '123'}
        </button>
        <button className="space" onClick={() => edit(' ')}>
          space
        </button>
        <button className="wide" onClick={enter}>
          return
        </button>
        <button className="wide done" onClick={() => field.blur()}>
          done
        </button>
      </div>
    </div>
  )
}
