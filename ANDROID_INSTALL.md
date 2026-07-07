# Build and install Tether on Android (full features, free)

Android is the free path, and it gives you everything: the real installed app,
cloud sync, and full notifications (including an SOS that reaches the other phone
even when Tether is closed). No fees, no Apple account.

There are two pieces, then you install on both phones:
1. Build the APK (an installable Android file). Expo builds it in the cloud.
2. Turn on push by handing Expo one free key from Firebase.

Set aside about 30 minutes, most of it waiting on the build.

---

## Do notifications need any setup?

- **On-device reminders and the in-app alarm** (plan-your-day nudge, photo
  nudges, anniversary reminders, the loud alarm while the app is open): **no
  setup**. They work the moment you tap **Allow** at first launch.
- **Push that reaches a closed phone** (SOS, hugs, a new moment): needs **one
  free step**, Part 2 below, where you give Expo your Firebase Cloud Messaging
  (FCM) key. **No code changes anywhere.**

---

## What you need (one time)

- A computer (Windows or Mac) with this project folder and **Node.js**.
- A free **Expo** account: <https://expo.dev>. This project is already linked to
  the `piyushkhadse` account.
- The **Firebase** project you already use for sync (`tether-aee5d`). Free.
- Both Android phones.

No Apple account and no payment anywhere.

---

## Part 1. Build the installable APK

In a terminal opened in the project folder:

**1. Get the latest code:**
```
git checkout claude/trusting-tesla-udokel
git pull
```

**2. Install dependencies:**
```
npm install
```

**3. Install the cloud builder:**
```
npm install -g eas-cli
```

**4. Sign in to Expo:**
```
eas login
```

**5. Build the APK:**
```
eas build -p android --profile preview
```
- This uploads the project and builds an **APK** in Expo's cloud, roughly 15 to
  20 minutes. Once it says the build is queued you can even close the laptop.
- When it finishes you get a **link and a QR code**. Keep that link; you use it
  in Part 3.

---

## Part 2. Turn on push notifications (FCM, free)

This is what lets an SOS or a hug land on the other phone when the app is closed.
Do it once.

**1. Download your FCM key from Firebase:**
- Go to <https://console.firebase.google.com> and open your project
  **`tether-aee5d`**.
- Click the **gear icon -> Project settings**.
- Open the **Service accounts** tab.
- Click **Generate new private key -> Generate key**. A **`.json`** file
  downloads. Treat it like a password; do not share or commit it.

**2. Hand that key to Expo:**
```
eas credentials
```
- Choose **Android**.
- Choose the **preview** build profile (the same one you built).
- Pick the **Push Notifications (FCM V1) / Google Service Account Key** option
  (the exact wording shifts between versions, it is the push / FCM one).
- Upload the **`.json`** file you just downloaded.

> Prefer clicking? You can do the same on the website: **expo.dev -> your project
> -> Credentials -> Android -> FCM V1 -> upload the `.json`**.

That is it. Expo can now deliver push to your Android app.

> If you skip Part 2, Tether still installs and works, and local reminders still
> fire. You would only miss the messages that reach a fully closed phone.

---

## Part 3. Install on both phones

1. On each Android phone, open the **build link** from Part 1 in the browser.
2. Tap to **download** the APK, then tap the downloaded file to **install**. If
   the phone warns about "unknown sources" or an "unsafe" file, allow it this
   once when it offers the Settings toggle. (This is normal for any app not from
   the Play Store.)
3. Open **Tether** (the new icon, not Expo Go). Tap **Allow** when it asks about
   notifications. That is what registers the phone for push.
4. Enter your names and the **same pairing code** on both phones.

Done. Both phones now run Tether on their own, anywhere with internet. Check-ins,
hugs, photos, the schedule, your dates, and "Clear the air" all sync between you.

---

## Part 4. Updating later, without rebuilding (EAS Update)

The app now has **EAS Update** wired in. Once the APK from Part 1 is installed,
most future changes (screens, text, logic, images) reach both phones **over the
air**, no new APK, no reinstall.

To push an update, from the project folder:
```
npx eas-cli@latest update --branch preview --message "what changed"
```
- `--branch preview` must match the build's channel. The `preview` APK uses the
  `preview` channel, so use `--branch preview` for it. (A `production` build uses
  `--branch production`.)
- It bundles the latest JS and assets and uploads them in under a minute. Each
  phone picks up the update the next time it opens Tether (it downloads in the
  background and applies on the following launch).

You only need a **new APK** (Part 1) when you change native bits: the app
version, native packages, icon/splash, permissions, or `app.json` native config.
Everyday JS and content changes just use `eas update`.

---

## Notes

- **Nothing in the code needs changing.** The package id (`com.tether.app`),
  `google-services.json`, the notifications plugin, the alarm sound, and the
  push wiring are already set up, and `eas.json` already has the build profiles
  and update channels.
- **Test the SOS** once both phones are installed and you finished Part 2: from
  one phone, trigger an SOS while the other phone has Tether fully closed. It
  should alarm through.
- **Native vs over-the-air:** change app version, native packages, the icon or
  permissions -> rebuild the APK (Part 1). Change screens, text or logic ->
  `eas update` (Part 4), no reinstall.
- **Play Store later (optional):** that uses `--profile production` (an `.aab`)
  and a one-time $25 Google fee. Not needed to use the app the way above.

Stuck on a step? Tell me exactly what the screen says and I will walk you
through it.

## The Portal widget (home screen)

The build now ships a home-screen widget: one warm line about your partner
(sealed answer waiting, fog on the canvas, when they come free, their mood)
plus the reunion countdown, straight on your launcher. To use it after
installing a build that includes it:

1. Long-press your home screen → Widgets → Tether → place "Tether".
2. Open the app once so it can light the portal (the widget draws from the
   app's last-known data and refreshes whenever you use the app, plus every
   ~30 minutes on its own).

Requires a NEW APK (native module): `eas build --profile preview --platform android`.
An `eas update` alone will not add the widget — but it is safe to send to old
builds (the widget code no-ops on binaries that predate it).
