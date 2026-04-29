/*
 * Random whimsical visitor name generator.
 * Produces names like "flower dreamer", "starlit inkwell", etc.
 */

const adjectives = [
  "flower","lovely","quiet","sunlit","midnight","tender","amber","wandering",
  "linen","paper","salt","honey","velvet","morning","rainy","violet","small",
  "soft","cozy","plum","peach","maple","ginger","cinnamon","clover","dewy",
  "mossy","starlit","moonlit","drowsy","hazel","mulberry","sleepy","pearl",
  "cloudy","misty","lavender","saffron","almond","chestnut","fern","lemon",
  "apricot","golden","silver","rosy","little","merry","hushed","wistful",
  "opal","rosewater","willow","juniper","marigold","buttery","woolen",
  "candlelit","drifting","parchment","coral","frosted","blushing","twilight",
  "cedar","sage","dusky","silken","thistle","porcelain","meadow","heather",
  "birch","ivy","nutmeg","cardamom","cocoa","vanilla","primrose","jasmine",
  "indigo","scarlet","dappled",
] as const;

const nouns = [
  "dreamer","philosophist","wanderer","letter","atlas","cartographer","ember",
  "harbor","draft","songbird","tide","thinker","sketcher","almanac","compass",
  "lantern","weaver","bookmark","figure","starling","poet","reverie","lullaby",
  "keeper","goblin","fairy","pixie","owlet","nightingale","sparrow","swallow",
  "firefly","dragonfly","botanist","daydreamer","stargazer","moonchild",
  "storyteller","locket","orchid","peony","grove","queen","scribe","moth",
  "petal","acorn","thimble","candle","quill","teacup","trinket","riddle",
  "fable","mirage","crescent","meadowlark","finch","wren","heron",
  "lamplighter","wayfarer","inkwell",
] as const;

const BLOCKED = new Set(["pearl harbor"]);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateVisitorName(): string {
  for (let i = 0; i < 10; i++) {
    const name = `${pick(adjectives)} ${pick(nouns)}`;
    if (!BLOCKED.has(name)) return name;
  }
  return "flower dreamer";
}
