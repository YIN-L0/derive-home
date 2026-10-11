import { objectPositions, type ObjectId, type Vec3, type Year } from '../config/scene'

export type Layer = 'family' | 'tenants' | 'current'

export interface MemoryObject {
  id: ObjectId
  name: string
  summary: string
  layers: Layer[]
  positionByYear: Record<Year, Vec3>
  ownerByYear: Record<Year, string>
  locationByYear: Record<Year, string>
  storyByYear: Record<Year, string>
  foundInside?: { name: string; detail: string[] }
  passedForward?: { text: string; note: string }
}

export const ERAS: Record<Year, { label: string; layer: Layer }> = {
  1998: { label: 'Family Home', layer: 'family' },
  2018: { label: 'Shared Apartment', layer: 'tenants' },
  2026: { label: 'Current Home', layer: 'current' },
}

const OWNERS: Record<Year, string> = {
  1998: 'Grandmother',
  2018: 'Previous tenant',
  2026: 'Current resident',
}

// To add an object: add its id to ObjectId and objectPositions in config/scene.ts,
// a primitive in scene/primitives.ts, and an entry here.
const entries: Omit<MemoryObject, 'positionByYear'>[] = [
  {
    id: 'book',
    name: 'The Book',
    summary: 'A novel that stayed behind as residents came and went.',
    layers: ['family', 'tenants', 'current'],
    ownerByYear: OWNERS,
    locationByYear: { 1998: 'Bookshelf', 2018: 'Sofa', 2026: 'Moving Box' },
    storyByYear: {
      1998: 'A novel kept beside the family photo albums. A train ticket was used as a bookmark.',
      2018: "The book became part of the apartment's shared library.",
      2026: 'The book is being packed for another apartment. The train ticket is still inside.',
    },
    foundInside: {
      name: 'Train Ticket',
      detail: ['A train ticket was found between pages.', 'Paris → Lyon', 'June 1997'],
    },
  },
  {
    id: 'mug',
    name: 'Morning Routine',
    summary: 'One mug, several owners, a different kind of morning in each decade.',
    layers: ['tenants'],
    ownerByYear: OWNERS,
    locationByYear: { 1998: 'Kitchen Counter', 2018: 'Beside the Stove', 2026: 'Bedroom Shelf' },
    storyByYear: {
      1998: 'Tea at six, before anyone else was awake. Always put back in the same place by the sink.',
      2018: 'Nobody knew whose mug it was. Whoever woke up first used it.',
      2026: 'Coffee is carried to the bedroom now, where the working day starts.',
    },
  },
  {
    id: 'notebook',
    name: 'Recipe Notebook',
    summary: 'Handwritten recipes left by one household and edited by the next.',
    layers: ['family'],
    ownerByYear: { 1998: 'Grandmother', 2018: 'Shared by the tenants', 2026: 'Current resident' },
    locationByYear: { 1998: 'Kitchen Counter', 2018: 'Kitchen Counter', 2026: 'Kitchen Counter' },
    storyByYear: {
      1998: 'Forty pages of recipes in blue ink, written for this kitchen and this oven.',
      2018: 'The tenants found it in a drawer and started adding their own notes in the margins.',
      2026: 'Three handwritings now. The newest page is a correction to the oldest recipe.',
    },
    passedForward: {
      text: 'Previous residents left this notebook for whoever lived here next.',
      note: '“The oven runs hot. Reduce every recipe by about 10°C.”',
    },
  },
  {
    id: 'camera',
    name: 'Camera',
    summary: 'It recorded family gatherings, then the neighbourhood, and now the rooms themselves.',
    layers: ['family', 'current'],
    ownerByYear: OWNERS,
    locationByYear: { 1998: 'Mantelpiece', 2018: 'Bedroom Shelf', 2026: 'Sofa' },
    storyByYear: {
      1998: 'Kept on the mantelpiece, loaded, ready for birthdays and Sunday lunches.',
      2018: 'A tenant found it in a cupboard and took it out to photograph the street.',
      2026: 'It is being used to document every room before the move.',
    },
  },
  {
    id: 'record',
    name: 'The Record',
    summary: 'One record, played over and over by people who never met.',
    layers: ['tenants'],
    ownerByYear: OWNERS,
    locationByYear: { 1998: 'Bedroom Shelf', 2018: 'Living Room Rug', 2026: 'Mantelpiece' },
    storyByYear: {
      1998: 'Played on Sunday afternoons with the bedroom door open.',
      2018: 'Left out on the rug after most house parties. Side B has a scratch from that year.',
      2026: 'There is no turntable any more. It sits on the mantelpiece like a photograph.',
    },
  },
  {
    id: 'plant',
    name: 'The Plant',
    summary: 'The residents moved out. The plant did not.',
    layers: ['family'],
    ownerByYear: { 1998: 'Grandmother', 2018: 'Nobody in particular', 2026: 'Current resident' },
    locationByYear: { 1998: 'By the Window', 2018: 'By the Window', 2026: 'By the Window' },
    storyByYear: {
      1998: 'Placed near the brightest window.',
      2018: 'The previous residents left it behind. The new tenants kept watering it.',
      2026: 'The only resident that never moved out.',
    },
  },
  {
    id: 'box',
    name: 'Moving Box',
    summary: 'The residents change. The same kind of box keeps coming back.',
    layers: ['current'],
    ownerByYear: { 1998: 'The family', 2018: 'New tenant', 2026: 'Current resident' },
    locationByYear: { 1998: 'Bedroom', 2018: 'Hallway', 2026: 'Living Room' },
    storyByYear: {
      1998: 'The last box of the family move, never fully unpacked.',
      2018: 'A new tenant arrived with four of these. This one stayed in the hallway for a month.',
      2026: 'Packing has started again. The book went in first.',
    },
  },
  {
    id: 'lamp',
    name: 'The Lamp',
    summary: 'The same light, switched on by a different hand in every decade.',
    layers: ['family', 'tenants'],
    ownerByYear: OWNERS,
    locationByYear: { 1998: 'Mantelpiece', 2018: 'Living Room Floor', 2026: 'Mantelpiece' },
    storyByYear: {
      1998: 'Left on until the last person was home. It was the signal that someone was still awake.',
      2018: 'Nobody owned a side table. It stood on the floor and lit the room from below.',
      2026: 'Back on the mantelpiece. It will be the last thing unplugged on moving day.',
    },
  },
  {
    id: 'archive',
    name: 'Archive Box',
    summary: 'Photographs, letters and tickets. Each household added to it and none emptied it.',
    layers: ['family', 'current'],
    ownerByYear: { 1998: 'Grandmother', 2018: 'Left by the family', 2026: 'Current resident' },
    locationByYear: { 1998: 'Bedroom Shelf', 2018: 'Bedroom Floor', 2026: 'Hallway' },
    storyByYear: {
      1998: 'Kept within reach of the bed. Opened on anniversaries, closed again the same evening.',
      2018: 'Found at the back of a cupboard. The tenants read the letters once and put them back in order.',
      2026: 'Waiting by the door. It is the one box that will not go in the van.',
    },
  },
]

export const OBJECTS: MemoryObject[] = entries.map((e) => ({ ...e, positionByYear: objectPositions[e.id] }))

export const objectById = (id: ObjectId) => OBJECTS.find((o) => o.id === id)!
