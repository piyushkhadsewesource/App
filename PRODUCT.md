# Tether

Close, across any distance.

## What it is

A private companion app for exactly two people — a couple in a long-distance
relationship (built by Piyush for Piyush & Riya). One shared "space" syncs in
real time via Firestore. There are no accounts to browse, no feed, no public
surface: everything in the app is by one of them, for the other.

- **Register:** product (app UI). Design serves the relationship, never shows off.
- **Platforms:** Android native app (Expo/EAS APK) + iOS as an installed web
  PWA (Add to Home Screen). One React Native codebase; web parity is a hard
  requirement, and every native module is guarded for web.
- **Users:** two specific people who open it many times a day, usually for
  under a minute — a hug, a glance at the other's day, a photo.

## Feature map (all synced live between the two phones)

- **Home** — the hearth: presence ("active now"), Day Ribbon (Our Day at a
  glance), contextual alert cards, activity feed, one quiet "rediscover" nudge.
- **Pulse** — daily mood check-ins and feelings through the day.
- **When I miss you** — hugs/kisses/thoughts, miss-o-meter, comfort kit, and
  the SOS emergency alert that sounds the partner's phone.
- **Through the Glass** — simultaneous touch + each other's recorded heartbeat.
- **The Compass Rose / True North** — a needle and camera lens that point at
  the partner across the world.
- **Walking Each Other Home** — steps close the literal distance between them.
- **Our Day** — each shares their day's shape; the app finds when both are
  free (the golden window) and lets one propose "a moment together" the other
  accepts. Busy blocks can import from a calendar's secret ICS link.
- **Moments, Letters, Vault, Journal, Future board, Occasions, Countdown,
  Games (Canvas/Wordle/TicTacToe/Snakes/Ludo), Intimacy deck, Clear the air,
  Companion insights** — the wider house, organised under the "Us" tab.

## Product principles

1. **Tender, never clinical.** Copy speaks to one person about their partner.
2. **Never block a feeling on the network.** Optimistic writes; toasts, not spinners.
3. **Honest data only.** No fake liveness, no invented numbers.
4. **Both platforms or neither.** A feature ships web-safe or it doesn't ship.
5. **Quiet by default.** One nudge at a time; the app whispers, never nags.
