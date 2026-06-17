# Start here, Tether, for non-techies 🤍

No coding needed. Set aside about **30-45 minutes**. You'll type a few things
exactly as written, that's it. Take it one step at a time.

---

## First, the honest big picture (read this, it's short)

Tether is **your own private app**, so it's not in the App Store/Play Store
yet. There are three "levels", and you can stop at whichever you need:

1. **Try it on one phone** (15 min), see and feel the app. Free.
2. **Connect both phones** (10 min), so what you write actually reaches each
   other across the distance. Free (needs a free Google/Firebase account).
3. **Install it for daily use** (the "real" version that works without your
   computer being on). A bit more involved, see Part 3.

For a couple living apart, you'll want all three. Do them in order. 🙂

**What you need:**
- A computer (Windows or Mac).
- Both phones (any mix of iPhone/Android).
- Wi-Fi.

---

## PART 1, Put Tether on your phone (the quick look)

### Step 1, Install Node.js (the engine that runs the app)
1. Go to **https://nodejs.org**
2. Click the big button that says **"LTS"** (recommended).
3. Open the downloaded file and click **Next → Next → Install** (accept the
   defaults). On Mac, just keep clicking **Continue**.

### Step 2, Get the Tether files onto your computer
1. Go to your project on GitHub (the repository named **App**).
2. Near the top there's a branch dropdown (it may say `main`). Click it and
   choose **`claude/trusting-tesla-udokel`**, that's where Tether lives.
3. Click the green **`< > Code`** button → **Download ZIP**.
4. Find the downloaded ZIP (usually in **Downloads**), and **unzip** it
   (double-click on Mac; right-click → *Extract All* on Windows).
5. You now have a folder like **App-claude-trusting-tesla-udokel**. Move it
   somewhere easy, like your **Desktop**, and rename it to **tether** if you like.

### Step 3, Open the "Terminal" inside that folder
This is the black/white box where you type commands. Don't worry, you'll only
type what I give you.

- **Windows:** open the **tether** folder. Click the white address bar at the
  top, type `cmd`, and press **Enter**. A black window opens.
- **Mac:** open the **Terminal** app (press `Cmd + Space`, type *Terminal*,
  Enter). Then type `cd ` (with a space), drag the **tether** folder onto the
  Terminal window, and press **Enter**.

To check it worked, type this and press Enter:
```
node -v
```
You should see something like `v22.xx.x`. (If "command not found", restart the
computer and try again, the Node install needs a restart sometimes.)

### Step 4, Install the app's parts (one time only)
Type this and press Enter, then **wait** 2-5 minutes (lots of text scrolls , 
that's normal):
```
npm install
```
When it stops and you can type again, it's done.

### Step 5, Start Tether
Type:
```
npm start
```
After a moment, a big **QR code** appears in the window. Leave this window open
(this is the app "running"). 

### Step 6, Open it on your phone
1. On the phone, install the free **Expo Go** app:
   - **iPhone:** App Store → search **Expo Go** → Get.
   - **Android:** Play Store → search **Expo Go** → Install.
2. Make sure the **phone and computer are on the same Wi-Fi**.
3. Scan the QR code:
   - **iPhone:** open the **Camera** app, point at the QR code, tap the yellow
     banner that pops up.
   - **Android:** open **Expo Go**, tap **Scan QR code**, point at it.
4. Tether loads on your phone. 🎉 (First load takes ~30 seconds.)

> **Phone won't connect?** In the terminal, press `Ctrl + C` to stop, then type
> `npx expo start --tunnel` and scan the new QR code. This works even on tricky
> Wi-Fi.

### Step 7, First-time setup on the phone
- Type **your name** and **your partner's name**.
- You'll see a **pairing code** (like `EMBER-4821`). Write it down, your
  partner will type the **exact same code** on their phone.
- Tap **Begin our space**.

You can now explore everything! Repeat Steps 6-7 on your partner's phone (with
the **same pairing code**).

⚠️ **Important:** at this stage each phone is still a *separate* copy, what you
write won't reach your partner yet. That's what Part 2 fixes.

---

## PART 2, Connect the two phones (so you truly share)

This switches Tether from "just my phone" to "syncing between us over the
internet." It uses **Firebase**, a free Google service.

👉 Follow **[SETUP.md](./SETUP.md)** → section **"B. Turn on cloud sync with
Firebase."** It's written step-by-step. In short you will:
1. Create a free Firebase project at https://console.firebase.google.com
2. Turn on **Firestore Database**.
3. Copy 6 values it gives you into the file **`src/config.ts`** (open it with
   any text editor, paste, save).
4. Stop the app (`Ctrl + C`) and run `npm start` again.

Now, when both phones use the **same pairing code**, everything syncs, check-ins,
hugs, letters, memories. Settings will show **"Cloud ON"**.

---

## PART 3, Use it every day (without your computer running)

In Parts 1-2, Tether only runs while your computer's `npm start` window is open.
That's fine for trying it, but for daily long-distance use you'll want Tether
**installed like a normal app** so it works on its own.

This is the most technical part. You build an installable app with **EAS**
(Expo's free cloud builder). Full commands are in **[SETUP.md](./SETUP.md)** →
section **"C. Build real installable apps."** Summary:

- **Android:** `eas build -p android` → you get a download link → install the
  `.apk` on the Android phone. No paid account needed.
- **iPhone:** Apple requires a paid **Apple Developer account** ($99/year). Then
  `eas build -p ios`, and you share it to the iPhone via **TestFlight**.

> Not comfortable with Part 3? It's the one spot where a tech-savvy friend (or a
> freelancer for an hour) can help. Everything's already set up for them, they
> just run the build commands. Until then, Parts 1-2 let you both use it whenever
> your computer is on.

---

## PART 4, How to actually use Tether 🤍

Once it's open on both phones (with the same pairing code):

- **Every day → tap the ❤️ Pulse tab.** Pick how you feel, write the one thing
  you need today, set the energy/stress/closeness bars, and tap **Share**. Your
  partner sees it, and the app suggests things to say and ways to support you.
- **Home tab (🏠):** your "closeness" score, your partner's mood today, a memory
  from this day last year, and quick buttons.
- **Miss you tab (🤍):** tap **Send a hug**, your partner's phone buzzes with
  "thinking of you." Feeling lonely? Tap **Open my comfort kit**.
- **Love letters:** write a note and schedule it to arrive on a future date, an
  anniversary, an exam day, or just because.
- **Moments (📸):** take one photo a day. It lands in a shared gallery, and the
  **Calendar** lets you tap any date to see the photos from that day.
- **Memory vault (🗂️):** save milestones and keepsakes; the app resurfaces them later.
- **Intimacy deck (🃏):** answer one closeness question together each day.
- **Our journal (📖):** at month's end, read the little story the app writes
  about your month together.
- **More (☰):** everything else, plus **Settings** (names, pairing code, sync).

That's it. Check in daily, send hugs freely, and let the letters and memories
build up. 💛

---

## If you get stuck

- **"node" or "npm" not recognized** → restart the computer; reopen the terminal
  in the tether folder (Step 3).
- **QR won't connect** → use `npx expo start --tunnel` (see Step 6).
- **Phones don't see each other's stuff** → you haven't done Part 2 yet, or the
  pairing codes differ, or Settings doesn't say "Cloud ON".
- **Anything else** → tell me exactly what the screen says and I'll guide you.
