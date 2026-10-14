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
  {
    id: 'radio',
    name: 'Kitchen Radio',
    summary: 'Tuned by three households to three different stations.',
    layers: ['family', 'tenants'],
    ownerByYear: { ...OWNERS, 2018: 'Idris Bello' },
    locationByYear: { 1998: 'Kitchen Counter by the Stove', 2018: 'Desk, Second Bedroom', 2026: 'Kitchen Counter' },
    storyByYear: {
      1998: 'It stood beside the stove and played the news at seven while Hélène cooked. Paul had set the dial, and after he died nobody in the family touched it.',
      2018: 'Idris carried it to the desk in the second bedroom and found a jazz station. It was the first time in twenty years that the dial had moved.',
      2026: 'Back in the kitchen, on the far counter. Lina listens to the morning forecast on it, and has not yet decided whether it is going in a box.',
    },
  },
  {
    id: 'umbrella',
    name: 'The Umbrella',
    summary: 'Nobody remembers buying it. Everybody has taken it out in the rain.',
    layers: ['tenants', 'current'],
    ownerByYear: { 1998: 'Antoine Marchand', 2018: 'Whoever left last', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'By the Front Door', 2018: 'Second Bedroom Doorway', 2026: 'By the Front Door' },
    storyByYear: {
      1998: 'Antoine left it by the front door every evening, still wet. Hélène moved it onto a newspaper every night without mentioning it.',
      2018: 'The tenants shared it without ever agreeing to. That year it mostly leaned in the doorway of the second bedroom, where Tomás dropped it on the way in.',
      2026: 'By the front door again. Lina found a name inked inside the handle, too faded to read, and takes it out anyway.',
    },
  },
  {
    id: 'candle',
    name: 'Brass Candlestick',
    summary: 'Lit for dinners, then for power cuts, then for no reason at all.',
    layers: ['family'],
    ownerByYear: { 1998: 'Hélène Marchand', 2018: 'Noor Haddad', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Dining Table', 2018: 'Kitchen Counter', 2026: 'Dining Table' },
    storyByYear: {
      1998: 'One of a pair, a wedding present to Hélène and Paul. It was lit on Sundays, when all five of them ate at the dining table, and Camille was allowed to blow it out.',
      2018: 'The other one of the pair was gone by then. Noor kept this one on the kitchen counter with a box of matches, for the nights the fuse went.',
      2026: 'Lina put it back on the dining table. It is lit most evenings now, among the packing lists.',
    },
  },
  {
    id: 'suitcase',
    name: 'The Suitcase',
    summary: 'It arrived with one family and has been about to leave ever since.',
    layers: ['family', 'current'],
    ownerByYear: { 1998: 'Sophie Laurent', 2018: 'Left by the Marchand family', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Second Bedroom Floor', 2018: 'Hallway', 2026: 'Second Bedroom, by the Window' },
    storyByYear: {
      1998: "Sophie's suitcase, on the floor of the second bedroom where she, Antoine and Camille slept. She unpacked everything else that year and left this half full.",
      2018: 'It was still here when the tenants came, empty except for a luggage tag. It stood in the hallway by the door, and Tomás borrowed it twice.',
      2026: 'Open under the window in the second bedroom. Lina is filling it with the things that will not go in boxes.',
    },
  },
  {
    id: 'typewriter',
    name: 'The Typewriter',
    summary: 'Too heavy to move, so every household wrote at the same desk.',
    layers: ['family', 'tenants'],
    ownerByYear: { 1998: 'Paul Marchand, kept by Hélène', 2018: 'Left by the Marchand family', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Desk, Second Bedroom', 2018: 'Desk, Second Bedroom', 2026: 'Desk, Second Bedroom' },
    storyByYear: {
      1998: "Paul wrote his letters on it, the ones now at the bottom of the archive box. In 1998 it still held a sheet with a date and nothing else, and Antoine worked around it.",
      2018: 'Noor typed the house rules on it as a joke and pinned them to the fridge. The ribbon was nearly dry, so the rules came out pale grey.',
      2026: "Lina typed the letter for the next resident on it, slowly, with two fingers. It is staying on the desk: it was never anybody's to take.",
    },
    foundInside: {
      name: 'Unfinished Page',
      detail: ['A sheet was still in the roller.', '“Lyon, 3 March 1996”', 'Nothing below the date.'],
    },
  },
  {
    id: 'quilt',
    name: 'The Quilt',
    summary: 'Folded at the foot of whichever bed was coldest.',
    layers: ['family', 'tenants', 'current'],
    ownerByYear: { 1998: 'Hélène Marchand', 2018: 'Tomás Rey', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Bed, Main Bedroom', 2018: 'Bed, Second Bedroom', 2026: 'Bed, Main Bedroom' },
    storyByYear: {
      1998: "Hélène's mother made it. It lay folded on Hélène's bed all year, and on winter mornings Camille was found underneath it.",
      2018: 'Tomás had the second bedroom, the one with the draught, and took the quilt from the cupboard in the first week. Nobody objected.',
      2026: 'Back on the bed in the main bedroom. Lina has mended one corner in a thread that does not match, and says that is the point.',
    },
  },
  {
    id: 'bottle',
    name: 'Perfume Bottle',
    summary: 'Almost empty for twenty-eight years.',
    layers: ['family'],
    ownerByYear: { 1998: 'Hélène Marchand', 2018: 'Nobody in particular', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Bathroom Vanity', 2018: 'Bathroom Vanity', 2026: 'Second Bathroom Counter' },
    storyByYear: {
      1998: 'Between the two basins, on the side that had been Paul’s. He gave it to Hélène in 1989, and by 1998 she wore it only on their anniversary.',
      2018: 'None of the tenants threw it away and none of them could say why. It stayed between the basins while everything around it changed brand.',
      2026: 'Lina moved it to the second bathroom while clearing the cabinets. There is a little left, and it still smells of the hallway in winter.',
    },
  },
  {
    id: 'wateringcan',
    name: 'Watering Can',
    summary: 'It kept the balcony alive, and through the glass door, the plant.',
    layers: ['family', 'tenants'],
    ownerByYear: { 1998: 'Hélène Marchand', 2018: 'Noor Haddad, unofficially', 2026: 'Lina Zhou' },
    locationByYear: { 1998: 'Balcony', 2018: 'Balcony', 2026: 'Balcony Corner' },
    storyByYear: {
      1998: 'Kept on the balcony, filled the night before so the water was never cold. Hélène watered the geraniums first and the plant by the window last.',
      2018: 'The geraniums did not survive the first summer of the tenancy. Noor kept using the can for the plant indoors and left it outside where it had always been.',
      2026: 'Lina has pushed it into the corner of the balcony, full, with a note under it for whoever comes next: once a week, a quarter turn.',
    },
  },
]

export const OBJECTS: MemoryObject[] = entries.map((e) => ({ ...e, positionByYear: objectPositions[e.id] }))

export const objectById = (id: ObjectId) => OBJECTS.find((o) => o.id === id)!
