# Tether: UI/UX Audit & Retention Strategy

Role: Product Manager & UX Lead · Goal: maximize retention · July 2026
Register: product (design serves the relationship). Redesign mode: preserve.
Identity is committed and stays: Rose & Bloom, ink-on-cream, Fraunces display
(the brand brief names the serif explicitly, so it is exempt from generic
"no display serif" rules). No code in this document; approval gates each phase.

---

## 0. Executive summary

**Thesis.** Tether's *mechanics* are already Apple-Design-Award material: the
Fogged Window on Canvas, the sealed asymmetric Reveal, stroke-batched sync with
haptic ticks, the golden window, the ambient presence bloom. What stands between
the app and that level is not invention, it is **editorial restraint on Home,
one unified tactile grammar, and turning computed moments into felt rituals**.
The app currently *tells* you the warmest facts ("you're both free 9:10 to
10:00") in places where it should let you *feel* them.

**Retention frame.** For an audience of exactly two people, retention is not
DAU tricks, it is **anchored rituals**: a reason to open in the morning, a
reason to open together in the evening, and a reward that only exists because
the other person acted. Everything below serves those three anchors.

### Scorecard (impeccable audit, 0-4 per dimension)

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | Placeholder/faint text ~2.4:1; no reduced-motion path; labels/hitSlop otherwise excellent |
| 2 | Performance | 3 | Native-driver everywhere, memoized canvas rows; Home mounts up to ~19 blocks + 2 perpetual loops |
| 3 | Theming | 3 | Strong token system; strays in Wordle + borders; partner-color law broken on Home |
| 4 | Responsive | 3 | Web parity engineered seriously; Wordle keys tight on narrow phones |
| 5 | Anti-patterns | 2 | "Closeness /100" is the banned hero-metric; 8-deep identical alert stack; instructional copy; the house em-dash ban is violated in shipped copy |
| **Total** | | **13/20** | Acceptable: significant but well-defined work to Award level |

**What is genuinely great (keep, and build on):** FogReveal discovery ritual ·
Reveal's sealed asymmetry ("you learn THAT they answered, never WHAT") ·
Canvas stroke batching + per-pixel haptic ticks · ambient away/here bloom ·
glass tab bar with morphing pill · the whisper system's restraint · widget and
native-module quarantine architecture · motion tokens existing at all.

---

## 1. Surface-by-surface audit

### 1.1 Home ("the hearth")

**Diagnosis.** Home has drifted from hearth to noticeboard. Up to **eight alert
cards can stack** before the Day Ribbon (struggling, clear-the-air, letter,
hugs, moment nudge, countdown, occasion today, occasion upcoming, plus the
always-on Reveal card). All share one anatomy (emoji 30px + Title + Muted), so
priority is invisible and the stack reads as an identical card grid. This
directly violates the product's own principle 5 ("one nudge at a time; the app
whispers, never nags") and DESIGN.md's rule that alert cards are only for
things that genuinely need the person *now*. A daily moment-photo nudge and a
permanent "set your reunion date" card are not that. Guilt-stacks churn users.

The **"Closeness today N/100" gradient hero** is the exact hero-metric template
(big number, small label, three supporting stats, gradient) that the design
system bans, and it is the one place the app breaks "tender, never clinical":
a couple's app grading the relationship 0-100 every day invites anxiety on a
hard week. The number is honest, but honesty at the wrong altitude is cruelty.

**Findings**

- **[P0] Alert stack breaks the whisper principle.** `HomeScreen.tsx:271-420`.
  Anti-pattern + retention risk. Fix: a priority queue rendering exactly **one**
  alert card (order: SOS/issue > letter ready > hugs waiting > reveal ready >
  occasion today). Everything else feeds the Time Capsule badge and the Morning
  Paper (Part 3, Hook B).
- **[P1] Retire the numeric closeness hero from Home.** `HomeScreen.tsx:493-528`.
  Replace with **The Hearth**: merge the "Today's pulse" two-faces card into the
  hero slot: both faces, presence heartbeat, moods, and one warm Fraunces line
  ("A close, ordinary Tuesday 🤍"). The score and its three metrics move to
  Insights as a *weekly*, qualitative reflection. The banned pattern disappears
  and the emotional temperature rises.
- **[P1] Partner-color law broken.** `HomeScreen.tsx:972` tints partner feed
  rows `primarySoft` (rose = mine) and `HomeScreen.tsx:958` renders the
  "N from partner" badge in rose. DESIGN.md: partner is violet, everywhere.
  Fix: `accentSoft` / `accent`.
- **[P1] Shipped em-dashes.** `HomeScreen.tsx:256` ("Empty for now — leave…"),
  `:416` ("Read them again — a new question…"). DESIGN.md bans em-dashes in UI
  copy. Sweep the whole app (see Part 2).
- **[P2] Duplicate announcements.** A fresh canvas stroke can surface in the
  capsule, the canvas card dot, *and* the activity feed simultaneously. One
  source of truth per event: capsule = "something is waiting", feed = history.
- **[P2] "Together today" card duplicates the Us menu** (Games + Deck rows).
  Remove; Home should hold rituals, not navigation.
- **[P3] Blocks pop in/out with no transition** (conditional renders). Enter
  260ms fade+lift, exit 170ms fade.

**Proposed Home layout (9 blocks max, down from ~19):**

1. Header (greeting, Time Capsule, joint avatar)
2. One alert (priority queue)
3. **The Hearth** (presence + pulse, ambient bloom behind it)
4. Day Ribbon (later: carries the Golden Hour lantern)
5. Tonight's Reveal card
6. What's new together (5 rows, "see all")
7. One whisper
8. Our shared canvas
9. On this day (when it exists)

**Typography.** The h1 (Fraunces 32, tracking −0.9 ≈ −0.028em) is correct and
inside the display-tracking floor. But Fraunces currently also carries six
section titles, every card title, the DayRibbon payoff, and a 52px *number*.
Serif everywhere is serif nowhere. Rule: **Fraunces speaks, Inter labels.**
Screen titles, section titles, and emotional payoff lines (ritual line, payoff,
reveal) stay Fraunces; card titles (the `Title` component) move to Inter
semibold 17. Trial on Home first: this is an identity-adjacent call. The 52px
Fraunces number retires with the score.

**Micro-interactions (Emil review)**

| Before | After | Why |
| --- | --- | --- |
| `Button` animates only its inner label to 0.96 (`ui.tsx:180-192`); the pill and gradient stay rigid | Scale the whole pressable surface (gradient + label) to 0.97, `spring.snappy` | The object you press is the pill; a label shrinking inside a static button reads as a rendering glitch, not tactility |
| Feed rows / whisper pressed state: `opacity: 0.7-0.9` | One grammar: `Press` scale 0.985 + surface tint | Opacity fades feel like disabled states; scale feels like touch. One press language app-wide |
| TimeCapsule press uses `spring.gentle` both directions | Press-in `spring.snappy` (~120ms), release `spring.gentle` | Feedback must be instant; the luxury belongs in the release, not the acknowledgment |
| Alert/whisper dismissal: instant unmount on tiny × | Swipe-to-dismiss, dismiss when velocity > 0.11 regardless of distance; 170ms slide-fade | A flick matches "brush it aside"; momentum-based dismissal beats a 20px target |
| Walk/health progress bars render at final width | Animate `scaleX` 0→fill, 440ms `easeOut`, once per day | A bar that draws itself is a felt change; a static bar is a stat |
| Feed stagger 55ms `Reveal` | Keep (30-80ms is the right band); cap at 7 rows | Already correct; noted so it survives the refactor |

**Tab bar (cross-surface but lives here):** the focused icon uses
`spring.bouncy` (friction 12) at scale 1.16 on every switch. Tab switching
happens 50+ times a day; per the frequency rule, high-frequency actions get
minimal motion. Change to `spring.snappy`, scale 1.08, keep the pill morph.
Bounce is a spice for rare moments, not a seasoning for navigation.

---

### 1.2 Our Day (`ScheduleScreen` + `DayRibbon`)

**Diagnosis.** The ritual header is the right idea and the copy is the app's
best ("You're both free 9:10 PM – 10:00 PM"). But the feature's soul, the
**golden window, is only ever text**. Two people's days overlapping into a
shared hour is inherently *visual*: this is the single biggest layout miss in
the app. Second, the add/edit form renders inline above the timeline, shoving
the entire day down (~600px layout jump), and the Week agenda mode duplicates
what the week strip + day view already do.

**Findings**

- **[P1] The Golden Band.** Add a slim two-lane day bar to the ritual card
  (and, smaller, to the Day Ribbon): my busy blocks in rose, theirs in violet,
  on one horizontal 06:00-24:00 track; the overlap where you are both free
  glows gold and *breathes* (the existing sine ambient grammar). The
  ritual line stays as the caption. Now the payoff is seen before it is read.
- **[P1] Move the add/edit form into a bottom sheet.** `ScheduleScreen.tsx:348-389`.
  Timeline never jumps; sheet uses the iOS drawer curve. The 12-emoji icon
  picker collapses to a single row behind the field.
- **[P2] Kill Week mode.** The strip already navigates; the agenda list is a
  second rendering of the same data. Fewer modes, calmer screen.
- **[P2] Repeated instructional micro-copy.** "You · tap to edit" is stamped
  on every one of my cards in 11px tracked uppercase. Affordance labels that
  repeat on every item are noise; show once (first-run) then trust the tap.
- **[P2] Em-dashes.** `:280`, `:296` ("yet — theirs will appear", "left — even
  ten minutes").
- **[P3] Empty week-strip days are indistinguishable from unshared days.**
  A faint dot-less pill could mean "free" or "not shared"; consider a hollow
  ring for not-yet-shared.

**Micro-interactions**

| Before | After | Why |
| --- | --- | --- |
| "💗 Keep 7:30 PM for each other" commits on tap | **Hold-to-promise**: press fills the pill over ~900ms (linear), release before fill snaps back in ~130ms `easeOut`; on commit `hSuccess` + the Golden Band blooms once | Slow where the user decides, fast where the system responds. A held press makes the promise feel signed, and prevents accidental proposals |
| Partner accepts via plain `Button`, state swaps to static text | On accept, the moment card blooms once: background crossfade with a 2px blur mask, heart pops 0.95→1 `spring.bouncy`, `hSuccess` | The yes is the payoff of the entire feature; it has earned the app's one bouncy spring |
| Day-pill selection restyles instantly | 170ms crossfade + 0.96→1 `snappy` scale on the landing pill | Selection should acknowledge the finger |
| Timeline rows mount all at once | `Reveal` stagger 40ms/row, cap 8 | The day unfolds top to bottom |
| Inline form appears/disappears with layout jump | Bottom sheet, 280ms, curve `cubic-bezier(0.32, 0.72, 0, 1)` | Interruptible, native-feeling, zero reflow of content behind |

---

### 1.3 Canvas

**Diagnosis.** Mechanically the best screen in the app (fog, batching, live
presence, memoized rows, throttled haptic ticks). Two layout mistakes and one
missing affordance keep it from feeling finished.

**Findings**

- **[P1] No undo; Clear is all-or-nothing and owns prime space.**
  `CanvasScreen.tsx:282`. A full-width danger button below the palette is the
  most reachable control on the screen, and it erases *both* people's work.
  Move Clear behind a header ⋯; put **"Undo my stroke"** in its place (local
  stroke history since last flush; trivially safe pre-sync). Undo removes the
  fear of drawing, and fear is the enemy of a shared canvas.
- **[P2] Developer voice leaks into UI copy.** "…one tidy write per stroke. 🎨"
  (`:287`) and "lands on Riya's phone the moment you lift your finger" is great,
  but it is a *permanent* explainer card. Teach once (first-run), then remove.
  Sync internals ("writes") never belong in the register.
- **[P3] Swatch selected ring pops in at full 3px instantly** while the scale
  springs; the ring should arrive with the spring (opacity 0 → 1, scale ≥0.9).
- **[P3] Hardcoded hex** (`GRID_BORDER`, swatch borders) → tokens.

**Micro-interactions**

| Before | After | Why |
| --- | --- | --- |
| Stroke syncs silently on finger-lift | On flush: canvas frame pulses scale 1→1.004→1 (`spring.gentle`) + one `hLight` | The lift-to-send IS the emotional beat of this screen ("it just landed on their phone"); mark it, barely |
| "Riya is drawing right now…" appears instantly | Fade + 4px lift, 170ms `easeOut` (dot already breathes) | State transitions, never pops |
| Selected swatch: scale 1.1 `bouncy` + instant ink border | Keep the spring; ring fades/scales in with it | Nothing arrives from nothing, not even a border |
| Clear = tap + system confirm | Keep confirm, but relocated to header ⋯ | Destructive actions should be deliberate to *find*, not only to confirm |

---

### 1.4 Us menu (`MoreScreen`)

**Diagnosis.** The five-cluster taxonomy is genuinely good IA. The problem is
**uniform weight and zero life**: 18 rows across 6 white cards, every row the
same anatomy, and none of them know anything ("Letters" looks identical whether
a sealed letter is waiting or not). A menu in a two-person app can be a status
board almost for free, because every feature already syncs.

**Findings**

- **[P1] State-aware rows.** Sub-lines become live where data exists: Letters
  "one sealed letter waits for you 💌", Wordle/Games "Riya played today",
  Occasions "23 days to your anniversary", Issues shows the violet dot when
  something needs tending. Partner-driven states render in violet per the law.
  This turns the menu from a directory into a reason to descend.
- **[P2] Add a "tonight" shelf.** One compact horizontal row at the top
  surfacing the 2-3 things that are *alive right now* (deck answer waiting,
  fog on the canvas, tonight's golden window), each a small chip. The clusters
  stay below, unchanged.
- **[P2] Menu shrinks via the tear-down** (Part 4): 18 rows → ~12, six section
  headers → four. Less serif repetition, calmer scroll.
- **[P3] Row press: bg highlight is correct list grammar; keep it** (do not
  add scale here; iOS list rows highlight, they do not shrink).

---

### 1.5 Wordle

**Diagnosis.** Solid bones (row pop + haptics, shake on invalid, Celebrate on
solve, keyboard states). But the signature Wordle moment, the tile-by-tile
reveal, is compressed into one whole-row pop from scale 0.5, which both
violates "nothing appears from nothing" and spends all the suspense at once.
And the partner card is the biggest missed retention hook on the screen: it is
plain text about the one other player in the world.

**Findings**

- **[P1] Per-tile flip cascade** (spec below).
- **[P1] Partner ghost grid.** Replace the text card with their actual grid,
  colors only, no letters (honest data, same asymmetric-tease grammar as
  Reveal). Tiles flip in live as they play. "They're on row 4" is a second
  session, every day. Add one quiet action when they haven't played by evening:
  "Leave a 🟩 nudge" (one tap, one push).
- **[P2] Contrast on tiles.** White 28px text on `gold #D89A2E` ≈ 2.6:1 and on
  `absent #9B9197` ≈ 2.9:1, under the 3:1 large-text floor. Add deepened tile
  variants (e.g. gold → `#B87F1F` band) rather than lightening text.
- **[P2] Hardcoded palette.** `STATE_BG.absent '#9B9197'`, keycap `'#E7DED8'`
  (`WordleScreen.tsx:11-15,200`) → tokens.
- **[P3] Keys on a 320px viewport are ~27px wide** (10 keys + gaps). Acceptable
  for keyboard grammar, but keep `hitSlop` and never add horizontal padding.

**Micro-interactions**

| Before | After | Why |
| --- | --- | --- |
| Submitted row pops whole: scale 0.5→1 spring, single haptic | Per-tile flip: `rotateX` 0→90° (90ms ease-in), swap color at the edge, 90°→0° (110ms `easeOut`), stagger 70ms per tile; `hLight` as each tile lands, `hSuccess` only on solve | Letter-by-letter is the drama of Wordle; each tile's animation stays <300ms, and the suspense is spent one letter at a time. Scale-from-0.5 reads as materialization, not a turn |
| Key press feedback: `opacity 0.7` | `translateY: 1` + scale 0.94, 100ms `easeOut`, no opacity change | Keys are hit ~30 times a game; feedback must be physical and instant, and never a fade (fades read as disabled) |
| Solved: confetti only | Confetti + the emoji share grid draws itself row by row (55ms stagger) | The artifact you would send them is the reward; let it assemble |
| Partner status: static sentence | Ghost grid, tiles flip in on their guesses | The other player is the product; show them playing |

---

## 2. Cross-cutting system fixes (Phase 1, mostly mechanical)

1. **One press grammar.** Every tappable goes through `Press` (scale) or list
   highlight (bg). Kill all `opacity: 0.x` pressed states (Home feed, whisper,
   Schedule cards, GamesScreen, Wordle keys).
2. **`Button` scales its surface, not its label** (`ui.tsx:180-207`).
3. **Partner-color law audit.** Fix the two Home violations; grep every
   `primarySoft`/`primary` usage that renders partner-authored data.
4. **Em-dash sweep** of all UI strings (4 found; likely more). House rule.
5. **Serif discipline.** Fraunces: screen titles, section titles, payoff lines.
   Inter: card titles, buttons, data, labels. Trial on Home before app-wide.
6. **Reduced motion.** `AccessibilityInfo.isReduceMotionEnabled` → a flag in
   `theme/motion.ts`; ambient loops, confetti, staggers, and flips degrade to
   fades. Non-negotiable for the Award bar.
7. **Contrast pass.** `textFaint` placeholders (~2.4:1) → use `textSoft` for
   placeholder text; hero-tag 11px white-on-gradient → 12px semibold on a
   deepened chip; Wordle tile variants per 1.5.
8. **Token strays** → `colors.ts` (Wordle grays, `GRID_BORDER`, inline rgba
   borders that repeat).
9. **Enter/exit transitions for conditional blocks** (260ms in / 170ms out,
   `easeOut`), so cards never pop into existence.

---

## 3. Three net-new retention hooks

Chosen to cover the four requested levers (anticipation, async connection,
haptics, widgets), to be honest-data-only, web-parity-safe, and to build on
infrastructure that already exists (`ourDay.ts`, `digest.js`, `portalSnapshot`,
`webPush`, `expo-haptics`). None are chat, galleries, or calendars.

### Hook A: The Golden Hour (the shared-minute ritual)

**Mechanic.** Our Day already computes the golden window; today it is a
sentence. Make it an *event*. Each day the app lights a lantern for the
window's first hour (or a minute the couple pins). At lantern-time both phones
bloom and play one synchronized heartbeat haptic. If **both** open Tether while
the lantern burns (presence heartbeat already proves it, honest data), the
hearth ignites: the ambient bloom goes to full warmth, a one-time shared
animation plays, and Through the Glass is one tap away. The day leaves a small
ember on the week strip.

**Anticipation surface.** The Android Portal widget spends the whole day
dimming toward tonight: "Tonight, 9:10 PM · the lantern is lit." On iOS PWA
(no widgets) the Day Ribbon carries the lantern state and web push fires at
lantern-time.

**If one of you misses it:** no streak, no guilt (principle 5). The other
finds a warm trace: "You missed me by 40 minutes. I left the lantern warm,"
plus whatever the present partner left (a knock, a stroke, a line). Embers
accumulate as a quiet constellation on a month view, a picture, never a number
that can break.

**Why it retains.** It manufactures the single most valuable event for a
two-person app: a *synchronized* daily open with a variable reward (did we
both make it? what happens inside?). It also finally makes Our Day's math pay
emotional rent. Effort: M (window compute, presence, push, widget all exist).

### Hook B: The Morning Paper (the sealed overnight digest)

**Mechanic.** In an LDR across timezones, their evening happens while you
sleep. Bundle everything the partner did overnight (check-ins, feelings,
canvas strokes, Wordle result, a letter written, a plan added) into one sealed
envelope that **cannot be opened before your morning** (first unlock after
5am local). Opening is a gesture: drag the seal down with damping, it tears at
the threshold with `hHeavy`, and the items cascade in with the house stagger.
Urgent things (SOS, live hugs) never wait; the Paper is for the ambient trail.

**Anticipation surface.** Widget + morning push: "The paper's on the doorstep
🤍 3 things from Riya." You know *that* there are three things, never *what*,
the same asymmetric tease the Reveal already proves works.

**Why it retains.** It guarantees a rewarded morning open (pairing with Hook
A's evening open = two anchored sessions/day), and it is the structural fix
for Home: the alert stack drains into it. Builds directly on
`functions/digest.js` + `lib/activity.ts`. Effort: M.

### Hook C: Our Knock (haptic signatures)

**Mechanic.** Everyone knocks on a door differently. Each partner records a
short rhythm by tapping the screen (≤3s, stored as a handful of ms offsets, a
few bytes). That rhythm becomes their **tactile signature**: hugs, "thinking
of you," and Golden Hour arrivals play the partner's *actual knock* as a
sequenced haptic pattern with a matching visual ripple. Variant: set a "secret
knock" on the Time Capsule or a sealed letter; answering their rhythm (tap it
back, tolerance-matched) breaks the seal.

**Platform truth.** Android: real sequenced haptics via `expo-haptics`. iOS
PWA has no vibration API: the ripple plays the rhythm visually (and optional
soft tick audio), same information, degraded texture, which satisfies "web-safe
or it doesn't ship."

**Why it retains.** Personalization is stored value (the hook model's
investment step): after months you recognize each other's knock the way you
recognize footsteps, and the phone stops feeling like a phone. It deepens the
existing ping loop instead of adding a new surface. Effort: S. It is also the
app's moat: no messaging app has a body.

---

## 4. Tear-down: consolidate, redesign, deprecate

The app has ~26 routes for 2 users. Every redundant surface dilutes the
rituals that retain. Honest usage data exists (it is your own), so where I
mark "verify," check it before cutting.

| Feature | Verdict | Rationale / destination |
|---|---|---|
| Closeness /100 hero | **Redesign** | Retire the daily number from Home → The Hearth (1.1); score becomes a weekly qualitative reflection in Insights |
| Home alert stack | **Redesign** | Priority queue of exactly one; the rest drain into Time Capsule + Morning Paper |
| "Together today" card (Home) | **Deprecate** | Pure navigation duplication of Us/Games/Deck |
| Countdown zero-state card (Home, permanent) | **Deprecate** | Becomes a whisper candidate instead of a fixture |
| Week mode (Our Day) | **Deprecate** | Week strip already navigates; agenda list is a second render of the same data |
| Snakes & Ladders · Ludo · TicTacToe | **Keep (decided)** | Product owner call, July 2026: all three board games stay |
| This or That · Would You Rather · Know Me | **Consolidate** | One "Questions" shell (the `ChoiceGame` chassis already generalizes); modes inside, one entry in Us |
| Intimacy Deck vs Reveal vs "Ask each other" | **Consolidate** | Reveal stays the ONE daily Q&A anchor on Home; Deck lives inside Questions; the Home "Ask each other" tile goes with the Together card |
| Countdown + Occasions | **Consolidate** | One "Our Dates" screen: reunion pinned as the hero, occasions beneath; one Home alert slot (today/imminent only) |
| Insights (Companion) | **Consolidate** | 78 lines; becomes a section inside Pulse (and receives the weekly closeness reflection) |
| Journal | **Consolidate** | "Your weeks, written back to you" is a Vault chapter; merge into Vault |
| Reminders | **Consolidate** | A Settings section, not a destination |
| Fog reveal, Reveal, Canvas, Wordle, Glass, Compass, Walk, Letters, Moments, MissYou/SOS | **Keep** | These are the identity; several get the Phase-2 polish above |

**Net effect:** Us menu 18 rows/6 sections → ~12 rows/4 sections; stack routes
26 → ~20; Home ~19 possible blocks → 9. Nothing becomes unreachable; the wider
house just stops competing with the hearth.

---

## 5. Sequencing (each phase ships independently)

- **Phase 1 · The grammar** (system fixes, Part 2): press unification, Button
  surface scale, partner-color law, em-dash sweep, contrast, reduced motion,
  tab-bar spring, enter/exit transitions. Low risk, app-wide feel-lift.
- **Phase 2 · The surfaces** (Part 1): Home diet + The Hearth → Our Day sheet
  + Golden Band + hold-to-promise → Wordle flip + ghost grid → Canvas
  undo/Clear relocation + first-run copy → Us live rows.
- **Phase 3 · The hooks** (Part 3), in retention order: Golden Hour → Morning
  Paper → Our Knock. (The Paper depends on the Home diet landing first.)

**Decisions (resolved July 2026):** build approved. The daily closeness
number retires from Home (weekly reflection lives in Insights); the serif
discipline ships app-wide (Fraunces speaks, Inter labels); all three board
games stay; Phases 1 and 2 implemented. Phase 3 (Golden Hour, Morning Paper,
Our Knock) and the remaining IA consolidations are the next tranche.
