import type { MemoryAnalysis } from './types'

// Ready-made memories for showing the feature. Picking one types the text in and sends it
// to the model like any other memory. `analysis` is what the model answered when the example
// was recorded; it is used only if the live request fails, and the dialog says so.
export const EXAMPLES: { label: string; text: string; analysis: MemoryAnalysis }[] = [
  {
    "label": "Blue kettle",
    "text": "In the winter of 2009 my mother kept a blue enamel kettle beside the stove. The night the power went out she boiled water on a camping burner, and we all drank tea on the living-room rug by candlelight.",
    "analysis": {
      "language": "en",
      "title": "Blue enamel kettle",
      "object": {
        "name": "blue enamel kettle",
        "description": "A blue enamel tea kettle kept beside the kitchen stove.",
        "shape": "vessel",
        "color": "#1f4ea3",
        "sizeCm": 20
      },
      "time": {
        "year": 2009,
        "text": "Winter 2009",
        "certainty": "exact"
      },
      "layer": 1998,
      "place": {
        "spotId": "stove",
        "text": "beside the stove"
      },
      "people": [
        "my mother",
        "we all"
      ],
      "event": "When the power went out the kettle's water was boiled on a camping burner and everyone drank tea on the living-room rug by candlelight.",
      "feeling": "quiet warmth",
      "story": "In winter 2009 the resident's mother kept a blue enamel kettle beside the stove. The night the power went out she boiled water on a camping burner and the household drank tea together on the living-room rug by candlelight. The moment is recalled for its small, shared calm.",
      "parallel": "In a parallel universe the power never went out and the kettle remained unused on the stove.",
      "quotes": {
        "time": "the winter of 2009",
        "object": "a blue enamel kettle",
        "place": "beside the stove",
        "people": "my mother"
      },
      "followUp": null
    }
  },
  {
    "label": "Transistor radio",
    "text": "My grandfather had a small red transistor radio on the bookshelf in the bedroom. Every evening around 1999 he listened to the football results on it, and nobody was allowed to speak.",
    "analysis": {
      "language": "en",
      "title": "Grandfather's radio",
      "object": {
        "name": "transistor radio",
        "description": "A small red transistor radio that sat on a bedroom bookshelf.",
        "shape": "box",
        "color": "#cc0000",
        "sizeCm": 20
      },
      "time": {
        "year": 1999,
        "text": "Every evening around 1999",
        "certainty": "approximate"
      },
      "layer": 1998,
      "place": {
        "spotId": "bookshelf",
        "text": "on the bookshelf in the bedroom"
      },
      "people": [
        "My grandfather"
      ],
      "event": "He listened to the football results on the radio every evening while nobody was allowed to speak.",
      "feeling": "solemn quiet",
      "story": "Every evening around 1999, the grandfather placed a small red transistor radio on the bedroom bookshelf and listened to the football results. The household observed silence during the broadcast; nobody was allowed to speak. The radio marked a disciplined, nightly ritual.",
      "parallel": "In a parallel universe the family talked and laughed during the broadcast and the radio was just background noise.",
      "quotes": {
        "time": "around 1999",
        "object": "small red transistor radio",
        "place": "bookshelf in the bedroom",
        "people": "My grandfather"
      },
      "followUp": null
    }
  },
  {
    "label": "Polaroid",
    "text": "In the summer of 2019 one of my roommates left a white Polaroid camera on the mantelpiece. On our last night before moving out, the four of us took one photo in front of the sofa, and it stayed tucked under that camera for years.",
    "analysis": {
      "language": "en",
      "title": "White Polaroid Camera",
      "object": {
        "name": "white Polaroid camera",
        "description": "A small white instant film camera that was left on the fireplace mantel; a single Polaroid print was kept tucked under it for years.",
        "shape": "box",
        "color": "#ffffff",
        "sizeCm": 12
      },
      "time": {
        "year": 2019,
        "text": "Summer 2019",
        "certainty": "approximate"
      },
      "layer": 2018,
      "place": {
        "spotId": "mantle",
        "text": "on the mantelpiece"
      },
      "people": [
        "one of my roommates",
        "the four of us"
      ],
      "event": "One roommate left a white Polaroid camera on the mantelpiece; on the last night before moving out the four roommates took a single photo in front of the sofa, which remained tucked under the camera for years.",
      "feeling": "nostalgic",
      "story": "In the summer of 2019 a white Polaroid camera was left on the fireplace mantel by one of the roommates. On the last night before they moved out, the four of them took a single photo in front of the sofa and kept that print tucked beneath the camera. The camera and the photograph remained on the mantelpiece for years.",
      "parallel": "In a parallel universe the camera was packed with moving boxes and the photograph was pinned to the living-room wall instead of staying beneath the camera.",
      "quotes": {
        "time": "summer of 2019",
        "object": "white Polaroid camera",
        "place": "mantelpiece",
        "people": "the four of us"
      },
      "followUp": null
    }
  },
  {
    "label": "Cello",
    "text": "In the spring of 2003 my sister's black cello case always leaned by the glass door to the balcony. She practised there every morning before school, facing the water, and the neighbours never once complained.",
    "analysis": {
      "language": "en",
      "title": "Cello case by door",
      "object": {
        "name": "black cello case",
        "description": "A tall, black cello case that leaned against the glass door to the balcony.",
        "shape": "tall",
        "color": "#000000",
        "sizeCm": 90
      },
      "time": {
        "year": 2003,
        "text": "Spring 2003",
        "certainty": "exact"
      },
      "layer": 1998,
      "place": {
        "spotId": "window",
        "text": "by the glass door to the balcony"
      },
      "people": [
        "my sister"
      ],
      "event": "The black cello case leaned by the glass door to the balcony while she practised every morning before school facing the water and the neighbours never once complained.",
      "feeling": "quiet acceptance",
      "story": "In spring 2003 the resident's sister left a black cello case leaning against the glass door to the balcony. She practised there every morning before school, facing the water. The neighbours never once complained.",
      "parallel": "In a parallel universe the neighbours asked her to move her practice to another room and the case was stored elsewhere in the apartment.",
      "quotes": {
        "time": "spring of 2003",
        "object": "black cello case",
        "place": "by the glass door to the balcony",
        "people": "my sister"
      },
      "followUp": null
    }
  },
  {
    "label": "Dumpling pot",
    "text": "New Year's Eve 2018. We had no table yet, so six of us sat on the hallway floor around a dented steel pot of dumplings and ate straight from it with one pair of chopsticks too few.",
    "analysis": {
      "language": "en",
      "title": "Dumpling pot",
      "object": {
        "name": "dented steel pot of dumplings",
        "description": "A dented steel cooking pot filled with dumplings, served communally.",
        "shape": "vessel",
        "color": "#9aa0a6",
        "sizeCm": 30
      },
      "time": {
        "year": 2018,
        "text": "New Year's Eve 2018",
        "certainty": "exact"
      },
      "layer": 2018,
      "place": {
        "spotId": "hall",
        "text": "hallway floor"
      },
      "people": [
        "six of us"
      ],
      "event": "Six people sat on the hallway floor around a dented steel pot of dumplings and ate straight from it with one pair of chopsticks too few.",
      "feeling": "close, improvised",
      "story": "On New Year's Eve 2018, six people sat on the hallway floor and ate dumplings from a dented steel pot. There was no table yet, so they passed the pot between them and managed with one pair of chopsticks too few. The moment was practical and intimate.",
      "parallel": "In a parallel universe they had a table and enough chopsticks, so everyone ate from individual bowls instead of from the single dented pot.",
      "quotes": {
        "time": "New Year's Eve 2018",
        "object": "a dented steel pot of dumplings",
        "place": "hallway floor",
        "people": "six of us"
      },
      "followUp": null
    }
  },
  {
    "label": "Tennis ball",
    "text": "Last month I found a faded yellow tennis ball under the sofa. It must have belonged to the dog of the people who lived here before me. I left it on the rug, in case it is still being looked for.",
    "analysis": {
      "language": "en",
      "title": "Faded tennis ball",
      "object": {
        "name": "tennis ball",
        "description": "A worn, faded yellow tennis ball with the look of something chewed or trailed under furniture.",
        "shape": "sphere",
        "color": "#d9c46a",
        "sizeCm": 7
      },
      "time": {
        "year": 2026,
        "text": "Last month (September 2026)",
        "certainty": "approximate"
      },
      "layer": 2026,
      "place": {
        "spotId": "rug",
        "text": "Found under the sofa; left on the rug."
      },
      "people": [
        "the people who lived here before me"
      ],
      "event": "Found a faded yellow tennis ball under the sofa and left it on the rug because it likely belonged to the previous residents' dog.",
      "feeling": "thoughtful",
      "story": "The resident found a faded yellow tennis ball under the living-room sofa. Believing it belonged to the people who lived there before, they left it on the rug in case someone was still looking for it. The ball shows wear consistent with having belonged to a dog and having been hidden under furniture.",
      "parallel": "In a parallel universe the ball was returned to the previous residents' dog and left in its bowl by the door.",
      "quotes": {
        "time": "Last month",
        "object": "faded yellow tennis ball",
        "place": "under the sofa",
        "people": "the people who lived here before me"
      },
      "followUp": null
    }
  }
]
