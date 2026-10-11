// Every XYZ in the project lives in this file.
// Units are meters. Y is up. The living-room floor of the scan sits at about y = -1.15.
//
// To find a coordinate: open http://localhost:5173/?debug and click anywhere
// in the apartment. The clicked point is shown on screen and copied to the
// clipboard as [x, y, z].

export type Vec3 = [number, number, number]
export type Year = 1998 | 2018 | 2026
export const YEARS: Year[] = [1998, 2018, 2026]

export type ObjectId = 'book' | 'mug' | 'notebook' | 'camera' | 'record' | 'plant' | 'box' | 'lamp' | 'archive'

export const FLOOR_Y = -1.15

export const apartmentTransform = {
  url: '/assets/apartment/scene.glb',
  position: [0, 0, 0] as Vec3,
  rotation: [0, 0, 0] as Vec3, // radians
  scale: 1,
}

export const cameraConfig = {
  position: [6.5, 9.5, 10.5] as Vec3, // where the camera starts
  target: [-1.2, -1, 0.8] as Vec3, // the point it orbits around
  fov: 40,
  minDistance: 1.5,
  maxDistance: 32,
}

// Camera angles offered in the VIEWS bar.
// mode 'orbit' = look at the home from outside; 'walk' = stand inside at eye height.
// For walk views, `position` is where you stand (y is the eye) and `target` is what you look at.
export const EYE_HEIGHT = 1.5 // meters above FLOOR_Y
const EYE_Y = FLOOR_Y + EYE_HEIGHT

export interface Viewpoint {
  id: string
  label: string
  mode: 'orbit' | 'walk'
  position: Vec3
  target: Vec3
}

export const viewpoints: Viewpoint[] = [
  { id: 'overview', label: 'Overview', mode: 'orbit', position: cameraConfig.position, target: cameraConfig.target },
  { id: 'plan', label: 'Plan', mode: 'orbit', position: [-0.3, 21, 0.6], target: [-0.3, -1, 0.5] },
  { id: 'living', label: 'Living Room', mode: 'walk', position: [1.5, EYE_Y, -0.7], target: [-1.6, -0.7, 1.3] },
  { id: 'sofa', label: 'Sofa', mode: 'walk', position: [0.3, EYE_Y, 2.2], target: [-1.8, -0.7, 0.2] },
  { id: 'fireplace', label: 'Fireplace', mode: 'walk', position: [-0.5, EYE_Y, 0.5], target: [-3, -0.3, 2.2] },
  { id: 'kitchen', label: 'Kitchen', mode: 'walk', position: [0.45, EYE_Y, 3.97], target: [-0.7, -0.5, 5.6] },
  { id: 'bedroom', label: 'Bedroom', mode: 'walk', position: [-3.2, EYE_Y, -0.5], target: [-5.6, -0.2, -1.2] },
  { id: 'hall', label: 'Hallway', mode: 'walk', position: [0, EYE_Y, -1.83], target: [-0.6, -0.6, 1.5] },
]

// Named spots measured from the scan. Reuse them below or type raw [x, y, z].
const spot = {
  bookshelf: [-5.56, -0.04, -1.38],
  shelfCabinetLeft: [-5.81, -0.71, -0.42],
  shelfCabinetMid: [-5.72, -0.71, -1.24],
  shelfCabinetRight: [-5.64, -0.69, -1.99],
  sofaMid: [-1.55, -0.75, 0.44],
  sofaLeft: [-1.85, -0.77, 0.78],
  rug: [-0.6, -1.14, 1.2],
  mantle: [-2.93, 0.24, 1.95],
  mantleRight: [-2.97, 0.24, 1.58],
  kitchenCounter: [0.1, -0.3, 5.51],
  kitchenCounterFar: [-0.24, -0.3, 5.65],
  stoveSide: [-0.93, -0.29, 4.25],
  window: [-3.11, -1.15, 3.5], // floor beside the sliding glass door
  bedroomFloor: [-3.11, -1.12, -1.83],
  hallFloor: [0, -1.15, -1.83],
  livingFloor: [-0.98, -1.15, -0.73],
  onMovingBox: [-0.98, -0.79, -0.73], // livingFloor + box height (0.36)
} satisfies Record<string, Vec3>

// Places where a memory described by a visitor can be put (the "Leave a memory" dialog).
// The language model reads the labels and picks one by id.
export const memorySpots: { id: string; label: string; position: Vec3 }[] = [
  { id: 'bookshelf', label: 'Bedroom bookshelf', position: spot.bookshelf },
  { id: 'shelfCabinet', label: 'Top of the low cabinet in the bedroom', position: spot.shelfCabinetMid },
  { id: 'bedroomFloor', label: 'Bedroom floor, beside the bed', position: spot.bedroomFloor },
  { id: 'sofa', label: 'Living-room sofa', position: spot.sofaLeft },
  { id: 'rug', label: 'Living-room rug', position: spot.rug },
  { id: 'livingFloor', label: 'Living-room floor', position: spot.livingFloor },
  { id: 'mantle', label: 'Fireplace mantelpiece', position: spot.mantleRight },
  { id: 'window', label: 'By the glass door to the balcony', position: spot.window },
  { id: 'kitchenCounter', label: 'Kitchen counter by the sink', position: spot.kitchenCounter },
  { id: 'stove', label: 'Kitchen, beside the stove', position: spot.stoveSide },
  { id: 'hall', label: 'Hallway floor', position: spot.hallFloor },
]

// Where each object sits in each year. Same position in all three years = it never moves.
export const objectPositions: Record<ObjectId, Record<Year, Vec3>> = {
  book: {
    1998: spot.bookshelf,
    2018: spot.sofaMid,
    2026: spot.onMovingBox,
  },
  mug: {
    1998: spot.kitchenCounter,
    2018: spot.stoveSide,
    2026: spot.shelfCabinetMid,
  },
  notebook: {
    1998: spot.kitchenCounterFar,
    2018: spot.kitchenCounterFar,
    2026: spot.kitchenCounterFar,
  },
  camera: {
    1998: spot.mantle,
    2018: spot.shelfCabinetRight,
    2026: spot.sofaLeft,
  },
  record: {
    1998: spot.shelfCabinetLeft,
    2018: spot.rug,
    2026: spot.mantleRight,
  },
  plant: {
    1998: spot.window,
    2018: spot.window,
    2026: spot.window,
  },
  box: {
    1998: spot.bedroomFloor,
    2018: spot.hallFloor,
    2026: spot.livingFloor,
  },
  lamp: {
    1998: spot.mantleRight,
    2018: spot.livingFloor,
    2026: spot.mantle,
  },
  archive: {
    1998: spot.shelfCabinetMid,
    2018: spot.bedroomFloor,
    2026: spot.hallFloor,
  },
}

// Objects that have a real 3D model (generated with Kaedim) instead of a primitive.
// `size` is the model's longest side in meters: the generator does not output real-world
// scale, so each model is rescaled to this on load. `turn` spins it around Y, in radians.
// If a file is missing the primitive stays.
export const objectModels: Partial<Record<ObjectId, { url: string; size: number; turn?: number }>> = {
  book: { url: '/assets/objects/book.glb', size: 0.22 },
  camera: { url: '/assets/objects/camera.glb', size: 0.2 }, // includes the strap; the body is about 0.14,
  lamp: { url: '/assets/objects/lamp.glb', size: 0.53 },
  archive: { url: '/assets/objects/archive.glb', size: 0.4 },
}

// Walking routes drawn on the floor by SHOW MOVEMENT. Only x and z matter:
// the line is drawn just above FLOOR_Y.
const stop = {
  bedroom: [-3.1, 0, -1.8],
  hall: [0, 0, -1.8],
  frontDoor: [0, 0, -3.6],
  living: [0, 0, 1.1],
  kitchenDoor: [0.45, 0, 4.0],
  kitchen: [-1.0, 0, 5.3],
  diningTable: [2.1, 0, 1.7],
  desk: [3.1, 0, 1.1],
  sofa: [-1.0, 0, 0.5],
} satisfies Record<string, Vec3>

export const personRoutes: Record<Year, { person: string; stops: string[]; points: Vec3[] }> = {
  1998: {
    person: 'Grandmother',
    stops: ['Bedroom', 'Kitchen', 'Dining Table', 'Sofa'],
    points: [stop.bedroom, stop.hall, stop.living, stop.kitchenDoor, stop.kitchen, stop.kitchenDoor, stop.diningTable, stop.sofa],
  },
  2018: {
    person: 'Roommate',
    stops: ['Front Door', 'Kitchen', 'Desk', 'Sofa', 'Front Door'],
    points: [stop.frontDoor, stop.hall, stop.living, stop.kitchenDoor, stop.kitchen, stop.kitchenDoor, stop.desk, stop.sofa, stop.hall, stop.frontDoor],
  },
  2026: {
    person: 'Current resident',
    stops: ['Bedroom', 'Desk', 'Kitchen', 'Front Door'],
    points: [stop.bedroom, stop.hall, stop.desk, stop.living, stop.kitchenDoor, stop.kitchen, stop.kitchenDoor, stop.living, stop.hall, stop.frontDoor],
  },
}
