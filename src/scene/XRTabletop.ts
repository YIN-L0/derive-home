import * as THREE from 'three'
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js'
import { FLOOR_Y } from '../config/scene'

// Mixed reality on Quest: the whole home becomes a dollhouse standing on a table in the room
// (passthrough, `immersive-ar`). Headsets without passthrough get the same dollhouse in VR.
// Everything that belongs to the home lives in `world`; the headset moves the camera, so
// placing the dollhouse means moving `world`, never the camera.

export const DOLLHOUSE_SCALE = 0.05 // 1:20, the ~13 m apartment becomes ~65 cm
const TABLE_HEIGHT = 0.85 // meters above the real floor
const TABLE_DISTANCE = 0.75 // in front of where the user stands when the session starts

export type XRMode = 'immersive-ar' | 'immersive-vr'

export interface XRCard {
  kicker: string
  title: string
  body: string
}

export interface XRCallbacks {
  pick: (ray: THREE.Raycaster) => string | null // id of the object the ray hits, if any
  onSelect: (id: string | null) => void
  onYearStep: (step: 1 | -1) => void
  onChange: (active: boolean) => void
}

export async function supportedXRMode(): Promise<XRMode | null> {
  const xr = navigator.xr
  if (!xr) return null
  if (await xr.isSessionSupported('immersive-ar').catch(() => false)) return 'immersive-ar'
  if (await xr.isSessionSupported('immersive-vr').catch(() => false)) return 'immersive-vr'
  return null
}

export class XRTabletop {
  active = false
  private session: XRSession | null = null
  private controllers: THREE.Group[] = []
  private grabbedBy: THREE.Group | null = null
  private ray = new THREE.Raycaster()
  private card: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private cardAnchor: THREE.Object3D | null = null
  private stickReady = true // thumbstick has returned to centre since the last year step
  private saved: { background: THREE.Color | THREE.Texture | null; clearAlpha: number } | null = null

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private world: THREE.Group,
    private cb: XRCallbacks,
  ) {
    renderer.xr.enabled = true
    renderer.xr.setReferenceSpaceType('local-floor')

    const models = new XRControllerModelFactory()
    for (let i = 0; i < 2; i++) {
      // target ray space: also works for hands, where a pinch is a select
      const c = renderer.xr.getController(i)
      c.add(rayLine())
      c.addEventListener('select', () => this.onSelect(c))
      c.addEventListener('squeezestart', () => this.grab(c))
      c.addEventListener('squeezeend', () => this.release(c))
      c.addEventListener('connected', (e) => (c.userData.source = e.data))
      c.addEventListener('disconnected', () => (c.userData.source = null))
      scene.add(c)
      this.controllers.push(c)
      const grip = renderer.xr.getControllerGrip(i)
      grip.add(models.createControllerModel(grip))
      scene.add(grip)
    }

    this.card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.26),
      new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, side: THREE.DoubleSide }),
    )
    this.card.renderOrder = 30
    this.card.visible = false
    scene.add(this.card)
  }

  async enter(mode: XRMode) {
    if (this.session || !navigator.xr) return
    const session = await navigator.xr.requestSession(mode, {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking'],
    })
    this.session = session
    session.addEventListener('end', this.onEnd)

    // passthrough shows wherever nothing is drawn
    this.saved = { background: this.scene.background, clearAlpha: this.renderer.getClearAlpha() }
    if (mode === 'immersive-ar') {
      this.scene.background = null
      this.renderer.setClearAlpha(0)
    }

    this.world.scale.setScalar(DOLLHOUSE_SCALE)
    this.world.rotation.set(0, 0, 0)
    // the scan's floor sits at FLOOR_Y; lift it to table height
    this.world.position.set(0, TABLE_HEIGHT - FLOOR_Y * DOLLHOUSE_SCALE, -TABLE_DISTANCE)

    await this.renderer.xr.setSession(session)
    this.active = true
    this.cb.onChange(true)
  }

  exit() {
    this.session?.end()
  }

  // A floating card above the selected object, turned towards the viewer.
  setCard(anchor: THREE.Object3D | null, card: XRCard | null) {
    this.cardAnchor = card ? anchor : null
    this.card.visible = !!(card && anchor)
    if (!card) return
    this.card.material.map?.dispose()
    this.card.material.map = cardTexture(card)
    this.card.material.needsUpdate = true
  }

  // Called every frame while presenting.
  update(camera: THREE.Camera) {
    if (this.cardAnchor) {
      const p = this.cardAnchor.getWorldPosition(new THREE.Vector3())
      p.y += 0.17
      this.card.position.copy(p)
      const eye = camera.getWorldPosition(new THREE.Vector3())
      eye.y = p.y // stay upright
      this.card.lookAt(eye)
    }
    this.readSticks()
  }

  // ---------- input ----------

  private aim(c: THREE.Group) {
    const m = new THREE.Matrix4().extractRotation(c.matrixWorld)
    this.ray.ray.origin.setFromMatrixPosition(c.matrixWorld)
    this.ray.ray.direction.set(0, 0, -1).applyMatrix4(m)
    return this.ray
  }

  private onSelect(c: THREE.Group) {
    if (this.grabbedBy) return
    this.cb.onSelect(this.cb.pick(this.aim(c)))
  }

  // Squeeze picks the dollhouse up; it follows the hand until released.
  private grab(c: THREE.Group) {
    if (this.grabbedBy) return
    this.grabbedBy = c
    c.attach(this.world)
  }

  private release(c: THREE.Group) {
    if (this.grabbedBy !== c) return
    this.grabbedBy = null
    this.scene.attach(this.world)
    // keep it standing upright: only the turn around the vertical axis survives
    const yaw = new THREE.Euler().setFromQuaternion(this.world.quaternion, 'YXZ').y
    this.world.rotation.set(0, yaw, 0)
  }

  // A thumbstick flick left or right steps through the years of the home.
  private readSticks() {
    let x = 0
    for (const c of this.controllers) {
      const pad = (c.userData.source as XRInputSource | null)?.gamepad
      if (pad && Math.abs(pad.axes[2] ?? 0) > Math.abs(x)) x = pad.axes[2]
    }
    if (Math.abs(x) < 0.3) this.stickReady = true
    else if (this.stickReady && Math.abs(x) > 0.7) {
      this.stickReady = false
      this.cb.onYearStep(x > 0 ? 1 : -1)
    }
  }

  private onEnd = () => {
    this.session?.removeEventListener('end', this.onEnd)
    this.session = null
    this.active = false
    if (this.grabbedBy) this.scene.attach(this.world)
    this.grabbedBy = null
    this.world.position.set(0, 0, 0)
    this.world.rotation.set(0, 0, 0)
    this.world.scale.setScalar(1)
    if (this.saved) {
      this.scene.background = this.saved.background
      this.renderer.setClearAlpha(this.saved.clearAlpha)
    }
    this.setCard(null, null)
    this.cb.onChange(false)
  }
}

function rayLine() {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }))
  line.scale.z = 2
  return line
}

// Same look as the desktop card: dark panel, red kicker, serif title.
function cardTexture(card: XRCard) {
  const W = 1024
  const pad = 64
  const c = document.createElement('canvas')
  c.width = c.height = W
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgba(10, 10, 10, 0.88)'
  ctx.fillRect(0, 0, W, W)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, W - 3, W - 3)

  ctx.fillStyle = '#e11d1d'
  ctx.font = '600 30px Helvetica, Arial, sans-serif'
  ctx.fillText(card.kicker.toUpperCase(), pad, pad + 30)

  ctx.fillStyle = '#ffffff'
  ctx.font = '400 72px Georgia, "Times New Roman", serif'
  let y = pad + 30 + 40
  for (const line of wrap(ctx, card.title, W - pad * 2).slice(0, 2)) ctx.fillText(line, pad, (y += 80))

  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
  ctx.font = '400 36px Helvetica, Arial, sans-serif'
  y += 30
  const lines = wrap(ctx, card.body, W - pad * 2)
  const room = Math.floor((W - pad - y) / 50)
  lines.slice(0, room).forEach((line, i) => {
    const last = i === room - 1 && lines.length > room
    ctx.fillText(last ? line.replace(/\s*\S*$/, ' …') : line, pad, (y += 50))
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > width && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}
