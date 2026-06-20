// ─────────────────────────────────────────────────────────────────────────
// Content and helpers for the little couple games on the Home screen.
// ─────────────────────────────────────────────────────────────────────────

export interface TwoChoice {
  id: string;
  a: string;
  b: string;
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
];

export interface KnowMeQuestion {
  id: string;
  q: string;
  options: string[];
}

/** How Well Do You Know Me: answer about yourself; partner guesses. */
export const KNOW_ME: KnowMeQuestion[] = [
  { id: 'km01', q: 'My comfort food is', options: ['Pizza', 'Noodles', 'Chocolate', 'Something home-cooked'] },
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

export const EMPTY_BOARD = '---------';
