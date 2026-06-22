# Build Tether for iPhone (and turn on push)

A focused, iPhone-only walkthrough. iOS builds happen in Expo's cloud, so you do
**not** need a Mac. Set aside about 30 minutes, most of it waiting on the build.

---

## Do push notifications need any setup?

There are two kinds of notification in Tether. Be clear on which you want:

**1. On-device reminders and the in-app alarm. No setup needed.**
The plan-your-day nudge, photo nudges, anniversary reminders, and the loud SOS
alarm while the app is open are all local to the phone. They start working the
moment you tap **Allow** on the notification prompt at first launch. No Apple
key, no servers, nothing to configure.

**2. Push that reaches your partner when their app is fully closed. One step.**
An SOS, a hug, or a new moment that lands on the other phone even when Tether is
closed travels: Tether -> Expo's push service -> Apple (APNs) -> your partner's
iPhone. For iPhone that path needs an **Apple Push key**.

You do not create that key by hand. During the build (Step 5 below) EAS asks
*"Would you like to set up Push Notifications?"*; answer **Yes** and it generates
and uploads the key for you. That is the only push step. (Android's equivalent is
already wired through `google-services.json`.) **No code changes are required.**

For #2 to actually deliver, all of these must be true:
- You have an active Apple Developer account (the same one you need to install on
  iPhone at all).
- The app is a real build (TestFlight or internal), not Expo Go.
- It is running on a **physical iPhone** (push never works on the Simulator).
- **Both** of you installed the build and tapped Allow, so each phone has
  registered its push token.

If you skip the push key, Tether still works fully; you just will not get
SOS/hugs delivered while the app is force-closed. Local reminders and the in-app
alarm still fire.

---

## What you need (one time)

- A computer (Mac or Windows) with this project folder and **Node.js** installed.
- A free **Expo** account: <https://expo.dev>. This project is already linked to
  the `piyushkhadse` account.
- A paid **Apple Developer** account ($99/year), membership active:
  <https://developer.apple.com>. This is Apple's rule for putting any custom app
  on an iPhone, not specific to Tether.
- The iPhone(s) you want to install on.

---

## Step by step (TestFlight, recommended for both of you)

TestFlight is the smooth path because you invite people by email; you never have
to register each device.

**1. Get the latest code** in a terminal opened in the project folder:
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

**4. Sign in to Expo** (use your expo.dev login):
```
eas login
```

**5. Build the iPhone app:**
```
eas build -p ios --profile production
```
- When it asks to **log in to your Apple account**, do it. EAS creates the
  signing certificate and provisioning profile for you.
- When it asks **"Would you like to set up Push Notifications?"**, choose
  **Yes**. This creates the Apple Push key. (This is the push step.)
- The build runs in Expo's cloud and takes roughly 15 to 25 minutes. Once it says
  the build is queued/uploaded you can even close the laptop.

**6. Send the build to TestFlight:**
```
eas submit -p ios --latest
```
- The first time, it asks for App Store Connect access and can create the app
  record for you. Follow the prompts. It uploads the finished build to Apple.

**7. Install on the iPhone(s):**
- Install the free **TestFlight** app from the App Store on each iPhone.
- Go to <https://appstoreconnect.apple.com> -> your app -> **TestFlight** ->
  add yourself and your partner as **Internal Testers** (by Apple ID email).
  Internal testers need no Apple review and get it within minutes.
- Open the invite email or TestFlight and tap **Install**. Tether now lives on
  the home screen like a normal app.

**8. First open:**
- Open **Tether** (not Expo Go). Tap **Allow** when it asks about notifications
  (this is what registers the push token).
- Enter your names and the **same pairing code** on both phones.

Repeat Step 7 for your partner by inviting their Apple ID. No device
registration needed.

---

## Quicker alternative for just your own iPhone (no TestFlight)

If you only want it on one iPhone right now:

**1. Register that iPhone:**
```
eas device:create
```
Pick the website/URL option, open the link on the iPhone, and install the small
profile it offers. This records the device so the build can run on it.

**2. Build an internal copy:**
```
eas build -p ios --profile preview
```
Say **Yes** to push notifications when asked, same as above.

**3. Install:** when the build finishes, open its page on the iPhone (Safari) and
tap **Install**. It installs over the air because the device is registered.

Downside: every new iPhone must be registered and the app rebuilt, so for your
partner's phone TestFlight (above) is easier.

---

## Notes

- **Nothing in the code needs changing.** Bundle id (`com.tether.app`), the
  notifications plugin, the alarm sound, and the push-token wiring are already
  set up, and `eas.json` already has the build profiles.
- **Updating later:** re-run `eas build -p ios --profile production` and then
  `eas submit -p ios --latest`; testers get the update through TestFlight. (For
  instant over-the-air JS updates without a rebuild, ask about EAS Update.)
- **Both phones must be on the same pairing code** for anything to sync between
  you.

Stuck on a step? Tell me exactly what the screen says and I will guide you.
