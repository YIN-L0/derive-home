import type { ObjectId, Year } from '../config/scene'

// The people who lived in the home, shown as buttons in the RESIDENTS panel.
// `objects` are the things this person owned, used or left behind in their year.
export interface Person {
  id: string
  name: string
  role: string
  year: Year
  bio: string
  fate?: string // what became of them: died, divorced
  objects: ObjectId[]
}

export const PEOPLE: Person[] = [
  {
    id: 'helene',
    name: 'Hélène Marchand',
    role: 'Grandmother',
    year: 1998,
    bio: 'Lived here for thirty-one years. Read on trains, cooked for other people, and was always the last one awake.',
    fate: 'Died 2011',
    objects: ['book', 'mug', 'notebook', 'camera', 'record', 'plant', 'lamp', 'archive'],
  },
  {
    id: 'paul',
    name: 'Paul Marchand',
    role: "Hélène's husband",
    year: 1998,
    bio: 'Gone two years by 1998, and still in every room: his record on the shelf, his letters in the box, his name in the recipes.',
    fate: 'Died 1996',
    objects: ['record', 'archive', 'notebook'],
  },
  {
    id: 'antoine',
    name: 'Antoine Marchand',
    role: "Hélène's son",
    year: 1998,
    bio: 'Moved back in with Sophie and Camille that year. Came home latest, to a lamp left on for him.',
    fate: 'Divorced from Sophie, 2004',
    objects: ['box', 'lamp', 'camera', 'archive'],
  },
  {
    id: 'sophie',
    name: 'Sophie Laurent',
    role: "Antoine's wife",
    year: 1998,
    bio: 'Packed the boxes and labelled every one. Her handwriting is still on the one that was never opened.',
    fate: 'Divorced from Antoine, 2004',
    objects: ['box', 'camera', 'archive'],
  },
  {
    id: 'camille',
    name: 'Camille Marchand',
    role: 'Daughter of Antoine and Sophie',
    year: 1998,
    bio: 'Seven years old in 1998, and learning to dance in the hallway. Most of the photographs in the archive box are of Camille.',
    objects: ['notebook', 'camera', 'record', 'archive'],
  },
  {
    id: 'idris',
    name: 'Idris Bello',
    role: 'Tenant',
    year: 2018,
    bio: 'The first tenant to move in. Found the camera in a cupboard and photographed the street, one frame a week.',
    objects: ['camera', 'book', 'lamp', 'archive'],
  },
  {
    id: 'noor',
    name: 'Noor Haddad',
    role: 'Tenant',
    year: 2018,
    bio: 'Cooked from the recipe notebook on Sundays and kept the plant alive without ever admitting it.',
    objects: ['notebook', 'plant', 'mug', 'book', 'archive'],
  },
  {
    id: 'tomas',
    name: 'Tomás Rey',
    role: 'Tenant',
    year: 2018,
    bio: 'Arrived with four boxes and a turntable. Responsible for the scratch on side B.',
    objects: ['record', 'box', 'book', 'archive'],
  },
  {
    id: 'lina',
    name: 'Lina Zhou',
    role: 'Current resident',
    year: 2026,
    bio: 'Works from the bedroom and is moving out this month. Packing slowly, and photographing every room first.',
    objects: ['book', 'mug', 'notebook', 'camera', 'record', 'plant', 'box', 'lamp', 'archive'],
  },
]
