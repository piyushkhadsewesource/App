# Setup guide

Two parts: **(A)** run it on your phones, and **(B)** turn on real-time cloud
sync so both phones share the same space. Part A works on its own; do Part B
when you're ready for the long-distance magic.

---

## A. Run it on both phones (free, ~5 min)

1. Install **Node.js** (LTS) on a computer: <https://nodejs.org>.
2. Open a terminal in this project folder and run:
   ```bash
   npm install
   npm start
   ```
3. On **each** phone, install **Expo Go** from the Play Store (Android).
4. Scan the QR code from the terminal with Expo Go. Tether opens on the phone.
5. On the welcome screen, enter your names + a **pairing code**. Use the **same
   code on both phones**.

> Your computer and phones should be on the same Wi-Fi. If the QR won't connect,
> run `npx expo start --tunnel` instead.

At this point each phone stores data locally. To share data between them, do
Part B.

---

## B. Turn on cloud sync with Firebase (free)

Firebase is Google's free backend. You'll create a project and paste 6 values
into `src/config.ts`. No coding.

### 1. Create a Firebase project
1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. **Add project** → name it (e.g. "tether") → you can disable Analytics →
   **Create project**.

### 2. Create a Cloud Firestore database
1. In the left menu: **Build → Firestore Database → Create database**.
2. Choose a location close to you.
3. Start in **production mode** (we'll set a rule below) → **Enable**.

### 3. Register a Web App and copy the config
1. Project Overview → click the **`</>` (Web)** icon → give it a nickname →
   **Register app**.
2. Firebase shows a `firebaseConfig` object. Copy the six values.

### 4. Paste the values into the app
Open **`src/config.ts`** and replace the placeholders:

```ts
export const firebaseConfig: FirebaseConfig = {
  apiKey: 'AIza...........',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef',
};
```

Save. Restart with `npm start`. The app now shows **"Cloud ON"** in Settings and
syncs live. Enter the **same pairing code** on both phones and you're connected.

### 5. Lock it down (do this)
In Firestore → **Rules**, paste the contents of the **`firestore.rules`** file
in this project, then **Publish**. Those rules:
- block anyone from listing/enumerating the directory of spaces,
- require a sane pairing-code format to reach any space,
- cap document size and force photos to be inline image data under ~700 KB,
so no one can crawl, bloat, or abuse your database.

**Security note (read this):** Tether has no login, so knowing your **pairing
code** is what grants access to your space. The app now generates a high-entropy
code (~60 bits, like `K9FJ-2MWX-3RQ8`), which makes guessing infeasible, but it
is still a shared secret, so:
- use the generated code (don't shorten it), and
- keep your pairing code private (don't post it or screenshots of it publicly).

For even stronger security later, enable **Firebase App Check** (attests requests
come from your real app) and/or **Anonymous Authentication**; the data layer is
structured to make that a small change.

---

## C. (Optional) Build real installable apps

When you'd rather install it like a normal app than scan a QR each time:

```bash
npm install -g eas-cli
eas login                 # create a free Expo account
```

**Android (.apk)**, easiest, no paid account:
```bash
eas build -p android --profile preview
```
EAS builds an APK in the cloud and gives you a download link you can install on
either Android phone.

**iPhone (.ipa)**, Apple requires a paid **Apple Developer account**
($99/year) to install on real devices:
```bash
eas build -p ios --profile preview
```
EAS builds it in the cloud (**no Mac needed**) and you share it to both iPhones
through **TestFlight**. Until you're ready for that, **Expo Go** (Part A) is the
completely free way to run Tether on iPhone, no developer account required.

(These steps use the Expo build service, which may be restricted on some
networks, run them from a normal internet connection.)

---

## Troubleshooting

- **QR won't connect** → `npx expo start --tunnel`.
- **"Cloud OFF" after adding keys** → make sure `apiKey` and `projectId` no
  longer start with `YOUR_`, then fully restart `npm start`.
- **Phones don't see each other's data** → confirm both use the *exact same*
  pairing code and both show "Cloud ON" in Settings.
- **Type errors after editing** → `npm run typecheck`.
