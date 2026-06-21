// Daily Wordle: a shared 5-letter word per calendar day, plus guess scoring.
import { ISODate } from '../types/models';

// A large pool of friendly 5-letter words. Any accidental non-5-letter entry is
// filtered out (and duplicates removed) at runtime, so the daily pick is always
// exactly five letters. The pool is well over 730 words, so the word of the day
// does not repeat for more than two years.
const RAW = [
  'ABACK', 'ABASE', 'ABATE', 'ABBEY', 'ABBOT', 'ABHOR', 'ABIDE', 'ABODE', 'ABORT', 'ABOUT',
  'ABOVE', 'ABUSE', 'ABYSS', 'ACORN', 'ACRID', 'ACTOR', 'ACUTE', 'ADAGE', 'ADAPT', 'ADEPT',
  'ADMIN', 'ADMIT', 'ADOBE', 'ADOPT', 'ADORE', 'ADORN', 'ADULT', 'AFFIX', 'AFIRE', 'AFOOT',
  'AFTER', 'AGAIN', 'AGAPE', 'AGATE', 'AGENT', 'AGILE', 'AGING', 'AGLOW', 'AGONY', 'AGREE',
  'AHEAD', 'AIDED', 'AISLE', 'ALARM', 'ALBUM', 'ALERT', 'ALGAE', 'ALIBI', 'ALIEN', 'ALIGN',
  'ALIKE', 'ALIVE', 'ALLAY', 'ALLEY', 'ALLOT', 'ALLOW', 'ALLOY', 'ALOFT', 'ALOHA', 'ALONE',
  'ALONG', 'ALOOF', 'ALOUD', 'ALPHA', 'ALTAR', 'ALTER', 'AMASS', 'AMAZE', 'AMBER', 'AMBLE',
  'AMEND', 'AMIGO', 'AMISS', 'AMITY', 'AMONG', 'AMPLE', 'AMPLY', 'AMUSE', 'ANGEL', 'ANGER',
  'ANGLE', 'ANGRY', 'ANGST', 'ANIME', 'ANKLE', 'ANNEX', 'ANNOY', 'ANNUL', 'ANTIC', 'ANVIL',
  'AORTA', 'APART', 'APHID', 'APING', 'APNEA', 'APPLE', 'APPLY', 'APRON', 'APTLY', 'ARBOR',
  'ARDOR', 'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'AROMA', 'AROSE', 'ARRAY', 'ARROW', 'ARSON',
  'ARTSY', 'ASIDE', 'ASKED', 'ASKEW', 'ASSAY', 'ASSET', 'ATOLL', 'ATONE', 'ATTIC', 'AUDIO',
  'AUDIT', 'AUGUR', 'AUNTY', 'AVAIL', 'AVERT', 'AVIAN', 'AVOID', 'AWAIT', 'AWAKE', 'AWARD',
  'AWARE', 'AWASH', 'AWFUL', 'AWOKE', 'AXIAL', 'AXIOM', 'AZURE', 'BACON', 'BADGE', 'BADLY',
  'BAGEL', 'BAKER', 'BALMY', 'BANJO', 'BARGE', 'BARON', 'BASIC', 'BASIL', 'BASIN', 'BASIS',
  'BATCH', 'BATHE', 'BATON', 'BAYOU', 'BEACH', 'BEADY', 'BEARD', 'BEAST', 'BEECH', 'BEEFY',
  'BEGAN', 'BEGIN', 'BEGUN', 'BEING', 'BELLE', 'BELLY', 'BELOW', 'BENCH', 'BERRY', 'BERTH',
  'BESET', 'BIRCH', 'BIRTH', 'BISON', 'BLACK', 'BLADE', 'BLAME', 'BLAND', 'BLANK', 'BLARE',
  'BLAST', 'BLAZE', 'BLEAK', 'BLEED', 'BLEND', 'BLESS', 'BLIMP', 'BLIND', 'BLINK', 'BLISS',
  'BLOAT', 'BLOCK', 'BLOKE', 'BLOND', 'BLOOD', 'BLOOM', 'BLOWN', 'BLUFF', 'BLUNT', 'BLURB',
  'BLURT', 'BLUSH', 'BOARD', 'BOAST', 'BOOST', 'BOOTH', 'BOOTY', 'BOOZE', 'BORAX', 'BORNE',
  'BOSOM', 'BOSSY', 'BOTCH', 'BOUGH', 'BOUND', 'BOWEL', 'BOXER', 'BRACE', 'BRAID', 'BRAIN',
  'BRAKE', 'BRAND', 'BRASH', 'BRASS', 'BRAVE', 'BRAVO', 'BRAWL', 'BRAWN', 'BREAD', 'BREAK',
  'BREED', 'BRIBE', 'BRICK', 'BRIDE', 'BRIEF', 'BRINE', 'BRING', 'BRINK', 'BRISK', 'BROAD',
  'BROIL', 'BROKE', 'BROOD', 'BROOK', 'BROOM', 'BROTH', 'BROWN', 'BRUNT', 'BRUSH', 'BRUTE',
  'BUDDY', 'BUDGE', 'BUGGY', 'BUILD', 'BUILT', 'BULGE', 'BULKY', 'BUNCH', 'BURLY', 'BURNT',
  'BURST', 'BUYER', 'CABIN', 'CABLE', 'CACAO', 'CACHE', 'CADET', 'CAGEY', 'CAMEL', 'CAMEO',
  'CANAL', 'CANDY', 'CANOE', 'CAPER', 'CARAT', 'CARGO', 'CAROL', 'CARRY', 'CARVE', 'CATCH',
  'CATER', 'CAULK', 'CAUSE', 'CAVIL', 'CEASE', 'CEDAR', 'CELLO', 'CHAFE', 'CHAIN', 'CHAIR',
  'CHALK', 'CHAMP', 'CHANT', 'CHAOS', 'CHARD', 'CHARM', 'CHART', 'CHASE', 'CHASM', 'CHEAP',
  'CHEAT', 'CHECK', 'CHEEK', 'CHEER', 'CHESS', 'CHEST', 'CHEWY', 'CHICK', 'CHIDE', 'CHIEF',
  'CHILD', 'CHILI', 'CHILL', 'CHIME', 'CHINA', 'CHIRP', 'CHOCK', 'CHOIR', 'CHOKE', 'CHORD',
  'CHORE', 'CHOSE', 'CHUCK', 'CHUNK', 'CHURN', 'CHUTE', 'CIDER', 'CIGAR', 'CINCH', 'CIVIC',
  'CIVIL', 'CLACK', 'CLAIM', 'CLAMP', 'CLANG', 'CLANK', 'CLASH', 'CLASP', 'CLASS', 'CLEAN',
  'CLEAR', 'CLEAT', 'CLEFT', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB', 'CLING', 'CLINK', 'CLOAK',
  'CLOCK', 'CLONE', 'CLOSE', 'CLOTH', 'CLOUD', 'CLOUT', 'CLOVE', 'CLOWN', 'CLUCK', 'CLUMP',
  'CLUNG', 'COACH', 'COAST', 'COBRA', 'COCOA', 'COLON', 'COLOR', 'COMET', 'COMFY', 'COMIC',
  'CORAL', 'CORNY', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COURT', 'COVEN', 'COVER', 'COVET',
  'COWER', 'COYLY', 'CRACK', 'CRAFT', 'CRAMP', 'CRANE', 'CRANK', 'CRASH', 'CRASS', 'CRATE',
  'CRAVE', 'CRAWL', 'CRAZE', 'CRAZY', 'CREAK', 'CREAM', 'CREDO', 'CREED', 'CREEK', 'CREPT',
  'CREST', 'CRICK', 'CRIED', 'CRIME', 'CRIMP', 'CRISP', 'CROAK', 'CROCK', 'CRONE', 'CRONY',
  'CROOK', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CRUEL', 'CRUMB', 'CRUSH', 'CRUST', 'CRYPT',
  'CUBIC', 'CUMIN', 'CURIO', 'CURLY', 'CURRY', 'CURSE', 'CURVE', 'CURVY', 'CYCLE', 'CYNIC',
  'DAILY', 'DAIRY', 'DAISY', 'DALLY', 'DANCE', 'DANDY', 'DATUM', 'DAUNT', 'DEALT', 'DEATH',
  'DEBAR', 'DEBIT', 'DEBUG', 'DEBUT', 'DECAL', 'DECAY', 'DECOR', 'DECOY', 'DECRY', 'DEFER',
  'DEIGN', 'DEITY', 'DELAY', 'DELTA', 'DELVE', 'DEMON', 'DEMUR', 'DENIM', 'DENSE', 'DEPOT',
  'DEPTH', 'DERBY', 'DETER', 'DETOX', 'DEUCE', 'DEVIL', 'DIARY', 'DICEY', 'DIGIT', 'DILLY',
  'DIMLY', 'DINER', 'DINGO', 'DIODE', 'DIRGE', 'DIRTY', 'DISCO', 'DITCH', 'DITTO', 'DITTY',
  'DIVER', 'DIZZY', 'DODGE', 'DODGY', 'DOGMA', 'DOING', 'DOLLY', 'DONOR', 'DONUT', 'DOPEY',
  'DOUBT', 'DOUGH', 'DOWDY', 'DOWEL', 'DOWNY', 'DOWRY', 'DOZEN', 'DRAFT', 'DRAIN', 'DRAKE',
  'DRAMA', 'DRANK', 'DRAPE', 'DRAWL', 'DRAWN', 'DREAD', 'DREAM', 'DRESS', 'DRIED', 'DRIFT',
  'DRILL', 'DRINK', 'DRIVE', 'DROLL', 'DRONE', 'DROOL', 'DROOP', 'DROSS', 'DROVE', 'DROWN',
  'DRUID', 'DRUNK', 'DRYER', 'DRYLY', 'DUCHY', 'DULLY', 'DUMMY', 'DUMPY', 'DUNCE', 'DUSKY',
  'DUSTY', 'DUTCH', 'DUVET', 'DWARF', 'DWELL', 'DWELT', 'DYING', 'EAGER', 'EAGLE', 'EARLY',
  'EARTH', 'EASEL', 'EATEN', 'EATER', 'EBONY', 'ECLAT', 'EDICT', 'EDIFY', 'EERIE', 'EGRET',
  'EIGHT', 'EJECT', 'EKING', 'ELATE', 'ELBOW', 'ELDER', 'ELECT', 'ELEGY', 'ELFIN', 'ELIDE',
  'ELITE', 'ELOPE', 'ELUDE', 'EMAIL', 'EMBED', 'EMBER', 'EMCEE', 'EMPTY', 'ENACT', 'ENDOW',
  'ENEMY', 'ENJOY', 'ENNUI', 'ENSUE', 'ENTER', 'ENTRY', 'ENVOY', 'EPOCH', 'EPOXY', 'EQUAL',
  'EQUIP', 'ERASE', 'ERECT', 'ERODE', 'ERROR', 'ERUPT', 'ESSAY', 'ESTER', 'ETHER', 'ETHIC',
  'ETHOS', 'ETUDE', 'EVADE', 'EVENT', 'EVERY', 'EVICT', 'EVOKE', 'EXACT', 'EXALT', 'EXCEL',
  'EXERT', 'EXILE', 'EXIST', 'EXPEL', 'EXTOL', 'EXTRA', 'EXULT', 'FABLE', 'FACET', 'FAINT',
  'FAIRY', 'FAITH', 'FALSE', 'FANCY', 'FANNY', 'FARCE', 'FATAL', 'FATTY', 'FAULT', 'FAUNA',
  'FAVOR', 'FEUDS', 'FEAST', 'FECAL', 'FEIGN', 'FELLA', 'FELON', 'FEMME', 'FEMUR', 'FENCE',
  'FERAL', 'FERRY', 'FETAL', 'FETCH', 'FETID', 'FETUS', 'FEVER', 'FEWER', 'FIBER', 'FICUS',
  'FIELD', 'FIEND', 'FIERY', 'FIFTH', 'FIFTY', 'FIGHT', 'FILER', 'FILET', 'FILLY', 'FILMY',
  'FILTH', 'FINAL', 'FINCH', 'FINER', 'FIRST', 'FISHY', 'FIXER', 'FIZZY', 'FJORD', 'FLACK',
  'FLAIR', 'FLAKE', 'FLAKY', 'FLAME', 'FLANK', 'FLARE', 'FLASH', 'FLASK', 'FLECK', 'FLEET',
  'FLESH', 'FLICK', 'FLIER', 'FLING', 'FLINT', 'FLIRT', 'FLOAT', 'FLOCK', 'FLOOD', 'FLOOR',
  'FLORA', 'FLOSS', 'FLOUR', 'FLOUT', 'FLOWN', 'FLUFF', 'FLUID', 'FLUKE', 'FLUNG', 'FLUSH',
  'FLUTE', 'FOCAL', 'FOCUS', 'FOGGY', 'FOIST', 'FOLIO', 'FOLLY', 'FORAY', 'FORCE', 'FORGE',
  'FORGO', 'FORTE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FOYER', 'FRAIL', 'FRAME', 'FRANK',
  'FRAUD', 'FREAK', 'FREED', 'FRESH', 'FRIAR', 'FRIED', 'FROCK', 'FROND', 'FRONT', 'FROST',
  'FROTH', 'FROWN', 'FROZE', 'FRUIT', 'FUDGE', 'FUGUE', 'FULLY', 'FUNGI', 'FUNKY', 'FUNNY',
  'FUROR', 'FURRY', 'FUSSY', 'FUZZY', 'GAILY', 'GAMER', 'GAMMA', 'GAMUT', 'GASSY', 'GAUDY',
  'GAUGE', 'GAUNT', 'GAUZE', 'GAVEL', 'GAWKY', 'GAYLY', 'GAZER', 'GECKO', 'GEEKY', 'GENIE',
  'GENRE', 'GHOST', 'GHOUL', 'GIANT', 'GIDDY', 'GIPSY', 'GIRTH', 'GIVEN', 'GIVER', 'GLADE',
  'GLAND', 'GLARE', 'GLASS', 'GLAZE', 'GLEAM', 'GLEAN', 'GLIDE', 'GLINT', 'GLOAT', 'GLOBE',
  'GLOOM', 'GLORY', 'GLOSS', 'GLOVE', 'GLYPH', 'GNASH', 'GNOME', 'GODLY', 'GOING', 'GOLEM',
  'GONAD', 'GONER', 'GOODY', 'GOOEY', 'GOOSE', 'GORGE', 'GOUGE', 'GOURD', 'GRACE', 'GRADE',
  'GRAFT', 'GRAIL', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRAPH', 'GRASP', 'GRASS', 'GRATE',
  'GRAVE', 'GRAVY', 'GRAZE', 'GREAT', 'GREED', 'GREEN', 'GREET', 'GRIEF', 'GRILL', 'GRIME',
  'GRIMY', 'GRIND', 'GRIPE', 'GROAN', 'GROIN', 'GROOM', 'GROPE', 'GROSS', 'GROUP', 'GROUT',
  'GROVE', 'GROWL', 'GROWN', 'GRUEL', 'GRUFF', 'GRUNT', 'GUARD', 'GUAVA', 'GUESS', 'GUEST',
  'GUIDE', 'GUILD', 'GUILE', 'GUILT', 'GUISE', 'GULCH', 'GULLY', 'GUMBO', 'GUMMY', 'GUPPY',
  'GUSTO', 'GUSTY', 'GYPSY', 'HABIT', 'HAIRY', 'HALVE', 'HANDY', 'HAPPY', 'HARDY', 'HAREM',
  'HARPY', 'HARSH', 'HASTE', 'HASTY', 'HATCH', 'HAUNT', 'HAVEN', 'HAVOC', 'HAZEL', 'HEADY',
  'HEART', 'HEATH', 'HEAVE', 'HEAVY', 'HEDGE', 'HEFTY', 'HEIST', 'HELIX', 'HELLO', 'HENCE',
  'HERON', 'HILLY', 'HINGE', 'HIPPO', 'HITCH', 'HOARD', 'HOBBY', 'HOIST', 'HOLLY', 'HOMER',
  'HONEY', 'HONOR', 'HORDE', 'HORSE', 'HOTEL', 'HOTLY', 'HOUND', 'HOUSE', 'HOVEL', 'HOVER',
  'HOWDY', 'HUMAN', 'HUMID', 'HUMOR', 'HUMPH', 'HUMUS', 'HUNCH', 'HUNKY', 'HURRY', 'HUSKY',
  'HUSSY', 'HUTCH', 'HYENA', 'HYMEN', 'HYPER', 'ICILY', 'ICING', 'IDEAL', 'IDIOM', 'IDIOT',
  'IDLER', 'IGLOO', 'IMAGE', 'IMBUE', 'IMPEL', 'IMPLY', 'INANE', 'INBOX', 'INCUR', 'INDEX',
  'INEPT', 'INERT', 'INFER', 'INGOT', 'INLAY', 'INLET', 'INNER', 'INPUT', 'INTER', 'INTRO',
  'IONIC', 'IRATE', 'IRONY', 'ISLET', 'ISSUE', 'ITCHY', 'IVORY', 'JADED', 'JAUNT', 'JAZZY',
  'JELLY', 'JERKY', 'JETTY', 'JEWEL', 'JIFFY', 'JOINT', 'JOIST', 'JOKER', 'JOLLY', 'JOUST',
  'JUDGE', 'JUICE', 'JUICY', 'JUMBO', 'JUMPY', 'JUNTA', 'JUROR', 'KAPPA', 'KARMA', 'KAYAK',
  'KEBAB', 'KHAKI', 'KINKY', 'KIOSK', 'KITTY', 'KNACK', 'KNAVE', 'KNEAD', 'KNEED', 'KNEEL',
  'KNELT', 'KNIFE', 'KNOCK', 'KNOLL', 'KNOWN', 'KOALA', 'KRILL', 'LABEL', 'LABOR', 'LADEN',
  'LADLE', 'LAGER', 'LANCE', 'LANKY', 'LAPEL', 'LARGE', 'LARVA', 'LATCH', 'LATER', 'LATHE',
  'LAUGH', 'LAYER', 'LEACH', 'LEAFY', 'LEAKY', 'LEANT', 'LEAPT', 'LEARN', 'LEASE', 'LEASH',
  'LEAST', 'LEAVE', 'LEDGE', 'LEECH', 'LEERY', 'LEFTY', 'LEGAL', 'LEMON', 'LEMUR', 'LEVEL',
  'LEVER', 'LIBEL', 'LIGHT', 'LIKEN', 'LILAC', 'LIMBO', 'LIMIT', 'LINEN', 'LINER', 'LINGO',
  'LIPID', 'LITHE', 'LIVER', 'LIVID', 'LLAMA', 'LOACH', 'LOATH', 'LOBBY', 'LOCAL', 'LOCUS',
  'LODGE', 'LOFTY', 'LOGIC', 'LOGIN', 'LOOPY', 'LOOSE', 'LORRY', 'LOSER', 'LOTUS', 'LOUSE',
  'LOUSY', 'LOVER', 'LOWER', 'LOWLY', 'LOYAL', 'LUCID', 'LUCKY', 'LUMEN', 'LUMPY', 'LUNAR',
  'LUNCH', 'LUNGE', 'LUPUS', 'LURCH', 'LURID', 'LUSTY', 'LYING', 'LYMPH', 'LYNCH', 'LYRIC',
  'MACAW', 'MACHO', 'MACRO', 'MADAM', 'MADLY', 'MAGIC', 'MAIZE', 'MAJOR', 'MAKER', 'MAMBO',
  'MANGO', 'MANGY', 'MANIA', 'MANLY', 'MANOR', 'MAPLE', 'MARCH', 'MARRY', 'MARSH', 'MASON',
  'MATCH', 'MATEY', 'MAUVE', 'MAXIM', 'MAYBE', 'MAYOR', 'MEALY', 'MEANT', 'MEATY', 'MECCA',
  'MEDAL', 'MEDIA', 'MEDIC', 'MELEE', 'MELON', 'MERCY', 'MERGE', 'MERIT', 'MERRY', 'METAL',
  'METER', 'METRO', 'MIDGE', 'MIDST', 'MIGHT', 'MIMIC', 'MINCE', 'MINER', 'MINOR', 'MINTY',
  'MINUS', 'MIRTH', 'MISER', 'MISSY', 'MOCHA', 'MODAL', 'MODEL', 'MODEM', 'MOGUL', 'MOIST',
  'MOLAR', 'MOLDY', 'MONEY', 'MONTH', 'MOODY', 'MOOSE', 'MORAL', 'MORON', 'MORPH', 'MOSSY',
  'MOTEL', 'MOTIF', 'MOTOR', 'MOTTO', 'MOULD', 'MOUND', 'MOUNT', 'MOURN', 'MOUSE', 'MOUTH',
  'MOVER', 'MOVIE', 'MOWER', 'MUCKY', 'MUCUS', 'MUDDY', 'MULCH', 'MUMMY', 'MUNCH', 'MURAL',
  'MURKY', 'MUSHY', 'MUSIC', 'MUSKY', 'MUSTY', 'MYRRH', 'NADIR', 'NAIVE', 'NANNY', 'NASAL',
  'NASTY', 'NAVAL', 'NEEDY', 'NEIGH', 'NERDY', 'NERVE', 'NEVER', 'NEWLY', 'NICER', 'NICHE',
  'NIECE', 'NIGHT', 'NINJA', 'NINNY', 'NINTH', 'NOBLE', 'NOBLY', 'NOISE', 'NOISY', 'NOMAD',
  'NOOSE', 'NORTH', 'NOSEY', 'NOTCH', 'NOVEL', 'NUDGE', 'NURSE', 'NUTTY', 'NYLON', 'NYMPH',
  'OAKEN', 'OASIS', 'OCCUR', 'OCEAN', 'OCTET', 'ODDLY', 'OFFAL', 'OFFER', 'OFTEN', 'OLDEN',
  'OLDER', 'OLIVE', 'OMBRE', 'OMEGA', 'ONION', 'ONSET', 'OPERA', 'OPINE', 'OPIUM', 'OPTIC',
  'ORBIT', 'ORDER', 'ORGAN', 'OTHER', 'OTTER', 'OUGHT', 'OUNCE', 'OUTDO', 'OUTER', 'OUTGO',
  'OVARY', 'OVATE', 'OVERT', 'OVINE', 'OVOID', 'OWING', 'OWNER', 'OXIDE', 'OZONE', 'PADDY',
  'PAGAN', 'PAINT', 'PALER', 'PALSY', 'PANEL', 'PANIC', 'PANSY', 'PAPAL', 'PAPER', 'PARER',
  'PARKA', 'PARRY', 'PARSE', 'PARTY', 'PASTA', 'PASTE', 'PASTY', 'PATCH', 'PATIO', 'PATSY',
  'PATTY', 'PAUSE', 'PAYEE', 'PAYER', 'PEACE', 'PEACH', 'PEARL', 'PECAN', 'PEDAL', 'PENAL',
  'PENCE', 'PENNE', 'PENNY', 'PERCH', 'PERIL', 'PERKY', 'PESKY', 'PESTO', 'PETAL', 'PETTY',
  'PHASE', 'PHONE', 'PHONY', 'PHOTO', 'PIANO', 'PICKY', 'PIECE', 'PIETY', 'PIGGY', 'PILOT',
  'PINCH', 'PINEY', 'PINKY', 'PINTO', 'PIPER', 'PIQUE', 'PITCH', 'PITHY', 'PIVOT', 'PIXEL',
  'PIXIE', 'PIZZA', 'PLACE', 'PLAID', 'PLAIN', 'PLAIT', 'PLANE', 'PLANK', 'PLANT', 'PLATE',
  'PLAZA', 'PLEAD', 'PLEAT', 'PLIED', 'PLIER', 'PLUCK', 'PLUMB', 'PLUME', 'PLUMP', 'PLUNK',
  'PLUSH', 'POESY', 'POINT', 'POISE', 'POKER', 'POLAR', 'POLKA', 'POLYP', 'POOCH', 'POPPY',
  'PORCH', 'POSER', 'POSIT', 'POSSE', 'POUCH', 'POUND', 'POUTY', 'POWER', 'PRANK', 'PRAWN',
  'PREEN', 'PRESS', 'PRICE', 'PRICK', 'PRIDE', 'PRIED', 'PRIME', 'PRIMO', 'PRINT', 'PRIOR',
  'PRISM', 'PRIVY', 'PRIZE', 'PROBE', 'PRONE', 'PRONG', 'PROOF', 'PROSE', 'PROUD', 'PROVE',
  'PROWL', 'PROXY', 'PRUDE', 'PRUNE', 'PSALM', 'PUDGY', 'PUFFY', 'PULPY', 'PULSE', 'PUNCH',
  'PUPAL', 'PUPIL', 'PUPPY', 'PUREE', 'PURER', 'PURGE', 'PURSE', 'PUSHY', 'PUTTY', 'PYGMY',
  'QUACK', 'QUAFF', 'QUAIL', 'QUAKE', 'QUALM', 'QUARK', 'QUART', 'QUASH', 'QUASI', 'QUEEN',
  'QUEER', 'QUELL', 'QUERY', 'QUEST', 'QUEUE', 'QUICK', 'QUIET', 'QUILL', 'QUILT', 'QUIRK',
  'QUITE', 'QUOTA', 'QUOTE', 'RABBI', 'RABID', 'RACER', 'RADAR', 'RADII', 'RADIO', 'RAINY',
  'RAISE', 'RAJAH', 'RALLY', 'RANCH', 'RANGE', 'RAPID', 'RASPY', 'RATIO', 'RAVEN', 'RAYON',
  'RAZOR', 'REACH', 'REACT', 'READY', 'REALM', 'REARM', 'REBAR', 'REBEL', 'REBUS', 'REBUT',
  'RECAP', 'RECUR', 'REDID', 'REEDY', 'REFER', 'REGAL', 'REHAB', 'REIGN', 'RELAX', 'RELAY',
  'RELIC', 'REMIT', 'RENAL', 'REPAY', 'REPEL', 'REPLY', 'RERUN', 'RESET', 'RESIN', 'RETCH',
  'RETRO', 'RETRY', 'REUSE', 'REVEL', 'REVUE', 'RHINO', 'RHYME', 'RIDER', 'RIDGE', 'RIFLE',
  'RIGHT', 'RIGID', 'RINSE', 'RIPEN', 'RIPER', 'RISEN', 'RISER', 'RISKY', 'RIVAL', 'RIVER',
  'RIVET', 'ROACH', 'ROAST', 'ROBIN', 'ROBOT', 'ROCKY', 'RODEO', 'ROGUE', 'ROOMY', 'ROOST',
  'ROTOR', 'ROUGE', 'ROUGH', 'ROUND', 'ROUSE', 'ROUTE', 'ROVER', 'ROWDY', 'ROYAL', 'RUDDY',
  'RUGBY', 'RULER', 'RUMBA', 'RUMOR', 'RUPEE', 'RURAL', 'RUSTY', 'SABER', 'SADLY', 'SAFER',
  'SAINT', 'SALAD', 'SALLY', 'SALON', 'SALSA', 'SALTY', 'SALVE', 'SALVO', 'SANDY', 'SAPPY',
  'SASSY', 'SATIN', 'SATYR', 'SAUCE', 'SAUCY', 'SAUNA', 'SAVOR', 'SAVVY', 'SCALD', 'SCALE',
  'SCALP', 'SCALY', 'SCAMP', 'SCANT', 'SCARE', 'SCARF', 'SCARY', 'SCENE', 'SCENT', 'SCION',
  'SCOFF', 'SCOLD', 'SCONE', 'SCOOP', 'SCOPE', 'SCORE', 'SCORN', 'SCOUR', 'SCOUT', 'SCOWL',
  'SCRAM', 'SCRAP', 'SCREE', 'SCREW', 'SCRUB', 'SCRUM', 'SCUBA', 'SEDAN', 'SEEDY', 'SEIZE',
  'SENSE', 'SEPIA', 'SERIF', 'SERUM', 'SERVE', 'SETUP', 'SEVEN', 'SEVER', 'SEWER', 'SHACK',
  'SHADE', 'SHADY', 'SHAFT', 'SHAKE', 'SHAKY', 'SHALE', 'SHALL', 'SHALT', 'SHAME', 'SHANK',
  'SHAPE', 'SHARD', 'SHARE', 'SHARK', 'SHARP', 'SHAVE', 'SHAWL', 'SHEAR', 'SHEEN', 'SHEEP',
  'SHEER', 'SHEET', 'SHEIK', 'SHELF', 'SHELL', 'SHIED', 'SHIFT', 'SHINE', 'SHINY', 'SHIRE',
  'SHIRK', 'SHIRT', 'SHOAL', 'SHOCK', 'SHONE', 'SHOOK', 'SHOOT', 'SHORE', 'SHORN', 'SHORT',
  'SHOUT', 'SHOVE', 'SHOWN', 'SHOWY', 'SHRED', 'SHREW', 'SHRUB', 'SHRUG', 'SHUCK', 'SHUNT',
  'SHUSH', 'SHYLY', 'SIEGE', 'SIEVE', 'SIGHT', 'SIGMA', 'SILKY', 'SILLY', 'SINCE', 'SINEW',
  'SINGE', 'SIREN', 'SISSY', 'SIXTH', 'SIXTY', 'SKATE', 'SKIER', 'SKIFF', 'SKILL', 'SKIMP',
  'SKIRT', 'SKULK', 'SKULL', 'SKUNK', 'SLACK', 'SLAIN', 'SLANG', 'SLANT', 'SLASH', 'SLATE',
  'SLAVE', 'SLEEK', 'SLEEP', 'SLEET', 'SLEPT', 'SLICE', 'SLICK', 'SLIDE', 'SLIME', 'SLIMY',
  'SLING', 'SLINK', 'SLOOP', 'SLOPE', 'SLOSH', 'SLOTH', 'SLUMP', 'SLUNG', 'SLUNK', 'SLURP',
  'SLUSH', 'SLYLY', 'SMACK', 'SMALL', 'SMART', 'SMASH', 'SMEAR', 'SMELL', 'SMELT', 'SMILE',
  'SMIRK', 'SMITE', 'SMITH', 'SMOCK', 'SMOKE', 'SMOKY', 'SMOTE', 'SNACK', 'SNAIL', 'SNAKE',
  'SNAKY', 'SNARE', 'SNARL', 'SNEAK', 'SNEER', 'SNIDE', 'SNIFF', 'SNIPE', 'SNOOP', 'SNORE',
  'SNORT', 'SNOUT', 'SNOWY', 'SNUCK', 'SNUFF', 'SOAPY', 'SOBER', 'SOGGY', 'SOLAR', 'SOLID',
  'SOLVE', 'SONAR', 'SONIC', 'SOOTH', 'SOOTY', 'SORRY', 'SOUND', 'SOUTH', 'SOWER', 'SPACE',
  'SPADE', 'SPANK', 'SPARE', 'SPARK', 'SPASM', 'SPAWN', 'SPEAK', 'SPEAR', 'SPECK', 'SPEED',
  'SPELL', 'SPEND', 'SPENT', 'SPERM', 'SPICE', 'SPICY', 'SPIED', 'SPIEL', 'SPIKE', 'SPIKY',
  'SPILL', 'SPILT', 'SPINE', 'SPINY', 'SPIRE', 'SPITE', 'SPLAT', 'SPLIT', 'SPOIL', 'SPOKE',
  'SPOOF', 'SPOOK', 'SPOOL', 'SPOON', 'SPORE', 'SPORT', 'SPOUT', 'SPRAY', 'SPREE', 'SPRIG',
  'SPUNK', 'SPURN', 'SPURT', 'SQUAD', 'SQUAT', 'SQUIB', 'STACK', 'STAFF', 'STAGE', 'STAID',
  'STAIN', 'STAIR', 'STAKE', 'STALE', 'STALK', 'STALL', 'STAMP', 'STAND', 'STANK', 'STARE',
  'STARK', 'START', 'STASH', 'STATE', 'STAVE', 'STEAD', 'STEAK', 'STEAL', 'STEAM', 'STEED',
  'STEEL', 'STEEP', 'STEER', 'STEIN', 'STERN', 'STICK', 'STIFF', 'STILL', 'STILT', 'STING',
  'STINK', 'STINT', 'STOCK', 'STOIC', 'STOKE', 'STOLE', 'STOMP', 'STONE', 'STONY', 'STOOD',
  'STOOL', 'STOOP', 'STORE', 'STORK', 'STORM', 'STORY', 'STOUT', 'STOVE', 'STRAP', 'STRAW',
  'STRAY', 'STREW', 'STRIP', 'STRUT', 'STUCK', 'STUDY', 'STUFF', 'STUMP', 'STUNG', 'STUNK',
  'STUNT', 'STYLE', 'SUAVE', 'SUGAR', 'SUITE', 'SULKY', 'SULLY', 'SUNNY', 'SUPER', 'SURGE',
  'SURLY', 'SUSHI', 'SWAMI', 'SWAMP', 'SWARM', 'SWASH', 'SWATH', 'SWEAR', 'SWEAT', 'SWEEP',
  'SWEET', 'SWELL', 'SWEPT', 'SWIFT', 'SWILL', 'SWINE', 'SWING', 'SWIRL', 'SWISH', 'SWOON',
  'SWOOP', 'SWORD', 'SWORE', 'SWORN', 'SWUNG', 'SYNOD', 'SYRUP', 'TABBY', 'TABLE', 'TABOO',
  'TACIT', 'TACKY', 'TAFFY', 'TAINT', 'TAKEN', 'TAKER', 'TALLY', 'TALON', 'TAMER', 'TANGO',
  'TANGY', 'TAPER', 'TAPIR', 'TARDY', 'TAROT', 'TASTE', 'TASTY', 'TATTY', 'TAUNT', 'TAWNY',
  'TEACH', 'TEARY', 'TEASE', 'TEDDY', 'TEETH', 'TEMPO', 'TENET', 'TENOR', 'TENSE', 'TENTH',
  'TEPEE', 'TEPID', 'TERSE', 'TESTY', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE',
  'THICK', 'THIEF', 'THIGH', 'THING', 'THINK', 'THIRD', 'THORN', 'THOSE', 'THREE', 'THREW',
  'THROB', 'THROW', 'THRUM', 'THUMB', 'THUMP', 'THYME', 'TIARA', 'TIDAL', 'TIGER', 'TIGHT',
  'TILDE', 'TIMER', 'TIMID', 'TIPSY', 'TITAN', 'TITHE', 'TITLE', 'TOAST', 'TODAY', 'TODDY',
  'TOKEN', 'TONAL', 'TONGA', 'TONIC', 'TOOTH', 'TOPAZ', 'TOPIC', 'TORCH', 'TORSO', 'TORUS',
  'TOTAL', 'TOTEM', 'TOUCH', 'TOUGH', 'TOWEL', 'TOWER', 'TOXIC', 'TOXIN', 'TRACE', 'TRACK',
  'TRACT', 'TRADE', 'TRAIL', 'TRAIN', 'TRAIT', 'TRAMP', 'TRASH', 'TRAWL', 'TREAD', 'TREAT',
  'TREND', 'TRIAD', 'TRIAL', 'TRIBE', 'TRICE', 'TRICK', 'TRIED', 'TRIPE', 'TRITE', 'TROLL',
  'TROOP', 'TROPE', 'TROUT', 'TROVE', 'TRUCE', 'TRUCK', 'TRULY', 'TRUMP', 'TRUNK', 'TRUSS',
  'TRUST', 'TRUTH', 'TRYST', 'TUBAL', 'TUBER', 'TULIP', 'TULLE', 'TUMOR', 'TUNIC', 'TURBO',
  'TUTOR', 'TWANG', 'TWEAK', 'TWEED', 'TWEET', 'TWICE', 'TWINE', 'TWIRL', 'TWIST', 'TWIXT',
  'TYING', 'UDDER', 'ULCER', 'ULTRA', 'UMBRA', 'UNCLE', 'UNDER', 'UNDID', 'UNDUE', 'UNFIT',
  'UNIFY', 'UNION', 'UNITE', 'UNITY', 'UNLIT', 'UNMET', 'UNSET', 'UNTIE', 'UNTIL', 'UNWED',
  'UNZIP', 'UPPER', 'UPSET', 'URBAN', 'URINE', 'USAGE', 'USHER', 'USING', 'USUAL', 'USURP',
  'UTTER', 'VAGUE', 'VALET', 'VALID', 'VALOR', 'VALUE', 'VALVE', 'VAPID', 'VAPOR', 'VAULT',
  'VAUNT', 'VEGAN', 'VENOM', 'VENUE', 'VERGE', 'VERSE', 'VERVE', 'VICAR', 'VIDEO', 'VIGIL',
  'VIGOR', 'VILLA', 'VINYL', 'VIOLA', 'VIPER', 'VIRAL', 'VIRUS', 'VISIT', 'VISOR', 'VISTA',
  'VITAL', 'VIVID', 'VIXEN', 'VOCAL', 'VODKA', 'VOGUE', 'VOICE', 'VOILA', 'VOMIT', 'VOTER',
  'VOUCH', 'VOWEL', 'VYING', 'WACKY', 'WAFER', 'WAGER', 'WAGON', 'WAIST', 'WAIVE', 'WALTZ',
  'WARTY', 'WASTE', 'WATCH', 'WATER', 'WAVER', 'WAXEN', 'WEARY', 'WEAVE', 'WEDGE', 'WEEDY',
  'WEIGH', 'WEIRD', 'WELCH', 'WHACK', 'WHALE', 'WHARF', 'WHEAT', 'WHEEL', 'WHELP', 'WHERE',
  'WHICH', 'WHIFF', 'WHILE', 'WHINE', 'WHINY', 'WHIRL', 'WHISK', 'WHITE', 'WHOLE', 'WHOOP',
  'WHOSE', 'WIDEN', 'WIDER', 'WIDOW', 'WIDTH', 'WIELD', 'WIGHT', 'WILLY', 'WIMPY', 'WINCE',
  'WINCH', 'WINDY', 'WIPER', 'WISER', 'WISPY', 'WITCH', 'WITTY', 'WOKEN', 'WOMAN', 'WOMEN',
  'WOODY', 'WOOER', 'WOOLY', 'WOOZY', 'WORDY', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH',
  'WOUND', 'WOVEN', 'WRACK', 'WRATH', 'WREAK', 'WRECK', 'WREST', 'WRING', 'WRIST', 'WRITE',
  'WRONG', 'WROTE', 'WRUNG', 'WRYLY', 'YACHT', 'YEARN', 'YEAST', 'YIELD', 'YOGIC', 'YOKEL',
  'YOUNG', 'YOUTH', 'ZEBRA', 'ZESTY', 'ZONAL', 'ZONED',
];

export const WORDS = Array.from(new Set(RAW.filter((w) => w.length === 5)));

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

/** Days since the Unix epoch for a calendar date (timezone-stable). */
function epochDay(dateISO: ISODate): number {
  const [y, m, d] = dateISO.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The shared word of the day (same for both partners on the same date). */
export function dailyWord(dateISO: ISODate): string {
  const i = ((epochDay(dateISO) % WORDS.length) + WORDS.length) % WORDS.length;
  return WORDS[i] ?? 'HEART';
}

export type LetterState = 'correct' | 'present' | 'absent';

/** Score a guess against the answer, with correct duplicate-letter handling. */
export function scoreGuess(guess: string, answer: string): LetterState[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const res: LetterState[] = new Array(g.length).fill('absent');
  const counts: Record<string, number> = {};
  for (const ch of a) counts[ch] = (counts[ch] ?? 0) + 1;
  // First pass: greens.
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      res[i] = 'correct';
      counts[g[i]]--;
    }
  }
  // Second pass: yellows where a copy remains.
  for (let i = 0; i < g.length; i++) {
    if (res[i] === 'correct') continue;
    if (counts[g[i]] > 0) {
      res[i] = 'present';
      counts[g[i]]--;
    }
  }
  return res;
}

/** Best known state for each letter across all guesses, for the keyboard. */
export function keyboardStates(guesses: string[], answer: string): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };
  const out: Record<string, LetterState> = {};
  for (const guess of guesses) {
    const score = scoreGuess(guess, answer);
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i];
      const s = score[i];
      if (!out[ch] || rank[s] > rank[out[ch]]) out[ch] = s;
    }
  }
  return out;
}
