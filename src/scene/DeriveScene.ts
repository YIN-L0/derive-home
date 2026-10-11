import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  EYE_HEIGHT,
  FLOOR_Y,
  YEARS,
  apartmentTransform,
  cameraConfig,
  objectModels,
  objectPositions,
  personRoutes,
  type ObjectId,
  type Vec3,
  type Viewpoint,
  type Year,
} from '../config/scene'
import { createPrimitive } from './primitives'

const MOVE_SECONDS = 0.8
const ACCENT = '#e2572b'
const ROUTE_COLOR = 0x1f6feb
const FLY_SECONDS = 1.1
const WALK_SPEED = 2.2 // m/s
const TURN_SPEED = 1.6 // rad/s
const BOUNDS = 6.6 // walking is kept inside ±BOUNDS on x and z

interface Flight {
  fromPos: THREE.Vector3
  toPos: THREE.Vector3
  fromQuat: THREE.Quaternion
  toQuat: THREE.Quaternion
  t: number
  seconds: number
  onDone?: () => void
}

// A thin tube through the given points, with a dot on each one.
function pathGroup(points: THREE.Vector3[], color: number, radius: number, smooth: boolean) {
  const g = new THREE.Group()
  // drawn on top of the scan so the whole path stays readable through walls
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false })
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', smooth ? 0.25 : 0)
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 24, radius, 8), material))
  for (const p of [points[0], points[points.length - 1]]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(radius * 3.5, 16, 12), material)
    dot.position.copy(p)
    g.add(dot)
  }
  g.traverse((o) => (o.renderOrder = 5))
  return g
}

function disposeGroup(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.geometry.dispose()
  })
  g.removeFromParent()
}

interface Item {
  id: ObjectId
  group: THREE.Group
  marker: THREE.Sprite
  from: THREE.Vector3
  to: THREE.Vector3
  t: number // 0..1 progress of the current move; 1 = at rest
  height: number
}

export interface SceneCallbacks {
  onSelect: (id: ObjectId | null) => void
  onLoaded: () => void
  onModelLoaded?: (id: ObjectId) => void
  onError: (message: string) => void
  onDebugPoint?: (p: Vec3) => void
  onModeChange?: (mode: 'orbit' | 'walk') => void
}

function markerTexture(color: string, filled: boolean) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  ctx.beginPath()
  ctx.arc(64, 64, 44, 0, Math.PI * 2)
  ctx.fillStyle = filled ? color : 'rgba(255,255,255,0.92)'
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(64, 64, 13, 0, Math.PI * 2)
  ctx.fillStyle = filled ? '#ffffff' : color
  ctx.fill()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class DeriveScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private raycaster = new THREE.Raycaster()
  private lastTime = performance.now()
  private items = new Map<ObjectId, Item>()
  private apartment: THREE.Object3D | null = null
  private markerIdle = markerTexture('#1b1b1d', false)
  private markerActive = markerTexture(ACCENT, true)
  private selected: ObjectId | null = null
  private route: THREE.Group | null = null
  private mode: 'orbit' | 'walk' = 'orbit'
  private flight: Flight | null = null
  private yaw = 0
  private pitch = 0
  private keys = new Set<string>()
  private dragging = false
  private sightRay = new THREE.Raycaster()
  private frameCount = 0
  private objectPath: THREE.Group | null = null
  private frame = 0
  private down = { x: 0, y: 0 }
  private debug: boolean
  private resizeObserver: ResizeObserver

  constructor(
    private container: HTMLElement,
    private cb: SceneCallbacks,
    year: Year,
  ) {
    const params = new URLSearchParams(location.search)
    this.debug = params.has('debug')

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0xeeece8)
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(cameraConfig.fov, 1, 0.05, 200)
    this.camera.position.set(...cameraConfig.position)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(...cameraConfig.target)
    this.controls.enableDamping = true
    this.controls.minDistance = cameraConfig.minDistance
    this.controls.maxDistance = cameraConfig.maxDistance
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02

    if (params.get('view') === 'top') {
      this.camera.position.set(0, 24, 0.001)
      this.controls.target.set(0, 0, 0)
    }
    const cam = params.get('cam')?.split(',').map(Number)
    if (cam?.length === 6 && cam.every(Number.isFinite)) {
      this.camera.position.set(cam[0], cam[1], cam[2])
      this.controls.target.set(cam[3], cam[4], cam[5])
    }
    this.controls.update()

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a8, 2.2))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(4, 10, 6)
    this.scene.add(sun)

    if (params.has('grid')) this.addDebugGrid()
    if (this.debug) (window as unknown as { __derive: DeriveScene }).__derive = this

    this.loadApartment()
    this.buildItems(year)
    this.loadModels()

    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.tick()
  }

  // ---------- public API ----------

  setYear(year: Year) {
    for (const item of this.items.values()) {
      const target = new THREE.Vector3(...objectPositions[item.id][year])
      if (target.distanceTo(item.to) < 1e-4) continue
      item.from.copy(item.group.position)
      item.to.copy(target)
      item.t = 0
    }
  }

  setSelected(id: ObjectId | null) {
    this.selected = id
    for (const item of this.items.values()) {
      const active = item.id === id
      item.marker.material.map = active ? this.markerActive : this.markerIdle
      item.marker.renderOrder = active ? 11 : 10
    }
  }

  setVisible(ids: ObjectId[]) {
    for (const item of this.items.values()) item.group.visible = ids.includes(item.id)
  }

  // Floor line showing how the resident of that year walks through the home.
  setRoute(year: Year | null) {
    if (this.route) disposeGroup(this.route)
    this.route = null
    if (year === null) return
    const pts = personRoutes[year].points.map(([x, , z]) => new THREE.Vector3(x, FLOOR_Y + 0.05, z))
    if (pts.length < 2) return
    this.route = pathGroup(pts, ROUTE_COLOR, 0.022, true)
    this.scene.add(this.route)
  }

  // Line joining every place an object has been, oldest to newest.
  setObjectPath(id: ObjectId | null) {
    if (this.objectPath) disposeGroup(this.objectPath)
    this.objectPath = null
    if (!id) return
    const stops: THREE.Vector3[] = []
    for (const y of YEARS) {
      const p = new THREE.Vector3(...objectPositions[id][y])
      if (!stops.length || stops[stops.length - 1].distanceTo(p) > 1e-3) stops.push(p)
    }
    if (stops.length < 2) return
    // arc each leg upward so the line clears walls and furniture
    const pts: THREE.Vector3[] = [stops[0]]
    for (let i = 1; i < stops.length; i++) {
      const mid = stops[i - 1].clone().lerp(stops[i], 0.5)
      mid.y = Math.max(stops[i - 1].y, stops[i].y) + 0.9
      pts.push(mid, stops[i])
    }
    this.objectPath = pathGroup(pts, new THREE.Color(ACCENT).getHex(), 0.016, true)
    for (const p of stops) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 12),
        new THREE.MeshBasicMaterial({ color: ACCENT, depthTest: false }),
      )
      dot.renderOrder = 5
      dot.position.copy(p)
      this.objectPath.add(dot)
    }
    this.scene.add(this.objectPath)
  }

  // Pixel position of an object's marker; exposed as window.__derive in ?debug mode for scripted checks.
  screenPosition(id: ObjectId) {
    const item = this.items.get(id)!
    const p = item.marker.getWorldPosition(new THREE.Vector3()).project(this.camera)
    const r = this.renderer.domElement.getBoundingClientRect()
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height }
  }

  // Fly the camera to a configured angle. Walk views put you inside at eye height.
  goToView(v: Viewpoint) {
    const toPos = new THREE.Vector3(...v.position)
    const target = new THREE.Vector3(...v.target)
    this.controls.enabled = false
    this.flyTo(toPos, target, FLY_SECONDS, () => {
      if (v.mode === 'orbit') {
        this.controls.target.copy(target)
        this.controls.enabled = true
        this.controls.update()
      } else {
        this.syncWalkAngles()
      }
    })
    this.setMode(v.mode)
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // ---------- setup ----------

  private loadApartment() {
    new GLTFLoader().load(
      apartmentTransform.url,
      (gltf) => {
        const root = gltf.scene
        root.position.set(...apartmentTransform.position)
        root.rotation.set(...apartmentTransform.rotation)
        root.scale.setScalar(apartmentTransform.scale)
        // The scan has baked lighting in its textures and no normals, so draw it unlit.
        // Single-sided walls let the camera look into the rooms from outside.
        root.traverse((o) => {
          const m = o as THREE.Mesh
          if (!m.isMesh) return
          const src = m.material as THREE.MeshStandardMaterial
          m.material = new THREE.MeshBasicMaterial({ map: src.map, color: src.map ? 0xffffff : 0xcccccc })
        })
        this.scene.add(root)
        this.apartment = root
        this.cb.onLoaded()
      },
      undefined,
      (err) => {
        console.error(err)
        this.cb.onError(`Could not load ${apartmentTransform.url}`)
      },
    )
  }

  private buildItems(year: Year) {
    for (const id of Object.keys(objectPositions) as ObjectId[]) {
      const group = createPrimitive(id)
      group.position.set(...objectPositions[id][year])
      group.userData.id = id

      const height = new THREE.Box3().setFromObject(group).max.y - group.position.y
      const marker = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.markerIdle, depthTest: false }),
      )
      marker.position.y = height + 0.09
      marker.renderOrder = 10
      marker.userData.id = id
      group.add(marker)

      this.scene.add(group)
      this.items.set(id, {
        id,
        group,
        marker,
        from: group.position.clone(),
        to: group.position.clone(),
        t: 1,
        height,
      })
    }
  }

  // Swap each primitive for its generated model once the file has loaded.
  private loadModels() {
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    // reflections for the models' metal and glass; the scan itself is unlit
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    const loader = new GLTFLoader()
    for (const id of Object.keys(objectModels) as ObjectId[]) {
      const cfg = objectModels[id]!
      const item = this.items.get(id)
      if (!item) continue
      loader.load(
        cfg.url,
        (gltf) => {
          const model = gltf.scene
          model.rotation.y = cfg.turn ?? 0
          const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
          model.scale.setScalar(cfg.size / Math.max(size.x, size.y, size.z))
          // origin at the bottom centre, like the primitives
          const box = new THREE.Box3().setFromObject(model)
          const centre = box.getCenter(new THREE.Vector3())
          model.position.set(model.position.x - centre.x, model.position.y - box.min.y, model.position.z - centre.z)
          model.traverse((o) => {
            const m = o as THREE.Mesh
            if (!m.isMesh) return
            for (const mat of [m.material].flat() as THREE.MeshStandardMaterial[]) mat.envMap = envMap
          })

          for (const child of [...item.group.children]) {
            if (child === item.marker) continue
            const m = child as THREE.Mesh
            if (m.isMesh) m.geometry.dispose()
            item.group.remove(child)
          }
          item.group.add(model)
          item.height = box.max.y - box.min.y
          item.marker.position.y = item.height + 0.09
          this.cb.onModelLoaded?.(id)
        },
        undefined,
        () => console.warn(`No model at ${cfg.url}, keeping the primitive for ${id}`),
      )
    }
  }

  private addDebugGrid() {
    const grid = new THREE.GridHelper(16, 16, 0xff0000, 0x0066ff)
    grid.position.y = 1.5
    ;(grid.material as THREE.Material).depthTest = false
    grid.renderOrder = 20
    this.scene.add(grid)
    for (let x = -8; x <= 8; x += 2) {
      for (let z = -8; z <= 8; z += 2) {
        const c = document.createElement('canvas')
        c.width = 128
        c.height = 48
        const ctx = c.getContext('2d')!
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillRect(0, 0, 128, 48)
        ctx.fillStyle = '#000'
        ctx.font = 'bold 28px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${x},${z}`, 64, 34)
        const s = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }),
        )
        s.position.set(x, 1.5, z)
        s.scale.set(0.8, 0.3, 1)
        s.renderOrder = 21
        this.scene.add(s)
      }
    }
  }

  // ---------- camera ----------

  private setMode(mode: 'orbit' | 'walk') {
    if (this.mode === mode) return
    this.mode = mode
    this.keys.clear()
    for (const item of this.items.values()) item.marker.visible = true
    this.cb.onModeChange?.(mode)
  }

  private flyTo(toPos: THREE.Vector3, lookAt: THREE.Vector3, seconds: number, onDone?: () => void) {
    const probe = this.camera.clone()
    probe.position.copy(toPos)
    probe.lookAt(lookAt)
    this.flight = {
      fromPos: this.camera.position.clone(),
      toPos,
      fromQuat: this.camera.quaternion.clone(),
      toQuat: probe.quaternion.clone(),
      t: 0,
      seconds,
      onDone,
    }
  }

  private syncWalkAngles() {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ')
    this.yaw = e.y
    this.pitch = e.x
  }

  private applyWalkAngles() {
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.2, 1.2)
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
  }

  private updateWalk(dt: number) {
    const k = this.keys
    const forward = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    const strafe = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0)
    const turn = (k.has('arrowleft') ? 1 : 0) - (k.has('arrowright') ? 1 : 0)
    if (turn) {
      this.yaw += turn * TURN_SPEED * dt
      this.applyWalkAngles()
    }
    if (!forward && !strafe) return
    const speed = WALK_SPEED * (k.has('shift') ? 2 : 1) * dt
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    const p = this.camera.position
    p.x += (-sin * forward + cos * strafe) * speed
    p.z += (-cos * forward - sin * strafe) * speed
    p.x = THREE.MathUtils.clamp(p.x, -BOUNDS, BOUNDS)
    p.z = THREE.MathUtils.clamp(p.z, -BOUNDS, BOUNDS)
  }

  // In walk mode a click on the floor walks you to that spot, keeping the direction you face.
  private walkToFloorClick(): boolean {
    if (!this.apartment) return false
    const hit = this.raycaster.intersectObject(this.apartment, true)[0]
    if (!hit || hit.point.y > FLOOR_Y + 0.25) return false
    const toPos = new THREE.Vector3(hit.point.x, hit.point.y + EYE_HEIGHT, hit.point.z)
    const dist = toPos.distanceTo(this.camera.position)
    if (dist < 0.2) return false
    const ahead = toPos.clone().add(this.camera.getWorldDirection(new THREE.Vector3()))
    this.flyTo(toPos, ahead, THREE.MathUtils.clamp(dist / 3, 0.4, 1.4), () => this.syncWalkAngles())
    return true
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.mode !== 'walk' || e.metaKey || e.ctrlKey) return
    const key = e.key.toLowerCase()
    if (key.startsWith('arrow')) e.preventDefault()
    this.keys.add(key)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase())
  }

  private onBlur = () => this.keys.clear()

  private onWheel = (e: WheelEvent) => {
    if (this.mode !== 'walk') return
    e.preventDefault()
    if (this.flight) return
    const step = THREE.MathUtils.clamp(-e.deltaY * 0.004, -0.6, 0.6)
    const p = this.camera.position
    p.x = THREE.MathUtils.clamp(p.x - Math.sin(this.yaw) * step, -BOUNDS, BOUNDS)
    p.z = THREE.MathUtils.clamp(p.z - Math.cos(this.yaw) * step, -BOUNDS, BOUNDS)
  }

  // ---------- interaction ----------

  private setRay(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.camera)
  }

  private pick(e: PointerEvent): ObjectId | null {
    this.setRay(e)
    const targets = [...this.items.values()].filter((i) => i.group.visible).map((i) => i.group)
    const hit = this.raycaster.intersectObjects(targets, true)[0]
    if (!hit) return null
    // objects hidden behind the scan (walls, furniture) can't be clicked through it
    if (this.mode === 'walk' && this.apartment) {
      const wall = this.raycaster.intersectObject(this.apartment, true)[0]
      if (wall && wall.distance < hit.distance - 0.1) return null
    }
    let o: THREE.Object3D | null = hit.object
    while (o && !o.userData.id) o = o.parent
    return o ? (o.userData.id as ObjectId) : null
  }

  private onPointerDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY }
    this.dragging = true
  }

  private onPointerUp = (e: PointerEvent) => {
    this.dragging = false
    // A drag is an orbit or a look-around, not a click.
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5) return
    const id = this.pick(e)
    if (id) {
      this.cb.onSelect(id)
      return
    }
    if (this.debug && this.apartment) {
      const hit = this.raycaster.intersectObject(this.apartment, true)[0]
      if (hit) {
        const p = hit.point.toArray().map((n) => Math.round(n * 100) / 100) as Vec3
        console.log(`[${p.join(', ')}]`)
        navigator.clipboard?.writeText(`[${p.join(', ')}]`).catch(() => {})
        this.cb.onDebugPoint?.(p)
      }
      if (this.mode !== 'walk') return
    }
    if (this.mode === 'walk' && !this.flight && this.walkToFloorClick()) return
    if (this.selected) this.cb.onSelect(null)
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.buttons) {
      // drag to look around while standing inside
      if (this.mode === 'walk' && this.dragging && !this.flight) {
        this.yaw += e.movementX * 0.004
        this.pitch += e.movementY * 0.004
        this.applyWalkAngles()
      }
      return
    }
    this.renderer.domElement.style.cursor = this.pick(e) ? 'pointer' : 'grab'
  }

  // ---------- loop ----------

  private resize() {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  // Markers are anchored to their object in world space. Outside they work like map pins:
  // steady on-screen size, visible through walls. Inside they belong to the room: real size
  // (shrinking with distance) and hidden while the object is behind a wall or furniture.
  private updateMarkers() {
    const world = new THREE.Vector3()
    if (this.mode === 'walk' && this.apartment) {
      // one line-of-sight check per frame, taking the objects in turn
      const list = [...this.items.values()]
      const item = list[this.frameCount++ % list.length]
      world.copy(item.group.position)
      world.y += item.height / 2
      const dir = world.sub(this.camera.position)
      const dist = dir.length()
      this.sightRay.set(this.camera.position, dir.normalize())
      this.sightRay.far = dist
      const wall = this.sightRay.intersectObject(this.apartment, true)[0]
      item.marker.visible = !wall || wall.distance > dist - 0.3
    }
    for (const item of this.items.values()) {
      const dist = item.marker.getWorldPosition(world).distanceTo(this.camera.position)
      const size = this.mode === 'walk' ? Math.min(0.1, dist * 0.035) : dist * 0.0235
      item.marker.scale.setScalar(item.id === this.selected ? size * 1.3 : size)
    }
  }

  private tick = () => {
    this.frame = requestAnimationFrame(this.tick)
    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now
    for (const item of this.items.values()) {
      if (item.t >= 1) continue
      item.t = Math.min(1, item.t + dt / MOVE_SECONDS)
      const k = item.t * item.t * (3 - 2 * item.t) // smoothstep
      item.group.position.lerpVectors(item.from, item.to, k)
      // lift the object slightly mid-move so it travels over furniture instead of through it
      item.group.position.y += Math.sin(k * Math.PI) * 0.5
    }
    if (this.flight) {
      const f = this.flight
      f.t = Math.min(1, f.t + dt / f.seconds)
      const k = f.t * f.t * (3 - 2 * f.t)
      this.camera.position.lerpVectors(f.fromPos, f.toPos, k)
      this.camera.quaternion.slerpQuaternions(f.fromQuat, f.toQuat, k)
      if (f.t >= 1) {
        this.flight = null
        f.onDone?.()
      }
    } else if (this.mode === 'walk') {
      this.updateWalk(dt)
    } else {
      this.controls.update()
    }
    this.updateMarkers()
    this.renderer.render(this.scene, this.camera)
  }
}
