// ─────────────────────────────────────────────────────────────────────────
// Content and helpers for the couple games. Pools are intentionally large and
// shuffled per session so the games stay fresh and never feel repetitive.
// ─────────────────────────────────────────────────────────────────────────

export interface TwoChoice {
  id: string;
  a: string;
  b: string;
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** This or That: quick either/or picks, see how aligned you are. */
export const THIS_OR_THAT: TwoChoice[] = [
  { id: 'tt01', a: 'Beach', b: 'Mountains' },
  { id: 'tt02', a: 'Call', b: 'Text' },
  { id: 'tt03', a: 'Morning person', b: 'Night owl' },
  { id: 'tt04', a: 'Coffee', b: 'Tea' },
  { id: 'tt05', a: 'Movie night in', b: 'Night out' },
  { id: 'tt06', a: 'Sweet', b: 'Savoury' },
  { id: 'tt07', a: 'Plan everything', b: 'Go with the flow' },
  { id: 'tt08', a: 'Cats', b: 'Dogs' },
  { id: 'tt09', a: 'Big party', b: 'Just us two' },
  { id: 'tt10', a: 'Window seat', b: 'Aisle seat' },
  { id: 'tt11', a: 'Save it', b: 'Spend it' },
  { id: 'tt12', a: 'Spicy food', b: 'Mild food' },
  { id: 'tt13', a: 'Sunrise', b: 'Sunset' },
  { id: 'tt14', a: 'Books', b: 'Movies' },
  { id: 'tt15', a: 'Cook at home', b: 'Eat out' },
  { id: 'tt16', a: 'Texts all day', b: 'One long call' },
  { id: 'tt17', a: 'City', b: 'Countryside' },
  { id: 'tt18', a: 'Surprise me', b: 'Tell me the plan' },
  { id: 'tt19', a: 'Early to bed', b: 'Stay up late' },
  { id: 'tt20', a: 'Adventure trip', b: 'Relaxing trip' },
  { id: 'tt21', a: 'Comedy', b: 'Romance' },
  { id: 'tt22', a: 'Road trip', b: 'Flight' },
  { id: 'tt23', a: 'Hold hands', b: 'Arm around you' },
  { id: 'tt24', a: 'Breakfast in bed', b: 'Brunch out' },
  { id: 'tt25', a: 'Pizza', b: 'Pasta' },
  { id: 'tt26', a: 'Summer', b: 'Winter' },
  { id: 'tt27', a: 'Dancing', b: 'Singing' },
  { id: 'tt28', a: 'Board games', b: 'Video games' },
  { id: 'tt29', a: 'Pancakes', b: 'Waffles' },
  { id: 'tt30', a: 'Camping', b: 'Fancy hotel' },
  { id: 'tt31', a: 'Sneakers', b: 'Boots' },
  { id: 'tt32', a: 'Picnic', b: 'Fancy dinner' },
  { id: 'tt33', a: 'Stargazing', b: 'Sunbathing' },
  { id: 'tt34', a: 'Action', b: 'Rom-com' },
  { id: 'tt35', a: 'Long hugs', b: 'Quick kisses' },
  { id: 'tt36', a: 'Forehead kiss', b: 'Hand squeeze' },
  { id: 'tt37', a: 'Slow mornings', b: 'Early start' },
  { id: 'tt38', a: 'Spicy', b: 'Cheesy' },
  { id: 'tt39', a: 'Museum day', b: 'Theme park' },
  { id: 'tt40', a: 'Vinyl', b: 'Playlist' },
  { id: 'tt41', a: 'Tacos', b: 'Burgers' },
  { id: 'tt42', a: 'Mountain hike', b: 'Ocean swim' },
  { id: 'tt43', a: 'Pet names', b: 'Real names' },
  { id: 'tt44', a: 'Surprise trip', b: 'Planned trip' },
];

/** Would You Rather: playful dilemmas you both answer. */
export const WOULD_YOU_RATHER: TwoChoice[] = [
  { id: 'wyr01', a: 'Read minds', b: 'Teleport to me anytime' },
  { id: 'wyr02', a: 'Always know when I miss you', b: 'Always know when I am happy' },
  { id: 'wyr03', a: 'A week with no phones together', b: 'Unlimited video calls apart' },
  { id: 'wyr04', a: 'Relive our first date', b: 'Fast-forward to living together' },
  { id: 'wyr05', a: 'Same morning routine forever', b: 'A new adventure every day' },
  { id: 'wyr06', a: 'Cook every meal together', b: 'Travel somewhere new monthly' },
  { id: 'wyr07', a: 'Never argue but rarely deep talk', b: 'Argue sometimes but always honest' },
  { id: 'wyr08', a: 'A tiny home anywhere', b: 'A big home in one city' },
  { id: 'wyr09', a: 'Slow dance in the kitchen', b: 'Stargaze on the roof' },
  { id: 'wyr10', a: 'Handwritten letters', b: 'Daily voice notes' },
  { id: 'wyr11', a: 'Forever 25', b: 'Always know what happens next' },
  { id: 'wyr12', a: 'A pet we raise together', b: 'A garden we grow together' },
  { id: 'wyr13', a: 'Endless lazy Sundays', b: 'Endless date nights' },
  { id: 'wyr14', a: 'Sing badly together', b: 'Dance badly together' },
  { id: 'wyr15', a: 'One big trip a year', b: 'Many small weekends away' },
  { id: 'wyr16', a: 'Breakfast people', b: 'Midnight snack people' },
  { id: 'wyr17', a: 'Matching tattoos', b: 'A song that is ours' },
  { id: 'wyr18', a: 'Always be early together', b: 'Always be fashionably late' },
  { id: 'wyr19', a: 'Live by the sea', b: 'Live in the hills' },
  { id: 'wyr20', a: 'A surprise party for you', b: 'A quiet evening just us' },
  { id: 'wyr21', a: 'Every weekend together', b: 'Every evening together' },
  { id: 'wyr22', a: 'Always win the argument', b: 'Always get the hug after' },
  { id: 'wyr23', a: 'A home full of plants', b: 'A home full of books' },
  { id: 'wyr24', a: 'Breakfast dates', b: 'Midnight drives' },
  { id: 'wyr25', a: 'Travel the world a year', b: 'Build our dream home a year' },
  { id: 'wyr26', a: 'Same taste in music', b: 'Same taste in food' },
  { id: 'wyr27', a: 'A photo of every day apart', b: 'A letter for every day apart' },
  { id: 'wyr28', a: 'Relive our best day', b: 'Preview a best day to come' },
  { id: 'wyr29', a: 'Know what I am thinking', b: 'Know how I am feeling' },
  { id: 'wyr30', a: 'A weekend with no plans', b: 'A weekend planned to the minute' },
  { id: 'wyr31', a: 'Grow old by the sea', b: 'Grow old in the mountains' },
  { id: 'wyr32', a: 'A tiny private wedding', b: 'A huge celebration' },
  { id: 'wyr33', a: 'Dance in the rain', b: 'Nap in the sun' },
  { id: 'wyr34', a: 'First to say good morning', b: 'Last to say good night' },
  { id: 'wyr35', a: 'Share one big dream', b: 'Chase many small ones' },
  { id: 'wyr36', a: 'A kiss in the rain', b: 'A kiss under fireworks' },
];

export interface KnowMeQuestion {
  id: string;
  q: string;
  options: string[];
}

/** How Well Do You Know Me: answer about yourself; partner guesses. */
export const KNOW_ME: KnowMeQuestion[] = [
  { id: 'km01', q: 'My comfort food is', options: ['Pizza', 'Noodles', 'Chocolate', 'Home-cooked'] },
  { id: 'km02', q: 'My ideal weekend is', options: ['Cosy at home', 'Out exploring', 'With friends', 'Totally unplanned'] },
  { id: 'km03', q: 'I relax best by', options: ['Music', 'A nap', 'A walk', 'A good show'] },
  { id: 'km04', q: 'My love language is most', options: ['Words', 'Quality time', 'Touch', 'Little gifts'] },
  { id: 'km05', q: 'When stressed I want', options: ['Space', 'A hug', 'To talk it out', 'A distraction'] },
  { id: 'km06', q: 'My dream trip is', options: ['Beaches', 'Mountains', 'A big city', 'A road trip'] },
  { id: 'km07', q: 'My guilty pleasure is', options: ['Junk food', 'Reality TV', 'Online shopping', 'Sleeping in'] },
  { id: 'km08', q: 'I am happiest in the', options: ['Early morning', 'Afternoon', 'Evening', 'Late night'] },
  { id: 'km09', q: 'A perfect date for me is', options: ['Dinner out', 'Movie in', 'An adventure', 'A long walk'] },
  { id: 'km10', q: 'My biggest soft spot is', options: ['Cute animals', 'Old songs', 'Kind gestures', 'Good food'] },
  { id: 'km11', q: 'I would rather receive', options: ['A long letter', 'A surprise call', 'A small gift', 'A planned day out'] },
  { id: 'km12', q: 'My weakness is', options: ['Dessert', 'Saying yes', 'Procrastinating', 'Overthinking'] },
  { id: 'km13', q: 'On a lazy day I', options: ['Sleep in', 'Binge a show', 'Cook something', 'Go outside'] },
  { id: 'km14', q: 'I feel most loved when you', options: ['Tell me', 'Show up', 'Hold me', 'Surprise me'] },
  { id: 'km15', q: 'My happy place is', options: ['Home', 'Near water', 'In nature', 'Anywhere with you'] },
  { id: 'km16', q: 'My karaoke vibe is', options: ['Pop anthem', 'Sappy ballad', 'Hip-hop', 'I refuse to sing'] },
  { id: 'km17', q: 'My Sunday morning is', options: ['Sleep till noon', 'A workout', 'Big breakfast', 'A long walk'] },
  { id: 'km18', q: 'The gift that melts me', options: ['Flowers', 'A playlist', 'Something handmade', 'A surprise plan'] },
  { id: 'km19', q: 'My comfort show is a', options: ['Sitcom', 'Crime drama', 'Anime', 'Reality show'] },
  { id: 'km20', q: 'My travel style is', options: ['Wing it', 'Plan it all', 'Slow and luxe', 'Follow the food'] },
  { id: 'km21', q: 'When I go quiet I am', options: ['Tired', 'Overthinking', 'Content', 'Needing a hug'] },
  { id: 'km22', q: 'My happy weather is', options: ['Rainy and cosy', 'Sunny and warm', 'Snowy', 'Crisp autumn'] },
  { id: 'km23', q: 'My phone is mostly', options: ['Photos', 'Memes', 'Notes and lists', 'Open tabs'] },
  { id: 'km24', q: 'The way to my heart', options: ['Feed me', 'Make me laugh', 'Surprise me', 'Just show up'] },
];

// ── Tic-Tac-Toe helpers ────────────────────────────────────────────────
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export type TttResult = 'X' | 'O' | 'draw' | null;

/** Winner ('X'/'O'), 'draw', or null if the game is still going. */
export function tttWinner(board: string): TttResult {
  for (const [a, b, c] of LINES) {
    if (board[a] !== '-' && board[a] === board[b] && board[b] === board[c]) {
      return board[a] as 'X' | 'O';
    }
  }
  return board.includes('-') ? null : 'draw';
}

/** The three winning cell indices, for highlighting, or null. */
export function tttWinningLine(board: string): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] !== '-' && board[a] === board[b] && board[b] === board[c]) return line;
  }
  return null;
}

export const EMPTY_BOARD = '---------';
