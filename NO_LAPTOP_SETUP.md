# Run Tether on your phones without a laptop

The laptop is needed only ONCE, for setup. After that, Tether lives on both
phones as a normal app and works on its own, anywhere with internet. No laptop,
no Wi-Fi sharing, no QR codes.

Two things make "no laptop" possible:
1. **Cloud sync** so the two phones talk to each other over the internet.
2. **Installing Tether as a real app** so it does not need the laptop's server.

Do this one-time setup with the laptop on, then you are free.

---

## What you need (one time)

- Your Mac with the **tether** project folder (from MAC_SETUP.md).
- Both phones.
- A free **Expo** account (expo.dev). Used to build the app.
- A free **Google** account (for Firebase cloud sync).
- **Only for iPhone:** a paid **Apple Developer** account ($99/year). This is
  Apple's rule for installing custom apps on an iPhone, not ours. If both of you
  use Android, everything below is free.

Set aside about 45 minutes. Most of it is waiting while the app builds.

---

## Part A. Turn on cloud sync (so the phones share, not the laptop)

Without this, the two phones never exchange anything. Do it once.

1. Follow **SETUP.md → section "B. Turn on cloud sync with Firebase."** It is
   click by click.
2. The result: you paste 6 values into the file **`src/config.ts`** and save.
3. That is it. Your phones will now sync through Google's servers, so the laptop
   is never in the middle.

> Tip: also do "B5. Lock it down" in SETUP.md, and use a long, private pairing
> code. It keeps your space just for the two of you.

---

## Part B. Build the installable apps (the one technical part)

You will run a few commands from the **tether** folder. The actual building
happens in Expo's cloud, so your Mac is only needed to start it.

1. Make a free account at **https://expo.dev**.
2. In Terminal (inside the **tether** folder), install the builder:
   ```
   npm install -g eas-cli
   ```
3. Sign in (use your expo.dev login):
   ```
   eas login
   ```
4. Prepare the project (press Enter to accept the suggestions):
   ```
   eas build:configure
   ```

### Android phone (free)
```
eas build -p android --profile preview
```
- This uploads your project and builds an **APK** (an installable Android file)
  in the cloud. It takes roughly 15 to 20 minutes. Once it says "uploaded", you
  can even close the laptop.
- When it finishes you get a **link and QR code**. On the Android phone, open the
  link and tap to install. If the phone warns about "unknown sources", allow it
  for this once.
- Repeat the install on the second Android phone using the same link.

### iPhone (needs the Apple Developer account)
```
eas build -p ios --profile preview
```
- Follow the prompts to sign in with your Apple account. EAS handles the signing
  and builds in the cloud (no Mac build needed).
- The easiest way to get it onto the iPhones is **TestFlight**:
  ```
  eas submit -p ios --latest
  ```
  Then install the free **TestFlight** app on each iPhone and accept the invite
  Apple emails you. Tether then installs like a normal app.

---

## Part C. First open on each phone (then you are done)

1. Open **Tether** (the installed app now on the home screen, not Expo Go).
2. Enter your names and the **same pairing code** on both phones.
3. That is it. From now on, both phones run Tether on their own, anywhere, with
   no laptop and no Wi-Fi sharing. Check-ins, hugs, letters and memories sync
   over the internet.

---

## Honest notes

- **Android is free and simple.** If both of you have Android, you never pay
  anything.
- **iPhone needs the $99/year Apple account.** That is Apple's requirement for
  any custom app, not specific to Tether. TestFlight is the smooth path.
- **The build step is the only technical bit.** Everything is pre-configured
  (app name, ids, and `eas.json`), so a tech-savvy friend can do Part B in about
  20 minutes if you would rather not.
- **Updating later:** when you want changes, re-run the same `eas build` command
  and reinstall. (For instant over-the-air updates without rebuilding, ask me
  about "EAS Update" later.)

Stuck on any step? Tell me exactly what the screen says and I will guide you.
