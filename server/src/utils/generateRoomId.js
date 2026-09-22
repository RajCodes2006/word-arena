const ROOM_WORDS = [
  'BARK', 'BEAR', 'BIRD', 'BOOK', 'CATS', 'COLT', 'CORN', 'CUBE',
  'DASH', 'DEER', 'DOGS', 'DOVE', 'DUCK', 'ECHO', 'FIRE', 'FISH',
  'FROG', 'GAME', 'GLOW', 'GOAT', 'HARE', 'HAWK', 'JUMP', 'LAMB',
  'LION', 'LUSH', 'MINT', 'MOON', 'MULE', 'NEST', 'NOVA', 'OWLS',
  'PINE', 'PLAY', 'PONY', 'RAIN', 'ROCK', 'ROSE', 'SAND', 'SEAL',
  'SHIP', 'SNOW', 'SOCK', 'STAR', 'SWAN', 'TIDE', 'TREE', 'WAVE',
  'WOLF', 'WOOD', 'WORD', 'YARN', 'ZEST', 'ABLE', 'ACID', 'ARCH',
  'AREA', 'ARMY', 'ATOM', 'AURA', 'AXIS', 'BABY', 'BACK', 'BAND',
  'BANK', 'BASE', 'BATH', 'BIKE', 'BOND', 'BONE', 'BOWL', 'BRIM',
  'BUZZ', 'CAFE', 'CAMP', 'CARD', 'CARE', 'CAVE', 'CHAT', 'CHEF',
  'CHIP', 'CITY', 'CLAY', 'CLIP', 'COLD', 'COST', 'CREW', 'CROWN',
  'DICE', 'DOME', 'DUST', 'EAST', 'EDGE', 'EGGS', 'ELSE', 'EXIT',
  'FACE', 'FACT', 'FARM', 'FAST', 'FINE', 'FIRE', 'FLAG', 'FLAT',
  'FLOW', 'FOAM', 'FOOD', 'FORK', 'FORM', 'FORT', 'FUEL', 'GATE',
  'GIFT', 'GIRL', 'GOLD', 'GRIT', 'HAND', 'HERO', 'HILL', 'HOME',
  'HOPE', 'HOST', 'HUNT', 'IDEA', 'IRON', 'ISLE', 'JAZZ', 'JOKE',
  'KING', 'KITE', 'LAKE', 'LANE', 'LAST', 'LAVA', 'LEAF', 'LIME',
  'LINE', 'LINK', 'LOCK', 'LORD', 'LOVE', 'LUCK', 'MARK', 'MASK',
  'MATE', 'MEAL', 'MESH', 'MILD', 'MIST', 'MOVE', 'MUSIC', 'MYTH',
  'NAME', 'NEON', 'NICE', 'NOTE', 'OCEAN', 'OPEN', 'PACK', 'PAGE',
  'PARK', 'PATH', 'PEAK', 'PEAR', 'PINK', 'POND', 'PORT', 'QUIZ',
  'RACE', 'READ', 'REEL', 'RING', 'RISE', 'ROAD', 'ROAR', 'ROOF',
  'ROOT', 'SAGE', 'SAFE', 'SAIL', 'SALT', 'SAME', 'SCORE', 'SEED',
  'SHOE', 'SHOP', 'SILK', 'SING', 'SKY?'
];

export function generateRoomId() {
  const word = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
  return word;
}
