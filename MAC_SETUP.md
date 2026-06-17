# Mac install guide, Tether 🤍 (for absolute beginners)

Every click, written for Mac. No coding. About **30 minutes**. Go slowly; there's
a ✅ checkpoint after each step so you always know it worked.

**You need:** a Mac, your phone (iPhone or Android), and Wi-Fi.

---

## Step 1, Install Node.js (the engine that runs Tether)

1. Open **Safari** and go to **https://nodejs.org**
2. Click the big button labelled **"LTS"** (it downloads a file ending in `.pkg`).
3. Open your **Downloads** (in the Dock, or `Finder → Downloads`) and double-click
   the **`node-...pkg`** file.
4. The installer opens. Click **Continue → Continue → Agree → Install**.
5. It asks for your **Mac password** (the one you use to log in). Type it and press
   Enter. *(You won't see dots or letters as you type, that's normal on Mac.)*
6. Wait for **"The installation was successful"** → click **Close**.

✅ **Checkpoint:** Node is now installed. We'll confirm it in Step 4.

---

## Step 2, Download the Tether files

1. In Safari, open your project on **GitHub** (the repository named **App**).
2. Below the repo name there's a grey button showing a branch (it probably says
   **`main`**). Click it, and in the list choose **`claude/trusting-tesla-udokel`**.
   *(This is where Tether's code lives.)*
3. Click the green **`< > Code`** button → **Download ZIP**.
4. Open **Finder → Downloads**. You'll see **`App-claude-trusting-tesla-udokel.zip`**.
   **Double-click it**, Mac unzips it into a folder of the same name.
5. **Drag that folder onto your Desktop** so it's easy to find. To rename it:
   click it once, press **Return**, type **`tether`**, press **Return** again.

✅ **Checkpoint:** You have a folder called **tether** on your Desktop. Open it , 
you should see files like `App.tsx`, `package.json`, `README.md`, and a `src` folder.

---

## Step 3, Open Terminal *inside* the tether folder

Terminal is the box where you'll type a few commands. The trick is making it point
at your **tether** folder. The easiest way:

**Easy way (recommended):**
1. In **Finder**, right-click (or two-finger click) the **tether** folder.
2. Hover **Services** (near the bottom of the menu) → click **New Terminal at Folder**.
3. A Terminal window opens, already inside the folder. Done, skip to Step 4.

**If you don't see "New Terminal at Folder":**
1. Open **Terminal** (press `Cmd + Space`, type **Terminal**, press Return).
2. Type these 3 characters first, the letter **c**, the letter **d**, then a
   **space**:
   ```
   cd 
   ```
   ⚠️ The space after `cd` matters. Don't press Return yet.
3. Now **drag the tether folder** from the Desktop **into the Terminal window** and
   let go. The path appears, so the line looks like:
   ```
   cd /Users/yourname/Desktop/tether
   ```
4. Press **Return**.

> 💡 If you ever get **"permission denied"**, it means the `cd ` (and its space) was
> missing, so the Mac tried to *run* the folder instead of *entering* it. Just redo
> step 2-4 above with `cd ` typed first.

✅ **Checkpoint:** type **`ls`** and press Return. You should see a list including
**`package.json`**, **`App.tsx`**, and **`src`**. That means Terminal is in the right
place.

---

## Step 4, Confirm Node is working

Type this and press Return:
```
node -v
```
✅ You should see something like **`v22.xx.x`**.

> ❌ If it says **"command not found"**: quit Terminal (`Cmd + Q`), reopen it inside
> the folder (Step 3), and try again. If it still fails, **restart your Mac** and
> redo Step 3, Node sometimes needs a restart to register.

---

## Step 5, Install the app's building blocks (one time only)

Type this and press Return:
```
npm install
```
Now **wait 2-5 minutes**. Lots of text scrolls by, and you may see yellow
**warnings**, that's all completely normal. It's finished when the scrolling stops
and you can type again.

✅ **Checkpoint:** you're back to a normal prompt where you can type. (A new folder
named `node_modules` was created, that's expected.)

---

## Step 6, Start Tether

Type this and press Return:
```
npm start
```
After a few seconds, a large **QR code** appears in the Terminal.

✅ **Checkpoint:** you can see a QR code. **Leave this Terminal window open**, this
*is* Tether running. (Closing it stops the app.)

---

## Step 7, Open Tether on your phone

1. On your phone, install the free **Expo Go** app:
   - **iPhone:** App Store → search **Expo Go** → **Get**.
   - **Android:** Play Store → search **Expo Go** → **Install**.
2. Make sure your **phone is on the same Wi-Fi** as your Mac.
3. Scan the QR code from Terminal:
   - **iPhone:** open the **Camera** app, point it at the QR code, then tap the
     yellow banner that appears at the top.
   - **Android:** open **Expo Go**, tap **Scan QR code**, point at it.
4. Tether opens on your phone. The very first load takes about **30 seconds**. 🎉

> ❌ **Phone won't connect / stuck loading?** Click the Terminal, press
> **`Control + C`** (this stops it), then type:
> ```
> npx expo start --tunnel
> ```
> Press Return, wait for the new QR code, and scan that one. This works even on
> fussy Wi-Fi.

---

## Step 8, Set up Tether (first time)

On the phone:
1. Type **your name** and **your partner's name**.
2. You'll see a **pairing code** like `EMBER-4821`. **Write it down.**
3. Tap **Begin our space**.

Then do **Step 7 again on your partner's phone**, and on their phone enter the
**exact same pairing code**.

🎉 You're both in! Explore the tabs at the bottom.

> ⚠️ At this stage each phone is still a **separate copy**, what you write won't
> reach each other yet. To truly connect across the distance, do **Part B (Firebase)**
> in the `SETUP.md` file. Want help with that? Just ask.

---

## Using it again later (important!)

Each time you want to use Tether at this stage:
1. Open **Terminal inside the tether folder** (Step 3, easy way).
2. Type **`npm start`** and press Return.
3. Scan the QR with your phone.

To **stop** it: click the Terminal and press **`Control + C`**.

---

## Quick rescue list

| Problem | Fix |
|---|---|
| "permission denied" when entering the folder | You missed `cd ` and the space, redo Step 3 |
| "command not found: node" | Quit Terminal, reopen in the folder; if needed restart the Mac |
| `npm install` looks stuck | Give it 5 minutes; warnings are fine; only worry if it says **error** |
| Phone won't connect | Use `npx expo start --tunnel` (Step 7) |
| Phones don't share data | That needs Firebase, see `SETUP.md` Part B |

Stuck anywhere? Copy the exact text from your Terminal and send it to me, I'll tell
you the next move.
