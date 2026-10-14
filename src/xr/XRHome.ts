import * as THREE from 'three'
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js'
import { FLOOR_Y, type Viewpoint } from '../config/scene'
import { DomScreen, type ScreenHit } from './DomScreen'

// The home in a headset, in two scales:
// - dollhouse: the apartment at 1:20 on a table in the real room (passthrough on Quest)
// - walk: life size, you stand inside it at its own floor
// Everything of the home lives in `world`. The headset moves the camera inside `dolly`, so walking,
// teleporting and turning move the dolly; the dollhouse is placed by moving `world`.
// The page's own UI floats on a screen in front of you (see DomScreen).
//
// Controllers: trigger = click a panel / pick an object / teleport (aim at the floor and release)
//   grip = pick up the dollhouse · left stick = walk · right stick = snap turn (scroll over a panel)
//   A/X = show or hide the screen · B/Y = step into the home where you point, or back out to the dollhouse
// Hands: pinch works as the trigger; the Views list on the screen switches scale.

export const DOLLHOUSE_SCALE = 0.05 // 1:20, the ~13 m apartment becomes ~65 cm
const TABLE_HEIGHT = 0.85 // meters above the real floor
const TABLE_DISTANCE = 0.75
const SCREEN_WIDTH = 1.3 // meters
const SCREEN_DISTANCE = 1.15
const WALK_SPEED = 1.4 // m/s
const SNAP_TURN = Math.PI / 6
const BOUNDS = 6.6 // keep in step with DeriveScene

export type XRMode = 'immersive-ar' | 'immersive-vr'
export type XRScale = 'dollhouse' | 'walk'

export interface XRCallbacks {
  pick: (ray: THREE.Raycaster) => string | null // id of the object the ray hits, if any
  apartment: () => THREE.Object3D | null
  onSelect: (id: string | null) => void
  onChange: (active: boolean) => void
  onScale: (scale: XRScale) => void
}

export async function supportedXRMode(): Promise<XRMode | null> {
  const xr = navigator.xr
  if (!xr) return null
  if (await xr.isSessionSupported('immersive-ar').catch(() => false)) return 'immersive-ar'
  if (await xr.isSessionSupported('immersive-vr').catch(() => false)) return 'immersive-vr'
  return null
}

interface Hand {
  controller: THREE.XRTargetRaySpace
  line: THREE.Line
  cursor: THREE.Mesh
  source: XRInputSource | null
  ui: ScreenHit | null // panel under the ray this frame
  pressed: ScreenHit | null // panel pressed with the trigger
  aiming: boolean // trigger held over the floor: teleport on release
  buttons: boolean[]
}

export class XRHome {
  active = false
  scale: XRScale = 'dollhouse'
  private session: XRSession | null = null
  private mode: XRMode = 'immersive-ar'
  private dolly = new THREE.Group()
  private hands: Hand[] = []
  private grabbedBy: THREE.Group | null = null
  private ray = new THREE.Raycaster()
  private screen: DomScreen
  private reticle: THREE.Mesh
  private target: THREE.Vector3 | null = null // where a teleport would land, in home coordinates
  private stickReady = true
  private placeScreen = 0 // frames to wait before placing the screen: the camera takes the head pose while rendering
  private table = { position: new THREE.Vector3(), yaw: 0 } // where the dollhouse stands
  private saved: { background: THREE.Color | THREE.Texture | null; clearAlpha: number } | null = null

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private world: THREE.Group,
    private camera: THREE.PerspectiveCamera,
    uiRoot: HTMLElement,
    private cb: XRCallbacks,
  ) {
    renderer.xr.enabled = true
    renderer.xr.setReferenceSpaceType('local-floor')
    scene.add(this.dolly)

    const models = new XRControllerModelFactory()
    for (let i = 0; i < 2; i++) {
      // target ray space: also works for hands, where a pinch is a select
      const controller = renderer.xr.getController(i)
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
      )
      const cursor = new THREE.Mesh(
        new THREE.SphereGeometry(0.006, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xe11d1d, depthTest: false }),
      )
      cursor.renderOrder = 60
      cursor.visible = false
      controller.add(line)
      this.dolly.add(controller, cursor)
      const hand: Hand = { controller, line, cursor, source: null, ui: null, pressed: null, aiming: false, buttons: [] }
      this.hands.push(hand)
      controller.addEventListener('connected', (e) => (hand.source = e.data))
      controller.addEventListener('disconnected', () => (hand.source = null))
      controller.addEventListener('selectstart', () => this.onSelectStart(hand))
      controller.addEventListener('selectend', () => this.onSelectEnd(hand))
      controller.addEventListener('squeezestart', () => this.grab(controller))
      controller.addEventListener('squeezeend', () => this.release(controller))
      const grip = renderer.xr.getControllerGrip(i)
      grip.add(models.createControllerModel(grip))
      this.dolly.add(grip)
    }

    this.screen = new DomScreen(uiRoot, SCREEN_WIDTH, (el) => el.classList.contains('viewport'))
    this.screen.group.visible = false
    this.dolly.add(this.screen.group)

    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.2, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false }),
    )
    this.reticle.renderOrder = 50
    this.reticle.visible = false
    world.add(this.reticle)
  }

  async enter(mode: XRMode) {
    if (this.session || !navigator.xr) return
    const session = await navigator.xr.requestSession(mode, {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['hand-tracking'],
    })
    this.session = session
    this.mode = mode
    session.addEventListener('end', this.onEnd)

    this.saved = { background: this.scene.background, clearAlpha: this.renderer.getClearAlpha() }
    this.table.position.set(0, TABLE_HEIGHT - FLOOR_Y * DOLLHOUSE_SCALE, -TABLE_DISTANCE)
    this.table.yaw = 0
    this.dolly.add(this.camera)
    this.setScale('dollhouse')

    await this.renderer.xr.setSession(session)
    this.active = true
    this.cb.onChange(true)
    this.placeScreen = 2
  }

  exit() {
    this.session?.end()
  }

  // The Views list: the outside views go back to the dollhouse, the rooms are walked into.
  goToView(v: Viewpoint) {
    if (v.mode === 'orbit') return this.setScale('dollhouse')
    const facing = Math.atan2(-(v.target[0] - v.position[0]), -(v.target[2] - v.position[2]))
    this.walkTo(new THREE.Vector3(v.position[0], FLOOR_Y, v.position[2]), facing)
  }

  // Called every frame while presenting.
  update(dt: number, now: number) {
    this.dolly.updateMatrixWorld(true)
    if (this.placeScreen && --this.placeScreen === 0) this.showScreen()
    if (this.screen.group.visible) this.screen.update(now)
    let teleportHand: Hand | null = null
    for (const hand of this.hands) {
      this.point(hand)
      if (hand.aiming) teleportHand = hand
    }
    this.target = teleportHand ? this.floorUnder(teleportHand) : null
    this.reticle.visible = !!this.target
    if (this.target) this.reticle.position.copy(this.target)
    this.readPads(dt)
  }

  // ---------- scale ----------

  private setScale(scale: XRScale) {
    this.scale = scale
    this.release(this.grabbedBy)
    if (scale === 'dollhouse') {
      this.world.scale.setScalar(DOLLHOUSE_SCALE)
      this.world.position.copy(this.table.position)
      this.world.rotation.set(0, this.table.yaw, 0)
      this.dolly.position.set(0, 0, 0)
      this.dolly.rotation.set(0, 0, 0)
      this.scene.background = this.mode === 'immersive-ar' ? null : this.saved?.background ?? null
      if (this.mode === 'immersive-ar') this.renderer.setClearAlpha(0)
    } else {
      this.world.scale.setScalar(1)
      this.world.position.set(0, 0, 0)
      this.world.rotation.set(0, 0, 0)
      // inside, the scan replaces the room: passthrough would show through every gap in it
      this.scene.background = new THREE.Color(0x050505)
      this.renderer.setClearAlpha(1)
    }
    this.cb.onScale(scale)
    if (this.screen.group.visible) this.showScreen()
  }

  // Stand at `p` (home coordinates, on the floor), looking along `facing` (yaw), whatever the scale was.
  private walkTo(p: THREE.Vector3, facing?: number) {
    if (this.scale !== 'walk') this.setScale('walk')
    const head = this.camera.position // in the dolly
    if (facing !== undefined) {
      // turn the dolly so that the way the head looks now becomes `facing`
      const look = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
      this.dolly.rotation.y = facing - Math.atan2(-look.x, -look.z)
    }
    const offset = new THREE.Vector3(head.x, 0, head.z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.dolly.rotation.y)
    this.dolly.position.set(
      THREE.MathUtils.clamp(p.x, -BOUNDS, BOUNDS) - offset.x,
      FLOOR_Y,
      THREE.MathUtils.clamp(p.z, -BOUNDS, BOUNDS) - offset.z,
    )
    if (this.screen.group.visible) this.showScreen()
  }

  // B/Y: from the dollhouse, step in where a ray points at it (or into the living room); from inside, step out.
  private toggleScale(hand: Hand) {
    if (this.scale === 'walk') return this.setScale('dollhouse')
    const hit = this.apartmentHit(hand)
    const head = this.camera.getWorldPosition(new THREE.Vector3())
    if (hit) {
      // face the way you were looking at the dollhouse
      const look = new THREE.Vector3(hit.x, 0, hit.z).sub(this.world.worldToLocal(head.clone()).setY(0))
      this.walkTo(new THREE.Vector3(hit.x, FLOOR_Y, hit.z), Math.atan2(-look.x, -look.z))
    } else {
      this.walkTo(new THREE.Vector3(1.5, FLOOR_Y, -0.7), Math.atan2(3.1, -2)) // the Living Room view
    }
  }

  // ---------- screen ----------

  // Put the screen in front of the eyes, upright, slightly below eye level.
  private showScreen() {
    this.screen.group.visible = true
    const head = this.camera.position
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
    const yaw = Math.atan2(-look.x, -look.z)
    this.screen.group.position.set(
      head.x - Math.sin(yaw) * SCREEN_DISTANCE,
      Math.max(0.9, head.y - 0.12),
      head.z - Math.cos(yaw) * SCREEN_DISTANCE,
    )
    this.screen.group.rotation.set(-0.12, yaw, 0, 'YXZ')
    this.screen.redrawAll()
  }

  private toggleScreen() {
    if (this.screen.group.visible) this.screen.group.visible = false
    else this.showScreen()
  }

  // ---------- pointing ----------

  private aim(hand: Hand) {
    this.ray.setFromXRController(hand.controller)
    return this.ray
  }

  // Ray and cursor: stop at a panel if one is under the ray.
  private point(hand: Hand) {
    const visible = !!hand.source
    hand.line.visible = visible
    hand.ui = visible ? this.screen.hit(this.aim(hand)) : null
    hand.cursor.visible = !!hand.ui
    if (hand.ui) hand.cursor.position.copy(this.dolly.worldToLocal(hand.ui.point.clone()))
    hand.line.scale.z = hand.ui ? hand.ui.distance : this.scale === 'walk' ? 5 : 2
  }

  private apartmentHit(hand: Hand) {
    const apartment = this.cb.apartment()
    if (!apartment) return null
    const hit = this.aim(hand).intersectObject(apartment, true)[0]
    return hit ? this.world.worldToLocal(hit.point.clone()) : null
  }

  // Where the ray meets the floor, in home coordinates.
  private floorUnder(hand: Hand) {
    const p = this.apartmentHit(hand)
    return p && p.y < FLOOR_Y + 0.25 ? p.setY(FLOOR_Y + 0.01) : null
  }

  private onSelectStart(hand: Hand) {
    if (hand.ui) {
      hand.pressed = hand.ui
      this.screen.press(hand.ui)
      return
    }
    if (this.grabbedBy) return
    const id = this.cb.pick(this.aim(hand))
    if (id) return this.cb.onSelect(id)
    hand.aiming = true
  }

  private onSelectEnd(hand: Hand) {
    if (hand.pressed) {
      const now = hand.ui
      this.screen.release(now ?? hand.pressed, !!now && now.target === hand.pressed.target)
      hand.pressed = null
      return
    }
    if (!hand.aiming) return
    hand.aiming = false
    const target = this.floorUnder(hand)
    if (!target) return this.cb.onSelect(null) // pointing at nothing clears the selection
    // in the dollhouse, a release on its floor steps in there
    const head = this.camera.getWorldPosition(new THREE.Vector3())
    const look = this.scale === 'walk' ? undefined : (() => {
      const d = target.clone().sub(this.world.worldToLocal(head.clone()))
      return Math.atan2(-d.x, -d.z)
    })()
    this.walkTo(target, look)
  }

  // Squeeze picks the dollhouse up; it follows the hand until released.
  private grab(c: THREE.Group) {
    if (this.grabbedBy || this.scale !== 'dollhouse') return
    this.grabbedBy = c
    c.attach(this.world)
  }

  private release(c: THREE.Group | null) {
    if (!c || this.grabbedBy !== c) return
    this.grabbedBy = null
    this.scene.attach(this.world)
    // keep it standing upright: only the turn around the vertical axis survives
    const yaw = new THREE.Euler().setFromQuaternion(this.world.quaternion, 'YXZ').y
    this.world.rotation.set(0, yaw, 0)
    this.table.position.copy(this.world.position)
    this.table.yaw = yaw
  }

  // ---------- sticks and buttons ----------

  private readPads(dt: number) {
    let turn = 0
    for (const hand of this.hands) {
      const pad = hand.source?.gamepad
      if (!pad) continue
      const pressed = pad.buttons.map((b) => b.pressed)
      const down = (i: number) => pressed[i] && !hand.buttons[i]
      if (down(4)) this.toggleScreen()
      if (down(5)) this.toggleScale(hand)
      hand.buttons = pressed

      const x = pad.axes[2] ?? 0
      const y = pad.axes[3] ?? 0
      if (hand.ui) {
        // over a panel the stick scrolls it
        if (Math.abs(y) > 0.15) this.screen.scroll(hand.ui, y * 900 * dt)
        continue
      }
      if (this.scale !== 'walk') continue
      if (hand.source?.handedness === 'left') this.move(x, y, dt)
      else if (Math.abs(x) > Math.abs(turn)) turn = x
    }
    if (Math.abs(turn) < 0.3) this.stickReady = true
    else if (this.stickReady && Math.abs(turn) > 0.7) {
      this.stickReady = false
      this.turn(turn > 0 ? -SNAP_TURN : SNAP_TURN)
    }
  }

  // Smooth walking in the direction the head faces.
  private move(x: number, y: number, dt: number) {
    if (Math.hypot(x, y) < 0.15) return
    const look = this.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize()
    const right = new THREE.Vector3(-look.z, 0, look.x)
    const step = look.multiplyScalar(-y).add(right.multiplyScalar(x)).multiplyScalar(WALK_SPEED * dt)
    const head = this.camera.getWorldPosition(new THREE.Vector3())
    const nx = THREE.MathUtils.clamp(head.x + step.x, -BOUNDS, BOUNDS)
    const nz = THREE.MathUtils.clamp(head.z + step.z, -BOUNDS, BOUNDS)
    this.dolly.position.x += nx - head.x
    this.dolly.position.z += nz - head.z
  }

  // Snap turn around the head, so the view turns without sliding.
  private turn(angle: number) {
    const head = this.camera.getWorldPosition(new THREE.Vector3())
    const p = this.dolly.position.clone().sub(head).applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle).add(head)
    this.dolly.position.set(p.x, this.dolly.position.y, p.z)
    this.dolly.rotation.y += angle
  }

  private onEnd = () => {
    this.session?.removeEventListener('end', this.onEnd)
    this.session = null
    this.active = false
    this.release(this.grabbedBy)
    for (const hand of this.hands) Object.assign(hand, { ui: null, pressed: null, aiming: false })
    this.screen.group.visible = false
    this.reticle.visible = false
    this.camera.removeFromParent()
    this.dolly.position.set(0, 0, 0)
    this.dolly.rotation.set(0, 0, 0)
    this.world.position.set(0, 0, 0)
    this.world.rotation.set(0, 0, 0)
    this.world.scale.setScalar(1)
    if (this.saved) {
      this.scene.background = this.saved.background
      this.renderer.setClearAlpha(this.saved.clearAlpha)
    }
    this.scale = 'dollhouse'
    this.cb.onChange(false)
  }

  dispose() {
    this.exit()
    this.screen.dispose()
  }
}
