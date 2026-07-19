# Tether: Conversion & First-Run Audit

Persona: conversion-obsessed founder/designer. Two passes: (1) designer tearing
apart visual decisions, (2) first-time end user clicking through the real app.
July 2026, post-Phase-3b (this audit assumes everything in AUDIT.md is shipped
and does not repeat it).

**Method.** Full code read of `src/`, plus a live browser walkthrough of the
web build (Chromium, 390x844 / 320x568 / 1440x900) completing onboarding as
the joining partner and visiting every tab and 11 stack screens. The
deterministic slop detector returned **zero** findings on `src`. The walkthrough
ran in local/demo mode so no test data touched the production Firestore space.

**Translation note.** This app has no trial to sell; there are exactly two
users. "Conversion" here means the only funnel that matters: **the partner
installs it, pairs successfully on the first try, and both phones feel the
other person within the first minute.** That funnel currently has real holes,
and they are all at the top.

**What already converts.** So it's said once: the Rose & Bloom identity is
committed and consistent, the one-alert Home holds, the Reveal screen is the
best single screen in the app ("Write it the way you'd whisper it..." is
world-class microcopy), the Us menu is a live status board, and the press
grammar is 95% unified. The problems below are concentrated in first-run,
web parity, and a few honesty gaps. None of them are taste; all of them are
losable-user moments.

---

## CRITICAL (fix before anything else)

### C1. Pairing has no success state and no failure state
`src/screens/OnboardingScreen.tsx:31`, `src/state/AppContext.tsx` (`createIdentity`)

The single make-or-break flow of the product accepts anything and confirms
nothing.

- **Joiner side:** "Join" mode accepts any string of 4+ characters
  (`joinCode.trim().length >= 4`). I typed a code with one wrong character and
  landed on a fully working, completely empty app. No error, no "we couldn't
  find Piyush's space", nothing, ever. In cloud mode the two phones would sit
  in parallel universes while both people quietly conclude the app (or worse,
  the partner) is ignoring them. Firestore rules already allow reading a space
  by id, so the client CAN verify: on join, look for the creator's profile doc
  (or any doc) under `spaces/{code}`; show "Found Piyush's space ✓" on match
  and "No space found with this code — check it character by character" on
  miss. Also enforce the real 12-char `XXXX-XXXX-XXXX` format the generator
  emits instead of `>= 4`.
- **Creator side:** after sharing the code there is no "Riya joined 🎉"
  moment — the word "joined" appears nowhere in the codebase. The creator
  stares at the same day-one Home with no idea whether pairing worked. The
  infrastructure exists (`partnerProfile`, `partnerSeenAt` sync already);
  render a "Your code is shared — waiting for Riya to join" state on day-one
  Home, and fire a one-time celebration (the house `Celebrate` petals) the
  first time the partner's presence appears. This is the single highest-value
  emotional beat the app currently throws away.

### C2. Onboarding pre-fills real names — the joiner corrupts the space by tapping through
`src/screens/OnboardingScreen.tsx:18-19`

`useState('Piyush')` / `useState('Riya')` as **values**, not placeholders.
Identity is derived from the name (`personId(name)`, `services/identity.ts:58`),
so the joiner who accepts the defaults becomes a second "Piyush": same
`p_piyush` id on both phones, turn-based games stick forever, presence lies,
partner data merges into self. Settings even contains apology copy for this
exact failure ("if a game sticks on 'their turn', the names don't line
up..."). On top of that, the segment control on Riya's phone reads "Join
Riya" — she is being asked to join herself.

**Fix:** ship the fields empty with placeholder text, disable "Begin" until
both names differ and are non-empty. Better, since the hero literally says
"for Piyush & Riya": replace free-text with a one-tap "Who are you?" choice
(Piyush / Riya) that fills both fields correctly and makes the join segment
label always true. Kill the whole failure class in one move.

### C3. The core promise is silently false for the iOS partner (no web push, including SOS)
`src/config.ts:55` (`fcmVapidKey = 'YOUR_VAPID_KEY'`), `WEB_PUSH.md`

The iOS half of this couple runs the PWA. With the VAPID key unset, web push
is entirely off: hugs, letters, golden-hour, and — the one that matters — the
**SOS "Emergency alert: instantly sound Piyush's phone"** do nothing unless
the app is already open in the foreground. Onboarding's First Steps even
promises "They feel it on their phone right away." A safety feature that
silently doesn't fire is worse than not having one.

**Fix (two halves):**
1. Do the 15-minute setup that's already documented in `WEB_PUSH.md`
   (generate the VAPID key pair, paste into `config.ts`, deploy the sender
   function). This is the highest ROI item in this entire document.
2. Until `isWebPushConfigured()` is true, the UI must stop over-promising:
   the SOS card and the first-hug hint should degrade honestly ("reaches
   them the moment they open Tether") instead of claiming instant delivery.
   Honest data is a house principle; honest *delivery* should be too.

### C4. Renaming yourself silently detaches you from your entire history
`src/services/identity.ts:58` (`personId`), `src/screens/SettingsScreen.tsx:124-134`

Identity is a slug of the display name. Settings lets either partner freely
edit "Your name" and save with zero warning — doing so mints a new
`p_<name>` and every check-in, letter, game turn, and ember you ever wrote now
belongs to a stranger. Same silent-corruption class as C2, reachable from a
totally innocent action ("let me fix the spelling of my name").

**Fix:** on save, if `personId(newName) !== personId(oldName)`, block with a
clear confirm: "Changing your name starts a fresh history on this phone.
Your old entries will show as a different person. Continue?" (Long-term: store
a stable random `userId` at creation and treat the name as a label — the
schema already carries `userId` separately, onboarding just derives it.)

---

## HIGH IMPACT

### H1. Web at tablet/desktop width looks broken — including the pairing link's first impression
`src/components/ui.tsx` (`Screen`), all screens

At 1440px everything stretches edge-to-edge: 1400px-wide text inputs on
onboarding, the two hearth faces separated by 700px of dead cream, tab items
1300px apart. The pairing code gets shared as a link; a partner (or their
laptop) opening it on desktop meets this as the first impression of an app
that's supposed to feel crafted. Web parity is a hard product requirement and
this is the cheapest large win available: cap the app shell at ~520px,
centered (`maxWidth` + `alignSelf: 'center'` + `width: '100%'` on `Screen`'s
content and on the tab bar), let the cream bg fill the rest. One component,
every screen fixed.

### H2. The flagship ritual card contradicts itself on an empty day
`src/screens/ScheduleScreen.tsx` ritual header, `src/lib/ourDay.ts` (golden window fallback)

Observed live: header label **"Tonight"**, payload **"You're free from
6:38 AM"** — a morning timestamp under an evening label, on the feature the
whole retention strategy leans on. The golden-window fallback treats "no
blocks shared" as "free from now" and the label doesn't follow. On a day with
nothing shared, don't print a computed time at all: "Share your plan and
we'll find your shared hour" — then let the golden band do its job once real
data exists. The ritual card must never look like a bug; it's the altar.

### H3. The Moments streak is a guilt mechanic the product explicitly bans
`src/screens/MomentsScreen.tsx` (🔥 N DAY badge)

Product principle 5: "the app whispers, never nags." The Golden Hour spec
went out of its way to say "no streak, no guilt", and built embers — a
picture that accumulates and *can never break*. Then Moments puts a literal
🔥 flame-streak in the header that resets to zero the first evening someone
falls asleep early. A breakable streak between partners doesn't retain, it
indicts. Replace with the house grammar: a total that only grows ("212
moments kept 🤍") or a mini ember-constellation of photo days.

### H4. One event announces itself three times on one screen
`src/screens/HomeScreen.tsx:272-321` (alert), `src/lib/activity.ts` (feed rows)

Day-one Home showed the same letter as (a) the gold alert card, (b) an
activity-feed row two cards below, and it also lights (c) the Us-menu live
row. The one-alert queue was built precisely to end double-announcing. Rule:
while an item is being surfaced as the Home alert, suppress its feed row
(feed = history, alert = now). Same de-dupe for hugs (alert + capsule) and
canvas strokes (capsule + feed).

### H5. The Morning Paper renders as a second stacked alert
`src/screens/HomeScreen.tsx:394-402`, `src/components/MorningPaper.tsx`

Live render: two gold, same-anatomy cards stacked (letter alert + paper). The
alert-stack this app fought to kill is quietly regrowing, and — worse — the
paper's own contents *include* the letter the alert above it announces. Two
options, either is fine: (1) while the unopened paper is showing, let the
paper BE the alert (suppress the queue for paper-contained items); (2) make
the paper visually a different object class (it's a ritual artifact, not an
alert): white/paper surface, seal, distinct silhouette. Currently it's tone
`gold` card + emoji + title + sub — identical anatomy to the alert above it.

### H6. Invalid nested `<button>` HTML on the primary web surface
`src/screens/HomeScreen.tsx:537-560` (whisper: `Press` wrapping the dismiss
`Pressable`), same pattern in `MorningPaper`'s inline heart

Chromium logs "In HTML, <button> cannot be a descendant of <button> / this
will cause a hydration error" on Home. On the iOS PWA — one partner's only
platform — nested buttons are undefined behavior for VoiceOver and can
misfire taps. Restructure: the row is a plain `View`; the navigate surface
and the × dismiss are sibling pressables (absolute-position the × over the
corner if needed).

### H7. The feed prints the same sentence three times in a row
`src/lib/activity.ts` (`buildActivity`)

"Piyush added a reason they love you" × 3 consecutive identical rows on my
first Home. Coalesce same-author same-kind bursts within a window: "Piyush
added 3 reasons they love you 💗" → route to the same screen. First
impressions read the feed as the app's pulse; a stutter reads as a bug.

### H8. The em-dash house rule is still violated in shipped UI copy
`src/screens/RevealScreen.tsx:124`, `src/screens/MissYouScreen.tsx:286`,
`src/screens/WalkScreen.tsx:205,224`, `src/screens/DeckScreen.tsx:158`

DESIGN.md bans em-dashes in UI copy; the Phase-1 sweep missed at least these
five user-facing strings ("No peeking — for either of you.", "…tap the Share
button below, then 'Add to Home Screen' — alerts only work…", etc.). Sweep
string literals only (comments are fine).

---

## NICE TO HAVE

### N1. Pulse check-in pre-answers itself
`src/screens/PulseScreen.tsx:48-52` — mood defaults to `'content'`, sliders to
3/3/4. One thoughtless tap ships a plausible-looking but unconsidered
check-in to your partner ("honest data only" says otherwise). Start mood
unselected; disable "Share my pulse" until a mood is chosen. Bonus: the
placeholder "e.g. a little patience, or just to hear your…" truncates at
390px — shorten it.

### N2. The empty Time Capsule is invisible and unexplained
`src/screens/HomeScreen.tsx:670-694` — an empty white glass orb on a cream
header reads as a rendering artifact until tapped. Give the empty orb a faint
rim tint, and teach it once with the same one-shot coach pattern used for the
green heartbeat ("that little orb glows when Piyush leaves you something").

### N3. Wordle doesn't fit short screens
`src/screens/WordleScreen.tsx` — at 320x568 the board fills the viewport and
the keyboard lives below the fold; you type blind. Scale tile size from
viewport height (the board is the flexible element; the keyboard never is).

### N4. Narrow-phone header eats half the screen
`src/components/ui.tsx:408` — "Good morning, Riya" at Fraunces 32 wraps to
three lines at 320px. Add a length-aware step-down (30/28) or
`adjustsFontSizeToFit` with a floor.

### N5. Two placeholder grays
`src/screens/OnboardingScreen.tsx:219`, `src/screens/SettingsScreen.tsx:312` —
the date-row placeholders still use `textFaint` (~2.4:1) while `Field`
placeholders were upgraded to `textSoft`. Unify on `textSoft`.

### N6. Last stray from the press-grammar unification
`src/screens/MissYouScreen.tsx:249` — the SOS card presses with
`opacity: 0.92`. House grammar: scale via `Press`. (Yes, it's the one card
where feedback mattering most.)

### N7. Developer voice in end-user Settings
`src/screens/SettingsScreen.tsx:159` — local mode says "add your free
Firebase keys in src/config.ts, see SETUP.md". Real users can't edit source.
Cloud mode is always on in production so it's latent, but reword to a
human sentence anyway.

### N8. Joining could forgive formatting
`src/screens/OnboardingScreen.tsx:150-157` — the join field uppercases but
doesn't auto-group. Auto-insert dashes every 4 chars and accept pasted codes
with spaces/lowercase (normalize already exists — call it on input, not just
on submit).

### N9. "Begin our space" deserves a landing beat
`src/screens/OnboardingScreen.tsx:60-68` — tapping Begin hard-cuts to Home
mid-scroll. A ~1.5s "Your space is ready 🤍" moment (heart bloom, then Home
cascades in) would make the threshold feel like one. The `Celebrate`
component already exists.

---

## Walkthrough log (what a first-timer actually hit, in order)

1. Onboarding: gorgeous hero; then my partner's name is already in *my* name
   field, and a button invites me to "Join Riya" — I *am* Riya (C2).
2. Chose Join, typed the code with one wrong character: accepted instantly,
   no verification of any kind (C1).
3. Home day one: warm, alive, the coach-mark for the green heartbeat is
   great — but the same letter is announced twice on screen (H4/H5) and the
   feed stutters the same line three times (H7).
4. Tapped the little white orb expecting nothing — got a lovely toast. I
   only found it by accident (N2).
5. "Our day" told me at breakfast that "Tonight — you're free from 6:38 AM"
   (H2).
6. Moments greeted our first-ever photo with a 🔥 1-DAY streak (H3).
7. On my laptop the same app was a 1400px-wide ribbon of stretched cards
   (H1).
8. Read the SOS card's promise, then read `config.ts` — my phone would never
   have rung (C3).

Feed this file to the implementation pass top-down: C1→C4 are the funnel,
H1→H8 are the polish that makes the funnel feel inevitable, N* when the
house is quiet.
