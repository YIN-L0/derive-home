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
  1998: 'Hélène Marchand',
  2018: 'The tenants',
  2026: 'Lina Zhou',
}

// To add an object: add its id to ObjectId and objectPositions in config/scene.ts,
// a primitive in scene/primitives.ts, and an entry here.
const entries: Omit<MemoryObject, 'positionByYear'>[] = [
  {
    id: 'book',
    name: 'The Book',
    summary: 'A novel that stayed behind as residents came and went.',
    layers: ['family', 'tenants', 'current'],
    ownerByYear: { ...OWNERS, 2018: 'Shared by the tenants' },
    locationByYear: { 1998: 'Bookshelf', 2018: 'Sofa', 2026: 'Moving Box' },
    storyByYear: {
      1998: 'Hélène bought it at a station in Paris in June 1997, on her first journey alone after Paul died, and read it on the train to Lyon. It lived on the bedroom bookshelf beside the family photo albums, with the train ticket as a bookmark at page 112.',
      2018: 'Hélène died in 2011 and the family let the apartment. The book stayed on the shelf, and the tenants treated it as a shared library: Idris, Noor and Tomás each started it on the sofa, and none of them moved the ticket.',
      2026: 'It was the first thing Lina packed for the next apartment. Lina has never finished it either, but the ticket is still at page 112 and the book is leaving with the boxes.',
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
    ownerByYear: { ...OWNERS, 2018: 'Nobody in particular' },
    locationByYear: { 1998: 'Kitchen Counter', 2018: 'Beside the Stove', 2026: 'Bedroom Shelf' },
    storyByYear: {
      1998: 'Tea at six, before anyone else was awake. Hélène drank it standing at the counter and always put the mug back in the same place by the sink.',
      2018: 'Three people shared the kitchen and nobody knew whose mug it was. Whoever woke up first used it, usually Noor, and it spent most days beside the stove, waiting to be washed.',
      2026: 'Lina carries coffee to the bedroom now, where the working day starts at a laptop. The mug has a chip on the rim that nobody living here can explain.',
    },
  },
  {
    id: 'notebook',
    name: 'Recipe Notebook',
    summary: 'Handwritten recipes left by one household and edited by the next.',
    layers: ['family'],
    ownerByYear: { 1998: 'Hélène Marchand', 2018: 'Shared by the tenants', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Kitchen Counter', 2018: 'Kitchen Counter', 2026: 'Kitchen Counter' },
    storyByYear: {
      1998: "Forty pages of recipes in blue ink, written for this kitchen and this oven. Hélène wrote down the name of the person each dish was for. Camille appears eleven times. Paul's name stops after page nineteen.",
      2018: "Noor found it in a drawer during the first week. The tenants cooked from it on Sundays and added their own notes in the margins, in pencil, so the ink stayed Hélène's.",
      2026: "Three handwritings now. Lina's newest page is a correction to Hélène's oldest recipe, and the notebook has never left the counter where it was first written.",
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
    ownerByYear: { ...OWNERS, 2018: 'Idris Bello' },
    locationByYear: { 1998: 'Mantelpiece', 2018: 'Bedroom Shelf', 2026: 'Sofa' },
    storyByYear: {
      1998: 'Kept on the mantelpiece, loaded, ready for birthdays and Sunday lunches. Hélène took the pictures, which is why she is in almost none of them. Camille is in most. Antoine and Sophie share a frame in only four.',
      2018: 'Idris found it in a cupboard with half a roll of film still inside. Idris kept it on the bedroom shelf and took it out to photograph the street, one frame a week.',
      2026: 'Lina is using it to document every room before the move: the light on the sofa, the marks on the door frame, the view from each window. These are the last pictures it will take here.',
    },
  },
  {
    id: 'record',
    name: 'The Record',
    summary: 'One record, played over and over by people who never met.',
    layers: ['tenants'],
    ownerByYear: { ...OWNERS, 1998: 'Paul Marchand, kept by Hélène', 2018: 'Tomás Rey' },
    locationByYear: { 1998: 'Bedroom Shelf', 2018: 'Living Room Rug', 2026: 'Mantelpiece' },
    storyByYear: {
      1998: "It was Paul's record. After he died in 1996, Hélène played it on Sunday afternoons with the bedroom door open, so the music reached the kitchen. Camille learned to dance to it in the hallway.",
      2018: 'Tomás brought the turntable and left this out on the rug after most house parties. Side B has a scratch from that year, and all three tenants can still sing the bar where it skips.',
      2026: 'There is no turntable any more. It sits on the mantelpiece like a photograph, kept by Lina, who has never heard it played.',
    },
  },
  {
    id: 'plant',
    name: 'The Plant',
    summary: 'The residents moved out. The plant did not.',
    layers: ['family'],
    ownerByYear: { 1998: 'Hélène Marchand', 2018: 'Noor Haddad, unofficially', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'By the Window', 2018: 'By the Window', 2026: 'By the Window' },
    storyByYear: {
      1998: 'Hélène placed it near the brightest window and turned the pot a quarter every week, so it would grow straight.',
      2018: 'After Hélène died, the Marchands left it behind because it had grown too large to carry down the stairs. The tenants never agreed whose job it was. Noor watered it anyway.',
      2026: 'The only resident that never moved out. It has outlived three households in the same square metre of floor, and Lina is leaving it where it stands.',
    },
  },
  {
    id: 'box',
    name: 'Moving Box',
    summary: 'The residents change. The same kind of box keeps coming back.',
    layers: ['current'],
    ownerByYear: { 1998: 'Antoine and Sophie', 2018: 'Tomás Rey', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Bedroom', 2018: 'Hallway', 2026: 'Living Room' },
    storyByYear: {
      1998: "The last box from Antoine and Sophie's move back in, never fully unpacked. The label is in Sophie's handwriting. When they divorced in 2004, neither of them came to claim it.",
      2018: 'Tomás arrived with four of these. Three were emptied in a day, and this one stayed in the hallway for a month, used as a table for keys and post.',
      2026: 'Lina has started packing, in the middle of the living room. The book went in first, and the box is still mostly empty.',
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
      1998: 'Left on until the last person was home, which was usually Antoine. From the street it was the signal that someone was still awake, and Hélène was always the one to turn it off.',
      2018: "Nobody owned a side table. It stood on the living-room floor and lit the room from below, which is how every one of Idris's photographs from those years is lit.",
      2026: 'Back on the mantelpiece, where it started. Lina says it will be the last thing unplugged on moving day.',
    },
  },
  {
    id: 'archive',
    name: 'Archive Box',
    summary: 'Photographs, letters and tickets. Each household added to it and none emptied it.',
    layers: ['family', 'current'],
    ownerByYear: { 1998: 'Hélène Marchand', 2018: 'Left by the Marchand family', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Bedroom Shelf', 2018: 'Bedroom Floor', 2026: 'Hallway' },
    storyByYear: {
      1998: "Paul's letters are at the bottom, under Antoine and Sophie's wedding photograph. Hélène kept it within reach of the bed, opened it on her anniversary, and closed it again the same evening.",
      2018: "Found at the back of a cupboard seven years after Hélène's death. Idris, Noor and Tomás read the letters once, put them back in order, and added a photograph of their own.",
      2026: 'Waiting in the hallway, by the door. It is the one box that will not go in the van: Lina has added a letter and is leaving it for whoever lives here next.',
    },
  },
]

export const OBJECTS: MemoryObject[] = entries.map((e) => ({ ...e, positionByYear: objectPositions[e.id] }))

export const objectById = (id: ObjectId) => OBJECTS.find((o) => o.id === id)!
