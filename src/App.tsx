import { useEffect, useRef, useState } from 'react'
import { YEARS, memorySpots, personRoutes, viewpoints, type ObjectId, type Vec3, type Year } from './config/scene'
import { ERAS, OBJECTS, objectById, type Layer, type MemoryObject } from './data/objects'
import { PEOPLE } from './data/people'
import { DeriveScene, type ItemId } from './scene/DeriveScene'
import type { XRMode } from './scene/XRTabletop'
import { MemoryCard } from './memory/MemoryCard'
import { MemoryDialog } from './memory/MemoryDialog'
import { loadMemories, saveMemories } from './memory/api'
import { isMemoryId, type MemoryAnalysis, type UserMemory } from './memory/types'
import { AgentActivity } from './agents/AgentActivity'
import { PlayButton } from './agents/PlayButton'
import { InterviewDialog } from './agents/InterviewDialog'
import { StoryDialog } from './agents/StoryDialog'
import { CompareDialog } from './agents/CompareDialog'
import { applyInterview, linkMemory, loadStory, saveStory, type InterviewFields, type Story } from './agents/api'

type Filter = 'all' | Layer
const FILTERS: Filter[] = ['all', 'family', 'tenants', 'current']
const START_YEAR: Year = 2026

export default function App() {
  const mount = useRef<HTMLDivElement>(null)
  const scene = useRef<DeriveScene | null>(null)
  const [year, setYear] = useState<Year>(START_YEAR)
  const [selected, setSelected] = useState<ItemId | null>(null)
  const [memories, setMemories] = useState<UserMemory[]>(loadMemories)
  const [memoryDialog, setMemoryDialog] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [personId, setPersonId] = useState<string | null>(null)
  const [showMovement, setShowMovement] = useState(false)
  const [showPath, setShowPath] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [debugPoint, setDebugPoint] = useState<Vec3 | null>(null)
  const [endCard, setEndCard] = useState(false)
  const [view, setView] = useState<string | null>(viewpoints[0].id)
  const [mode, setMode] = useState<'orbit' | 'walk'>('orbit')
  const [generated, setGenerated] = useState<ObjectId[]>([])
  // the agent dialogs share the left side of the screen with "Leave a memory": one at a time
  const [panel, setPanel] = useState<'interview' | 'story' | 'compare' | null>(null)
  const [linking, setLinking] = useState<string | null>(null)
  const [story, setStory] = useState<Story | null>(loadStory)
  const [showStory, setShowStory] = useState(true)
  const [xrMode, setXRMode] = useState<XRMode | null>(null) // what this device can enter, if anything
  const [inXR, setInXR] = useState(false)

  useEffect(() => {
    const s = new DeriveScene(
      mount.current!,
      {
        onSelect: setSelected,
        onLoaded: () => setStatus('ready'),
        onModelLoaded: (id) => setGenerated((g) => (g.includes(id) ? g : [...g, id])),
        onError: () => setStatus('error'),
        onDebugPoint: setDebugPoint,
        onModeChange: setMode,
        onXRChange: setInXR,
        onYearStep: (step) =>
          setYear((y) => YEARS[Math.min(YEARS.length - 1, Math.max(0, YEARS.indexOf(y) + step))]),
      },
      START_YEAR,
    )
    scene.current = s
    s.xrMode().then(setXRMode)
    return () => s.dispose()
  }, [])

  // a resident only counts while their own year is showing
  const residents = PEOPLE.filter((p) => p.year === year)
  const person = residents.find((p) => p.id === personId) ?? null
  const visible = OBJECTS.filter(
    (o) => (filter === 'all' || o.layers.includes(filter)) && (!person || person.objects.includes(o.id)),
  )
  const selectedVisible = selected && visible.some((o) => o.id === selected) ? (selected as ObjectId) : null
  const selectedMemory = isMemoryId(selected) ? memories.find((m) => m.id === selected) : undefined
  const selectedItem: ItemId | null = selectedMemory?.id ?? selectedVisible

  useEffect(() => scene.current?.setYear(year), [year])
  useEffect(() => scene.current?.setSelected(selectedItem), [selectedItem])
  // in the headset the story card floats above the object instead
  useEffect(() => {
    if (!inXR || !selectedItem) return scene.current?.setXRCard(null, null)
    if (selectedMemory) {
      const a = selectedMemory.analysis
      scene.current?.setXRCard(selectedItem, { kicker: a.time.text || 'A memory', title: a.title, body: a.story })
      return
    }
    const o = objectById(selectedItem as ObjectId)
    scene.current?.setXRCard(selectedItem, {
      kicker: `${year} · ${o.locationByYear[year]}`,
      title: o.name,
      body: o.storyByYear[year],
    })
  }, [inXR, selectedItem, selectedMemory, year])
  useEffect(() => {
    scene.current?.setMemories(
      memories.map((m) => ({
        id: m.id,
        form: m.analysis.object,
        position: m.position,
        fresh: Date.now() - m.createdAt < 2000, // just placed: play the generation effect
      })),
    )
    // move in to watch a new one appear
    const placed = memories.find((m) => Date.now() - m.createdAt < 2000)
    if (placed) {
      scene.current?.focusOn(placed.id)
      setView(null)
    }
    saveMemories(memories)
  }, [memories])
  useEffect(() => scene.current?.setVisible(visible.map((o) => o.id)), [filter, person])
  useEffect(() => scene.current?.setRoute(showMovement ? year : null), [showMovement, year])
  useEffect(() => scene.current?.setObjectPath(showPath ? selectedVisible : null), [showPath, selectedVisible])

  const goTo = (id: string) => {
    const v = viewpoints.find((p) => p.id === id)
    if (!v) return
    setView(id)
    scene.current?.goToView(v)
  }

  // the home turns slowly while a memory is being written
  useEffect(() => scene.current?.setAutoRotate(memoryDialog), [memoryDialog])

  // LITERATURE layer: the scenes of the imported story that could be staged in this home
  useEffect(() => {
    saveStory(story)
    const staged = (story?.scenes ?? []).flatMap((s) => {
      const spot = memorySpots.find((p) => p.id === s.spotId)
      return spot ? [{ order: s.order, position: spot.position }] : []
    })
    scene.current?.setStory(showStory ? staged : null)
  }, [story, showStory])

  // Saving or updating a memory hands it to the Historian, which looks for it elsewhere in time.
  const runHistorian = (memory: UserMemory, others: UserMemory[]) => {
    setLinking(memory.id)
    linkMemory(memory, others)
      .then((links) => setMemories((list) => list.map((m) => (m.id === memory.id ? { ...m, links } : m))))
      .catch(() => {}) // the activity panel shows the error; the memory is kept as it is
      .finally(() => setLinking((id) => (id === memory.id ? null : id)))
  }

  const saveInterview = (fields: InterviewFields) => {
    if (!selectedMemory) return
    const updated = applyInterview(selectedMemory, fields)
    setMemories((list) => list.map((m) => (m.id === updated.id ? updated : m)))
    setPanel(null)
    // a year learned in the interview can move the memory to another version of the home
    if (updated.analysis.layer !== selectedMemory.analysis.layer && YEARS.includes(updated.analysis.layer as Year)) setYear(updated.analysis.layer as Year)
    runHistorian(updated, memories.filter((m) => m.id !== updated.id))
  }

  // Open whatever a Historian link or a comparison row points at.
  const openNode = (id: string) => {
    if (id.startsWith('person-')) {
      const p = PEOPLE.find((x) => `person-${x.id}` === id)
      if (!p) return
      setYear(p.year)
      setPersonId(p.id)
      return
    }
    setFilter('all')
    setPersonId(null)
    setSelected(id as ItemId)
    if (isMemoryId(id)) return
    setShowPath(true)
    scene.current?.focusOn(id as ItemId, 4)
    setView(null)
  }

  const openPanel = (next: typeof panel) => {
    setMemoryDialog(false)
    setPanel(next)
  }

  // Put an analysed memory into the room as a new object and open its card.
  const placeMemory = (text: string, analysis: MemoryAnalysis, photo?: string) => {
    const spot = memorySpots.find((s) => s.id === analysis.place.spotId) ?? memorySpots[0]
    // the first memory takes the spot itself; later ones step slightly aside
    const n = memories.filter((m) => m.analysis.place.spotId === spot.id).length
    const angle = n * 2.4
    const r = n ? 0.16 : 0
    const [x, y, z] = spot.position
    const memory: UserMemory = {
      id: `mem-${Date.now().toString(36)}`,
      text,
      photo,
      analysis,
      position: [x + Math.cos(angle) * r, y, z + Math.sin(angle) * r],
      createdAt: Date.now(),
    }
    setMemories((list) => [...list, memory])
    runHistorian(memory, memories)
    setMemoryDialog(false)
    setSelected(memory.id)
    if (YEARS.includes(analysis.layer as Year)) setYear(analysis.layer as Year)
  }

  // E toggles the closing card for screen recordings.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input, textarea')) return
      if (e.key === 'e' || e.key === 'E') setEndCard((v) => !v)
      if (e.key === 'Escape') setSelected(null)
      // 1-9 jump between camera angles
      const v = viewpoints[Number(e.key) - 1]
      if (v) goTo(v.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const route = personRoutes[year]
  // the interview belongs to the selected memory: deselecting it ends the interview
  const dialogOpen = memoryDialog || (panel !== null && (panel !== 'interview' || !!selectedMemory))

  return (
    <>
      <div ref={mount} className="viewport" />
      {status === 'ready' && <div id="loaded" />}

      <header className={`brand ${mode}`}>
        <h1>Dérive Home</h1>
        <p>Living Memory Graph</p>
      </header>

      {xrMode && status === 'ready' && (
        <button className="xr-enter" onClick={() => (inXR ? scene.current?.exitXR() : scene.current?.enterXR(xrMode))}>
          {inXR ? 'Exit headset' : xrMode === 'immersive-ar' ? 'Enter MR · Dollhouse' : 'Enter VR · Dollhouse'}
        </button>
      )}

      <div className="side">
        <nav className="controls">
          <div className="label">Home Version History</div>
          <div className="years">
            {YEARS.map((y) => (
              <button key={y} className={y === year ? 'year active' : 'year'} onClick={() => setYear(y)}>
                <span className="num">{y}</span>
                <span className="era">{ERAS[y].label}</span>
              </button>
            ))}
          </div>
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f} className={f === filter ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="label">Residents · {year}</div>
          <div className="filters people">
            {residents.map((p) => (
              <button
                key={p.id}
                className={p === person ? 'chip active' : 'chip'}
                onClick={() => setPersonId(p === person ? null : p.id)}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
          {person && (
            <div className="resident">
              <strong>{person.name}</strong>
              <em>{person.fate ? `${person.role} · ${person.fate}` : person.role}</em>
              <span>{person.bio}</span>
            </div>
          )}
          <label className="toggle">
            <input type="checkbox" checked={showMovement} onChange={(e) => setShowMovement(e.target.checked)} />
            Show Movement
          </label>
          {story && (
            <label className="toggle story">
              <input type="checkbox" checked={showStory} onChange={(e) => setShowStory(e.target.checked)} />
              Literature · {story.title}
            </label>
          )}
          {showMovement && (
            <div className="route">
              <strong>{route.person}</strong>
              <span>{route.stops.join(' → ')}</span>
            </div>
          )}
          {generated.length > 0 && (
            <div className="kaedim">
              <strong>3D models generated with Kaedim</strong>
              <span>
                {OBJECTS.filter((o) => generated.includes(o.id))
                  .map((o) => o.name)
                  .join(' · ')}
              </span>
            </div>
          )}
        </nav>

        {selectedMemory && (
          <MemoryCard
            memory={selectedMemory}
            linking={linking === selectedMemory.id}
            onInterview={() => openPanel('interview')}
            onOpenLink={openNode}
            onClose={() => setSelected(null)}
            onRemove={() => {
              setMemories((list) => list.filter((m) => m.id !== selectedMemory.id))
              setSelected(null)
            }}
          />
        )}

        {selectedVisible && (
          <StoryCard
            object={objectById(selectedVisible)}
            generated={generated.includes(selectedVisible)}
            year={year}
            onYear={setYear}
            showPath={showPath}
            onShowPath={setShowPath}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <nav className="views">
        <div className="label">Views</div>
        {viewpoints.map((v, i) => (
          <button key={v.id} className={v.id === view ? 'active' : ''} onClick={() => goTo(v.id)}>
            <span className="num">{i + 1}</span>
            {v.label}
          </button>
        ))}
        {mode === 'walk' && (
          <p className="walkhelp">
            Inside the home
            <br />
            Drag to look · W A S D to walk
            <br />
            Click the floor to move there
          </p>
        )}
      </nav>

      {memoryDialog && (
        <MemoryDialog
          onPlace={placeMemory}
          onPreview={(spotId) => scene.current?.setBeacon(memorySpots.find((s) => s.id === spotId)?.position ?? null)}
          onClose={() => setMemoryDialog(false)}
        />
      )}
      {panel === 'interview' && selectedMemory && (
        <InterviewDialog key={selectedMemory.id} memory={selectedMemory} onSave={saveInterview} onClose={() => setPanel(null)} />
      )}
      {panel === 'story' && (
        <StoryDialog
          story={story}
          onStory={(next) => {
            setStory(next)
            if (next) setShowStory(true)
          }}
          onFocus={(spotId) => scene.current?.setBeacon(memorySpots.find((s) => s.id === spotId)?.position ?? null)}
          onClose={() => {
            scene.current?.setBeacon(null)
            setPanel(null)
          }}
        />
      )}
      {panel === 'compare' && (
        <CompareDialog memories={memories} year={year} onYear={setYear} onSelect={openNode} onClose={() => setPanel(null)} />
      )}
      {!dialogOpen && !endCard && (
        <div className="dock">
          <button className="memory-open" onClick={() => setMemoryDialog(true)}>
            <span className="pulse" />
            Leave a memory
          </button>
          <button className="memory-open plain" onClick={() => openPanel('story')}>
            Import a story
          </button>
          <button className="memory-open plain" onClick={() => openPanel('compare')}>
            Compare eras
          </button>
        </div>
      )}
      {!endCard && <AgentActivity shifted={dialogOpen} />}

      {!selectedItem && !endCard && !dialogOpen && (
        <footer className={`hint ${mode}`}>
          {status === 'loading' && 'Loading the apartment…'}
          {status === 'ready' && 'Select an object to follow its history through the home.'}
          {status === 'error' &&
            'Apartment model not found — put it at public/assets/apartment/scene.glb. Objects still work.'}
        </footer>
      )}

      {debugPoint && <div className="debug">[{debugPoint.join(', ')}] — copied</div>}

      {endCard && (
        <div className="endcard" onClick={() => setEndCard(false)}>
          <p>A home is a sequence of lives occupying the same coordinates.</p>
          <h2>Dérive Home</h2>
        </div>
      )}
    </>
  )
}

function StoryCard(props: {
  object: MemoryObject
  generated: boolean
  year: Year
  onYear: (y: Year) => void
  showPath: boolean
  onShowPath: (v: boolean) => void
  onClose: () => void
}) {
  const { object: o, year } = props
  const [openInside, setOpenInside] = useState(false)
  const [openNote, setOpenNote] = useState(false)
  const index = OBJECTS.indexOf(o) + 1
  const neverMoved = YEARS.every((y) => o.locationByYear[y] === o.locationByYear[YEARS[0]])

  useEffect(() => {
    setOpenInside(false)
    setOpenNote(false)
  }, [o.id])

  return (
    <aside className="card">
      <button className="close" onClick={props.onClose} aria-label="Close">
        ×
      </button>
      <div className="label">
        {String(index).padStart(2, '0')} · {year}
      </div>
      <h2>{o.name}</h2>
      {props.generated && <div className="badge">3D model generated with Kaedim</div>}
      <p className="summary">{o.summary}</p>

      <dl>
        <dt>Owner</dt>
        <dd>{o.ownerByYear[year]}</dd>
        <dt>Location</dt>
        <dd>{o.locationByYear[year]}</dd>
      </dl>
      <p className="story">{o.storyByYear[year]}</p>
      <PlayButton text={o.storyByYear[year]} label="Listen" />

      {o.foundInside && (
        <section>
          <div className="label">Found Inside</div>
          <button className="link" onClick={() => setOpenInside((v) => !v)}>
            {o.foundInside.name} <span>{openInside ? '−' : '+'}</span>
          </button>
          {openInside && (
            <div className="nested">
              {o.foundInside.detail.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {o.passedForward && (
        <section>
          <div className="label">Passed Forward</div>
          <p className="small">{o.passedForward.text}</p>
          <button className="link" onClick={() => setOpenNote((v) => !v)}>
            View Note <span>{openNote ? '−' : '+'}</span>
          </button>
          {openNote && <div className="nested note">{o.passedForward.note}</div>}
        </section>
      )}

      <section>
        <div className="label">Object History</div>
        <ol className="history">
          {YEARS.map((y) => (
            <li key={y}>
              <button className={y === year ? 'active' : ''} onClick={() => props.onYear(y)}>
                <span className="num">{y}</span>
                <span>{o.locationByYear[y]}</span>
              </button>
            </li>
          ))}
        </ol>
        {neverMoved ? (
          <p className="small">Never moved.</p>
        ) : (
          <label className="toggle">
            <input type="checkbox" checked={props.showPath} onChange={(e) => props.onShowPath(e.target.checked)} />
            Show Object Path
          </label>
        )}
      </section>
    </aside>
  )
}
