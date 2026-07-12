# Tether — Design System ("Rose & Bloom")

Warm ink-on-cream, editorial serif, romantic. The identity is committed: do
not drift it toward generic AI defaults, and do not swap the serif.

## Tokens (source of truth: `src/theme/`)

- **Background** `#FBF8F6` warm paper · **Surface** `#FFFFFF` · **Alt** `#F6F0EC` · **Border** `#F0E8E3`
- **Ink** `#2E2A2A` · soft `#6F6663` · faint `#A89F9B`
- **Primary (rose)** `#E8638C` / soft `#FCE8EE` / dark `#C7416B`
- **Accent (violet)** `#7C6BD6` / soft `#ECE8FA` — the partner's color everywhere
- Gold `#D89A2E`, Good `#4FA486`, Warn `#E0894B`, Danger `#D9534F` (each with a soft tint)
- **Type:** Fraunces (display, tight tracking −0.9/−0.4) + Inter (UI). Scale 12→36.
- **Spacing:** strict 8px grid with 4px half-steps (`spacing.xs…xxl`).
- **Radius:** 12/16/24/30/pill. Cards 24, buttons pill, chips pill.
- **Shadows:** soft, wide, warm-tinted (`rgba(80,46,64,…)`); hero shadow is rose.
- **Gradients:** rose→violet hero, per-game signatures, ambient presence glows.

## Motion (`src/theme/motion.ts`)

- `Animated` + `useNativeDriver`, transform/opacity only, for everyday UI.
- Reanimated + Gesture Handler are reserved for surfaces that need the UI
  thread: the Shared Canvas ink (SVG path built per frame in a worklet) and the
  Wordle error shake (spring impulse). Don't reach for them for ordinary
  presses/reveals — `Animated` springs stay the house instrument.
- Springs: gentle / snappy (tension 300, friction 22) / bouncy. Micro-interactions
  land <300ms; buttons press to scale 0.96; ambient loops (breathing, pools)
  use sine ease and may be slow. High-frequency inputs (keyboards, wipes) get
  instant pressed states, never queued animations.
- Web = iOS Safari PWA: never rely on ScrollView momentum events for state
  (they don't fire) — taps commit state, wheels are native-only (see TimeDial).

## Conventions

- Every tappable is `Pressable` with `accessibilityRole`, small targets get
  `hitSlop` ≥ 12.
- No colored side-stripe borders on cards; use tinted surfaces or the rail dot.
- Confirmations go through `src/lib/alert.ts` (web-safe Alert), never RN Alert.
- One quiet nudge on Home at a time (whisper system); alert cards are for
  things that genuinely need the person now.
- Copy: first person, warm, specific; 🤍 is the house mark. No em-dashes in UI copy.
- Partner data renders in violet, mine in rose — consistently, everywhere.
- Borders are earned, not default: inputs/chips/level dots are filled tinted
  surfaces (`surfaceAlt`), not outlined boxes. Card hairline + warm shadow is
  the only ambient edge.
- Shared Canvas: vector strokes (normalized coords, JSON on the synced doc),
  one Firestore write per stroke on finger lift, never mid-stroke; the legacy
  pixel board renders underneath. New native deps (svg / gesture-handler /
  reanimated) mean the next APK must be a fresh EAS build before OTA updates.
