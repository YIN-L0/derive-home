import * as THREE from 'three'

// The page's own React UI, shown inside the headset. Each top-level region of #root (the side
// panel, the views list, the dock, a dialog…) is drawn into its own canvas and laid out on a
// floating screen exactly as it sits on the monitor. Controller clicks are turned back into
// DOM events at the matching point of the real page, so every button, toggle and text field
// keeps working without a second UI. Only what changed is redrawn, at most a few times a second.

const REDRAW_MS = 120 // a region is redrawn at most this often
const MAX_TEXTURE = 4096

export interface ScreenHit {
  point: THREE.Vector3
  distance: number
  target: Element // the element of the real page under the pointer
  x: number // client coordinates on the page
  y: number
}

class Region {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  dirty = true
  last = 0
  private canvas = document.createElement('canvas')
  private texture: THREE.CanvasTexture | null = null
  private observer: MutationObserver
  private rect = new DOMRect()

  constructor(public el: HTMLElement) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, toneMapped: false }),
    )
    this.mesh.renderOrder = 40
    this.mesh.material.opacity = 0 // until the first drawing, instead of a white card
    this.observer = new MutationObserver(this.markDirty)
    this.observer.observe(el, { attributes: true, childList: true, subtree: true, characterData: true })
    // form state and scrolling are not reported as mutations
    for (const type of ['input', 'change', 'scroll', 'focusin', 'focusout', 'load']) el.addEventListener(type, this.markDirty, true)
  }

  markDirty = () => {
    this.dirty = true
  }

  // Place the plane where the region sits on the page; `k` converts CSS pixels to meters.
  layout(k: number, z: number) {
    const r = this.el.getBoundingClientRect()
    if (r.width !== this.rect.width || r.height !== this.rect.height) this.dirty = true
    this.rect = r
    this.mesh.visible = r.width > 0 && r.height > 0
    this.mesh.scale.set(r.width * k, r.height * k, 1)
    this.mesh.position.set((r.left + r.width / 2 - innerWidth / 2) * k, -(r.top + r.height / 2 - innerHeight / 2) * k, z)
  }

  redraw(now: number) {
    const r = this.rect
    if (!r.width || !r.height) return
    const scale = Math.min(2, MAX_TEXTURE / r.width, MAX_TEXTURE / r.height)
    const w = Math.ceil(r.width * scale)
    const h = Math.ceil(r.height * scale)
    if (!this.texture || this.canvas.width !== w || this.canvas.height !== h) {
      // a texture keeps its first size, so a resized region gets a new one
      this.texture?.dispose()
      this.canvas = document.createElement('canvas')
      this.canvas.width = w
      this.canvas.height = h
      this.texture = new THREE.CanvasTexture(this.canvas)
      this.texture.colorSpace = THREE.SRGBColorSpace
      this.texture.generateMipmaps = false
      this.texture.minFilter = THREE.LinearFilter
      this.texture.anisotropy = 8
      this.mesh.material.map = this.texture
      this.mesh.material.opacity = 1
      this.mesh.material.needsUpdate = true
    }
    const ctx = this.canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h)
    // draw in page coordinates
    ctx.setTransform(scale, 0, 0, scale, -r.left * scale, -r.top * scale)
    rasterize(ctx, this.el)
    this.texture.needsUpdate = true
    this.dirty = false
    this.last = now
  }

  dispose() {
    this.observer.disconnect()
    for (const type of ['input', 'change', 'scroll', 'focusin', 'focusout', 'load']) this.el.removeEventListener(type, this.markDirty, true)
    this.texture?.dispose()
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.mesh.removeFromParent()
  }
}

export class DomScreen {
  group = new THREE.Group()
  private regions = new Map<Element, Region>()
  private rootObserver: MutationObserver

  // `width` is the screen's width in meters; `skip` leaves out regions such as the WebGL canvas.
  constructor(
    private root: HTMLElement,
    private width: number,
    private skip: (el: Element) => boolean,
  ) {
    this.rootObserver = new MutationObserver(() => this.sync())
    this.rootObserver.observe(root, { childList: true })
    this.sync()
  }

  // Keep one region per top-level element: dialogs come and go.
  private sync() {
    const live = new Set<Element>()
    for (const el of Array.from(this.root.children)) {
      if (!(el instanceof HTMLElement) || this.skip(el)) continue
      live.add(el)
      if (!this.regions.has(el)) {
        const region = new Region(el)
        this.regions.set(el, region)
        this.group.add(region.mesh)
      }
    }
    for (const [el, region] of this.regions) {
      if (live.has(el)) continue
      region.dispose()
      this.regions.delete(el)
    }
  }

  // Called every frame while the screen is shown: lay out, then redraw the stalest dirty region.
  update(now: number) {
    const k = this.width / innerWidth
    let i = 0
    let next: Region | null = null
    for (const region of this.regions.values()) {
      region.layout(k, i++ * 0.002) // later regions (dialogs) sit just in front
      region.mesh.renderOrder = 40 + i
      // an empty region (nothing to draw yet) must not hold up the others
      if (!region.mesh.visible) continue
      if (region.dirty && now - region.last > REDRAW_MS && (!next || region.last < next.last)) next = region
    }
    next?.redraw(now)
  }

  redrawAll() {
    for (const region of this.regions.values()) region.dirty = true
  }

  // What the ray points at on the page; null where the screen is empty, so the ray goes on into the room.
  hit(ray: THREE.Raycaster): ScreenHit | null {
    if (!this.group.visible) return null
    const meshes = [...this.regions.values()].filter((r) => r.mesh.visible).map((r) => r.mesh)
    for (const h of ray.intersectObjects(meshes, false)) {
      const uv = h.uv!
      const region = [...this.regions.values()].find((r) => r.mesh === h.object)!
      const rect = region.el.getBoundingClientRect()
      const x = rect.left + uv.x * rect.width
      const y = rect.top + (1 - uv.y) * rect.height
      // the page may be covered (the headset's own layer, an emulator), so look through to this region;
      // pointer-events: none containers and gaps between panels let the ray go on into the room
      const target = document.elementsFromPoint(x, y).find((el) => region.el.contains(el))
      if (!target) continue
      return { point: h.point, distance: h.distance, target, x, y }
    }
    return null
  }

  press(hit: ScreenHit) {
    const init = { bubbles: true, cancelable: true, composed: true, clientX: hit.x, clientY: hit.y, view: window }
    hit.target.dispatchEvent(new PointerEvent('pointerdown', { ...init, pointerType: 'mouse', isPrimary: true }))
    hit.target.dispatchEvent(new MouseEvent('mousedown', init))
  }

  release(hit: ScreenHit, click: boolean) {
    const init = { bubbles: true, cancelable: true, composed: true, clientX: hit.x, clientY: hit.y, view: window }
    hit.target.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerType: 'mouse', isPrimary: true }))
    hit.target.dispatchEvent(new MouseEvent('mouseup', init))
    if (!click) return
    const field = hit.target.closest('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea')
    if (field instanceof HTMLElement) field.focus()
    else if (document.activeElement instanceof HTMLElement && !hit.target.closest('[data-keep-focus]')) document.activeElement.blur()
    ;(hit.target as HTMLElement).click?.()
    this.redrawAll()
  }

  // Thumbstick scrolling: the nearest scrollable box under the pointer.
  scroll(hit: ScreenHit, dy: number) {
    let el: Element | null = hit.target
    while (el && el !== this.root) {
      const s = getComputedStyle(el)
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) {
        el.scrollTop += dy
        return
      }
      el = el.parentElement
    }
  }

  dispose() {
    this.rootObserver.disconnect()
    for (const region of this.regions.values()) region.dispose()
    this.regions.clear()
  }
}

// ---------- drawing the page ----------

// A small renderer for the CSS this UI actually uses: boxes, rounded borders, opacity,
// clipping, wrapped text (laid out by the browser, drawn word by word), form fields, images.
function rasterize(ctx: CanvasRenderingContext2D, root: Element) {
  const range = document.createRange()
  const styles = new Map<Element, CSSStyleDeclaration>()
  const styleOf = (el: Element) => {
    let s = styles.get(el)
    if (!s) styles.set(el, (s = getComputedStyle(el)))
    return s
  }

  const visible = (c: string) => c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)'

  const setFont = (s: CSSStyleDeclaration) => {
    ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
    ctx.letterSpacing = s.letterSpacing === 'normal' ? '0px' : s.letterSpacing
    ctx.fillStyle = s.color
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
  }

  const transform = (text: string, s: CSSStyleDeclaration) =>
    s.textTransform === 'uppercase' ? text.toUpperCase() : s.textTransform === 'lowercase' ? text.toLowerCase() : text

  const drawText = (node: Text, alpha: number) => {
    const text = node.nodeValue ?? ''
    if (!text.trim() || !node.parentElement) return
    const s = styleOf(node.parentElement)
    setFont(s)
    ctx.globalAlpha = alpha
    // each word where the browser put it, so wrapping and alignment match the page
    for (const m of text.matchAll(/\S+/g)) {
      range.setStart(node, m.index!)
      range.setEnd(node, m.index! + m[0].length)
      const rects = range.getClientRects()
      if (!rects.length) continue
      const r = rects[0]
      if (rects.length === 1) ctx.fillText(transform(m[0], s), r.left, r.top + r.height / 2)
      else {
        // a word broken across lines: split it by measuring
        let rest = transform(m[0], s)
        for (const part of Array.from(rects)) {
          let n = rest.length
          while (n > 1 && ctx.measureText(rest.slice(0, n)).width > part.width + 1) n--
          ctx.fillText(rest.slice(0, n), part.left, part.top + part.height / 2)
          rest = rest.slice(n)
        }
      }
    }
  }

  // text inside an input or textarea, wrapped by measuring (fields have no text nodes to ask)
  const drawField = (el: HTMLInputElement | HTMLTextAreaElement, r: DOMRect, s: CSSStyleDeclaration, alpha: number) => {
    const empty = !el.value
    const text = empty ? el.placeholder : el.value
    const focused = document.activeElement === el
    setFont(s)
    if (empty) ctx.globalAlpha = alpha * 0.45
    const padL = parseFloat(s.paddingLeft)
    const padT = parseFloat(s.paddingTop)
    const lineH = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4
    const width = r.width - padL - parseFloat(s.paddingRight)
    const lines: string[] = []
    for (const para of text.split('\n')) {
      let line = ''
      for (const word of para.split(' ')) {
        const next = line ? `${line} ${word}` : word
        if (ctx.measureText(next).width > width && line) {
          lines.push(line)
          line = word
        } else line = next
      }
      lines.push(line)
    }
    if (el instanceof HTMLInputElement) lines.splice(1)
    // keep the end of a long text in view, like a field scrolled to the caret
    const fit = Math.max(1, Math.floor((r.height - padT * 2) / lineH))
    const shown = lines.slice(-fit)
    shown.forEach((line, i) => ctx.fillText(line, r.left + padL, r.top + padT + lineH * (i + 0.5)))
    if (focused) {
      ctx.globalAlpha = alpha
      const last = empty ? '' : shown[shown.length - 1]
      const x = r.left + padL + ctx.measureText(last).width + 1
      const y = r.top + padT + lineH * (empty ? 0 : shown.length - 1)
      ctx.fillStyle = s.caretColor !== 'auto' ? s.caretColor : s.color
      ctx.fillRect(x, y + lineH * 0.15, 1.5, lineH * 0.7)
    }
  }

  const draw = (node: Node, alpha: number) => {
    if (node.nodeType === Node.TEXT_NODE) return drawText(node as Text, alpha)
    if (!(node instanceof HTMLElement)) return // svg icons and comments are left out
    const s = styleOf(node)
    if (s.display === 'none' || s.visibility === 'hidden') return
    const a = alpha * parseFloat(s.opacity)
    if (a < 0.01) return
    const r = node.getBoundingClientRect()
    const radius = Math.min(parseFloat(s.borderTopLeftRadius) || 0, r.width / 2, r.height / 2)

    ctx.globalAlpha = a
    if (visible(s.backgroundColor) && r.width && r.height) {
      ctx.fillStyle = s.backgroundColor
      ctx.beginPath()
      ctx.roundRect(r.left, r.top, r.width, r.height, radius)
      ctx.fill()
    }
    drawBorders(ctx, s, r, radius)

    if (node instanceof HTMLImageElement && node.complete && node.naturalWidth) {
      ctx.drawImage(node, r.left, r.top, r.width, r.height)
    }
    if (node instanceof HTMLInputElement && (node.type === 'checkbox' || node.type === 'radio')) {
      const accent = s.accentColor === 'auto' ? s.color : s.accentColor
      ctx.beginPath()
      ctx.roundRect(r.left + 0.5, r.top + 0.5, r.width - 1, r.height - 1, node.type === 'radio' ? r.width / 2 : 2)
      ctx.fillStyle = node.checked ? accent : 'rgba(255,255,255,0.08)'
      ctx.fill()
      ctx.strokeStyle = node.checked ? accent : s.color
      ctx.lineWidth = 1
      ctx.stroke()
      if (node.checked) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(r.left + r.width * 0.22, r.top + r.height * 0.52)
        ctx.lineTo(r.left + r.width * 0.42, r.top + r.height * 0.72)
        ctx.lineTo(r.left + r.width * 0.78, r.top + r.height * 0.3)
        ctx.stroke()
      }
      return
    }
    if (node instanceof HTMLTextAreaElement || (node instanceof HTMLInputElement && node.type !== 'file' && node.type !== 'hidden')) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(r.left, r.top, r.width, r.height)
      ctx.clip()
      drawField(node, r, s, a)
      ctx.restore()
      return
    }

    const clip = s.overflowX !== 'visible' || s.overflowY !== 'visible'
    if (clip) {
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(r.left, r.top, r.width, r.height, radius)
      ctx.clip()
    }
    for (const child of Array.from(node.childNodes)) draw(child, a)
    if (clip) ctx.restore()
  }

  draw(root, 1)
  ctx.globalAlpha = 1
}

function drawBorders(ctx: CanvasRenderingContext2D, s: CSSStyleDeclaration, r: DOMRect, radius: number) {
  const sides = [
    [s.borderTopWidth, s.borderTopStyle, s.borderTopColor],
    [s.borderRightWidth, s.borderRightStyle, s.borderRightColor],
    [s.borderBottomWidth, s.borderBottomStyle, s.borderBottomColor],
    [s.borderLeftWidth, s.borderLeftStyle, s.borderLeftColor],
  ] as const
  const shows = sides.map(([w, style, color]) => parseFloat(w) > 0 && style !== 'none' && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)')
  if (!shows.some(Boolean)) return
  const same = sides.every(([w, , c]) => w === sides[0][0] && c === sides[0][2]) && shows.every(Boolean)
  if (same) {
    const w = parseFloat(sides[0][0])
    ctx.strokeStyle = sides[0][2]
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.roundRect(r.left + w / 2, r.top + w / 2, r.width - w, r.height - w, Math.max(0, radius - w / 2))
    ctx.stroke()
    return
  }
  // separate sides (e.g. the red accent line on the active year) as filled strips
  const [t, rt, b, l] = sides.map(([w]) => parseFloat(w))
  if (shows[0]) ((ctx.fillStyle = sides[0][2]), ctx.fillRect(r.left, r.top, r.width, t))
  if (shows[1]) ((ctx.fillStyle = sides[1][2]), ctx.fillRect(r.right - rt, r.top, rt, r.height))
  if (shows[2]) ((ctx.fillStyle = sides[2][2]), ctx.fillRect(r.left, r.bottom - b, r.width, b))
  if (shows[3]) ((ctx.fillStyle = sides[3][2]), ctx.fillRect(r.left, r.top, l, r.height))
}
