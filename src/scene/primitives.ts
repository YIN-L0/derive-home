import * as THREE from 'three'
import type { ObjectId } from '../config/scene'

// Primitive stand-ins for the objects. Each group has its origin at the
// bottom centre so a position in config/scene.ts means "resting on this point".

const mat = (color: number, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness })

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  return m
}

const builders: Record<ObjectId, () => THREE.Group> = {
  book() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.24, 0.05, 0.32), mat(0x9c3b2e), 0, 0.025, 0))
    g.add(mesh(new THREE.BoxGeometry(0.22, 0.04, 0.3), mat(0xf2ead8), 0.012, 0.025, 0))
    return g
  },
  mug() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 24), mat(0xf4f1ea, 0.4), 0, 0.08, 0))
    const handle = mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20), mat(0xf4f1ea, 0.4), 0.075, 0.08, 0)
    g.add(handle)
    return g
  },
  notebook() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.03, 0.34), mat(0x2f5d50), 0, 0.015, 0))
    g.add(mesh(new THREE.BoxGeometry(0.03, 0.032, 0.34), mat(0xd8c9a3), -0.1, 0.016, 0))
    return g
  },
  camera() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.16, 0.1), mat(0x1d1d1f, 0.5), 0, 0.08, 0))
    const lens = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 24), mat(0x3a3a3e, 0.3), 0, 0.08, 0.09)
    lens.rotation.x = Math.PI / 2
    g.add(lens)
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.035, 0.07), mat(0xb9b9bd, 0.4), -0.06, 0.177, 0))
    return g
  },
  record() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 48), mat(0x111111, 0.35), 0, 0.006, 0))
    g.add(mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.014, 32), mat(0xd9a441), 0, 0.007, 0))
    return g
  },
  plant() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 24), mat(0xc8704a), 0, 0.13, 0))
    const leaf = mat(0x3f7d4e)
    g.add(mesh(new THREE.IcosahedronGeometry(0.24, 1), leaf, 0, 0.5, 0))
    g.add(mesh(new THREE.IcosahedronGeometry(0.17, 1), leaf, 0.13, 0.72, 0.05))
    g.add(mesh(new THREE.IcosahedronGeometry(0.15, 1), leaf, -0.12, 0.68, -0.07))
    return g
  },
  box() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.36, 0.4), mat(0xc49a6c), 0, 0.18, 0))
    g.add(mesh(new THREE.BoxGeometry(0.51, 0.005, 0.07), mat(0xe6d2ae), 0, 0.362, 0))
    return g
  },
  lamp() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 24), mat(0x1d1d1f, 0.5), 0, 0.015, 0))
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 12), mat(0xb9b9bd, 0.4), 0, 0.18, 0))
    g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 32), mat(0xf2ead8), 0, 0.43, 0))
    return g
  },
  archive() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.13, 0.28), mat(0x4a4a44), 0, 0.065, 0))
    g.add(mesh(new THREE.BoxGeometry(0.41, 0.05, 0.29), mat(0x3a3a35), 0, 0.155, 0))
    return g
  },
  radio() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), mat(0x7a4a2c, 0.6), 0, 0.09, 0))
    const speaker = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 24), mat(0xd8c9a3, 0.9), -0.07, 0.09, 0.052)
    speaker.rotation.x = Math.PI / 2
    g.add(speaker)
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.035, 0.012), mat(0xf2ead8, 0.4), 0.075, 0.12, 0.052))
    const aerial = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), mat(0xb9b9bd, 0.3), 0.12, 0.3, -0.03)
    aerial.rotation.z = -0.3
    g.add(aerial)
    return g
  },
  umbrella() {
    const g = new THREE.Group()
    const canopy = mesh(new THREE.ConeGeometry(0.055, 0.7, 12), mat(0x1f2a44, 0.7), 0, 0.37, 0)
    canopy.rotation.x = Math.PI // furled, tip on the floor
    g.add(canopy)
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), mat(0x1d1d1f, 0.5), 0, 0.79, 0))
    const hook = mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 16, Math.PI), mat(0x7a4a2c, 0.5), 0.035, 0.86, 0)
    g.add(hook)
    return g
  },
  candle() {
    const g = new THREE.Group()
    const brass = mat(0xb08d3c, 0.35)
    g.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.02, 24), brass, 0, 0.01, 0))
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.1, 12), brass, 0, 0.07, 0))
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.02, 16), brass, 0, 0.13, 0))
    g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 12), mat(0xf4f1ea, 0.6), 0, 0.22, 0))
    return g
  },
  suitcase() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.42, 0.2), mat(0x6b4a32, 0.7), 0, 0.21, 0))
    g.add(mesh(new THREE.BoxGeometry(0.63, 0.03, 0.205), mat(0x3d2a1c, 0.6), 0, 0.21, 0))
    g.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), mat(0x3d2a1c, 0.5), 0, 0.42, 0))
    return g
  },
  typewriter() {
    const g = new THREE.Group()
    const body = mat(0x2c3a36, 0.45)
    g.add(mesh(new THREE.BoxGeometry(0.34, 0.07, 0.32), body, 0, 0.035, 0))
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.07, 0.14), body, 0, 0.105, -0.08))
    const roller = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 16), mat(0x111111, 0.4), 0, 0.16, -0.1)
    roller.rotation.z = Math.PI / 2
    g.add(roller)
    g.add(mesh(new THREE.BoxGeometry(0.26, 0.012, 0.12), mat(0xd8c9a3, 0.6), 0, 0.078, 0.08))
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.16, 0.004), mat(0xf4f1ea, 0.9), 0, 0.24, -0.12))
    return g
  },
  quilt() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.4), mat(0x9a4a46, 0.95), 0, 0.03, 0))
    g.add(mesh(new THREE.BoxGeometry(0.48, 0.06, 0.38), mat(0xd9c7a8, 0.95), 0.01, 0.09, 0))
    g.add(mesh(new THREE.BoxGeometry(0.46, 0.05, 0.36), mat(0x3f5f7a, 0.95), 0, 0.145, 0.01))
    return g
  },
  bottle() {
    const g = new THREE.Group()
    const glass = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.15, transparent: true, opacity: 0.8 })
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.09, 0.04), glass, 0, 0.045, 0))
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 12), mat(0xb08d3c, 0.3), 0, 0.1, 0))
    g.add(mesh(new THREE.SphereGeometry(0.02, 16, 12), mat(0xb08d3c, 0.3), 0, 0.128, 0))
    return g
  },
  wateringcan() {
    const g = new THREE.Group()
    const zinc = mat(0x8a9a94, 0.4)
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.24, 24), zinc, 0, 0.12, 0))
    const spout = mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.3, 10), zinc, 0.2, 0.19, 0)
    spout.rotation.z = -0.9
    g.add(spout)
    const handle = mesh(new THREE.TorusGeometry(0.085, 0.01, 8, 20, Math.PI), zinc, -0.1, 0.17, 0)
    handle.rotation.z = Math.PI / 2
    g.add(handle)
    return g
  },
}

export function createPrimitive(id: ObjectId): THREE.Group {
  return builders[id]()
}

// Stand-in for a memory a visitor described: the language model chooses shape, colour and
// size, and this turns them into a simple form. `sizeCm` is the longest side.
export function createMemoryPrimitive(form: { shape: string; color: string; sizeCm: number }): THREE.Group {
  const g = new THREE.Group()
  const L = THREE.MathUtils.clamp(form.sizeCm || 20, 5, 90) / 100
  const color = new THREE.Color(/^#[0-9a-f]{6}$/i.test(form.color) ? form.color : '#8d8aa8')
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
  switch (form.shape) {
    case 'paper':
      g.add(mesh(new THREE.BoxGeometry(L * 0.7, 0.006, L), m, 0, 0.003, 0))
      break
    case 'book':
      g.add(mesh(new THREE.BoxGeometry(L * 0.7, L * 0.16, L), m, 0, L * 0.08, 0))
      break
    case 'vessel':
      g.add(mesh(new THREE.CylinderGeometry(L * 0.36, L * 0.3, L, 28), m, 0, L / 2, 0))
      break
    case 'box':
      g.add(mesh(new THREE.BoxGeometry(L, L * 0.7, L * 0.8), m, 0, L * 0.35, 0))
      break
    case 'sphere':
      g.add(mesh(new THREE.SphereGeometry(L / 2, 32, 20), m, 0, L / 2, 0))
      break
    case 'soft': {
      const blob = mesh(new THREE.SphereGeometry(L / 2, 24, 16), m, 0, L * 0.2, 0)
      blob.scale.y = 0.4
      g.add(blob)
      break
    }
    case 'tall':
      g.add(mesh(new THREE.CylinderGeometry(L * 0.14, L * 0.18, L, 20), m, 0, L / 2, 0))
      break
    default:
      g.add(mesh(new THREE.OctahedronGeometry(L / 2), m, 0, L / 2, 0))
  }
  return g
}
