# Tether 🤍

*Close, across any distance.*

A private **emotional-connection app for two** — just you and your partner. Most
long-distance apps are another chat box. Tether is built around the harder
problem: feeling **seen, understood, and secure** when you can't be together.

It combines the four ideas that matter most into one experience:

- 💗 **Emotional Pulse Check** — a daily feeling + need + energy/stress/affection
  check-in that turns into conversation starters, concrete ways to support each
  other, and an early warning when one of you has been struggling for days.
- 💜 **Attachment-Aware Companion** — quietly notices patterns (withdrawal,
  persistent stress, reassurance-seeking) *before* they become fights, and
  coaches both of you toward a healthier response.
- 🤍 **"When I Miss You" Kit** — a one-tap emotional first-aid kit: reasons
  you're loved, a shared memory, something to look forward to — plus **Send a
  Hug** pings with haptic buzz.
- 📖 **AI Relationship Journal** — a warm monthly "scrapbook page" narrated
  automatically from your check-ins, memories and letters.

…and the supporting cast: **Memory Vault** (with "on this day" resurfacing),
**Delayed Love Letters**, an **Intimacy Deck** of closeness questions, a
**Shared Future Board**, and a **Relationship Health** dashboard.

No feeds. No followers. No one else. Ever.

---

## Quick start (get it on both phones in ~5 minutes)

You don't need to be a developer.

1. **Install Node.js** (LTS) on a computer: <https://nodejs.org>.
2. In this folder, install dependencies:
   ```bash
   npm install
   ```
3. Start it:
   ```bash
   npm start
   ```
4. On **both** phones, install the free **Expo Go** app (Android: Play Store).
   Scan the QR code shown in the terminal. The app opens on each phone.
5. On the first screen, enter your names and a **pairing code**. Use the **same
   code on both phones** — that's the private link between you two.

Out of the box the app runs fully **on-device**, so you can explore every
feature immediately (your partner's side is gently pre-filled with a demo so
nothing looks empty).

➡️ To make the two phones actually **sync in real time**, follow
**[SETUP.md](./SETUP.md)** — a 5-minute, free Firebase walkthrough. The moment
you paste your keys into `src/config.ts`, the app switches from local storage to
live cloud sync automatically.

### Prefer to look first on a laptop?

You can run the whole app in a desktop browser — no phone needed:

```bash
npm install
npm run web
```

It opens Tether in your browser using on-device storage, so you can click
through every screen right away. Great for a quick look before installing on
your phones.

To build a real installable **APK** later, see the EAS Build section in
[SETUP.md](./SETUP.md).

---

## How it's built

- **Expo / React Native + TypeScript** — one codebase, runs on both your phones.
- **Cloud sync** via **Cloud Firestore** (optional, free tier). A single tiny
  data API (`src/services/db.ts`) has two backends — `LocalDb` (AsyncStorage)
  and `FirestoreDb` — and the screens never know which is active.
- **"Smart templates" engine** powers the AI-style features today with no API
  key and no cost (`src/lib/`). It's deterministic and private — nothing leaves
  your space. See *Switching on real AI* below.

```
src/
  config.ts            ← put Firebase keys here to enable sync
  theme/               ← colors, spacing, typography
  types/models.ts      ← all data shapes
  services/            ← firebase, db (local⇄cloud), identity, demo seed
  lib/                 ← pulse, attachment, journal, health, intimacy, mood, date
  state/AppContext.tsx ← app-wide state + actions, wired to the data layer
  components/ui.tsx    ← the design system (cards, buttons, inputs, …)
  screens/             ← Home, Pulse, MissYou, Vault, Letters, Deck, Journal,
                         Insights, Future, Settings, More, Onboarding
  navigation/          ← bottom tabs + stack
```

Useful scripts:

```bash
npm start          # run in Expo Go
npm run android    # open on a connected Android device/emulator
npm run typecheck  # tsc --noEmit
```

## Privacy

Everything lives inside a single shared "space" identified by your pairing
code. In local mode it never leaves the phone. In cloud mode it's stored under
`spaces/<your-code>` in *your own* Firebase project — not ours, not anyone's.
For extra safety, keep your pairing code long and private (see the security note
in SETUP.md).

## Switching on real AI later

The journal narrator (`src/lib/journal.ts`) and the attachment companion
(`src/lib/attachment.ts`) are pure functions that take your data and return
text. To upgrade them to live **Claude** prose, call the Anthropic API inside
those functions (or a small wrapper) and feed it the same data — the rest of the
app doesn't change. Default to the latest Claude model when you do.

---

Made with care, for closing the distance.
