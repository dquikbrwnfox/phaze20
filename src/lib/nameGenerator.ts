const ADJECTIVES = [
  "Sneaky", "Jazzy", "Wobbly", "Grumpy", "Bouncy", "Spooky", "Cheeky",
  "Fluffy", "Zippy", "Dizzy", "Sassy", "Jumpy", "Sleepy", "Goofy",
  "Wiggly", "Clumsy", "Peppy", "Zesty", "Funky", "Quirky", "Wacky",
  "Puffy", "Slinky", "Grouchy", "Perky", "Dopey", "Nifty", "Snazzy",
];

const ANIMALS = [
  "Otter", "Penguin", "Capybara", "Axolotl", "Quokka", "Platypus",
  "Blobfish", "Narwhal", "Wombat", "Meerkat", "Pangolin", "Tapir",
  "Numbat", "Binturong", "Kinkajou", "Fossa", "Okapi", "Dugong",
  "Mantaray", "Frogfish", "Mudskipper", "Blobfish", "Tarsier", "Pika",
];

export function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}
