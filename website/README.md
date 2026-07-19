# Tether launch site

The public website for Tether's launch: the story, what's inside the app, the
expansion plan (private today → waitlist → public launch), the founders, and a
working waitlist. Static files only, no build step, no dependencies, no
analytics.

```
website/
  index.html        the launch page
  privacy.html      plain-words privacy policy
  terms.html        plain-words terms
  assets/css        Rose & Bloom tokens ported from src/theme (keep in sync)
  assets/js         nav, scroll reveals, waitlist submit
  assets/fonts      self-hosted Fraunces + Inter (variable woff2)
  assets/img        real app screenshots, favicon, OG card
```

## Preview locally

```bash
cd website
python3 -m http.server 8090
# open http://localhost:8090
```

## The waitlist (one required step before going live)

The form writes straight into this project's own Firestore (`waitlist`
collection) over the REST API, no server needed. For that to work you must
publish the updated `firestore.rules` from the repo root, which add a
create-only, validated rule for `/waitlist` (nobody can read, list, edit, or
delete entries from the client):

Firebase console → Firestore Database → Rules → paste `firestore.rules` →
Publish.

Until the rules are published the form degrades gracefully: submissions fail
and the visitor is offered a prefilled email to riyaray.we@gmail.com instead.
Reading the collected entries: Firebase console → Firestore → `waitlist`.

## Deploying

Any static host works. Two easy paths:

**Firebase Hosting, second site (recommended, you already use Firebase):**

```bash
firebase hosting:sites:create tether-site        # one time
firebase target:apply hosting site website       # one time
firebase deploy --only hosting:site
```

Then add to `firebase.json` (alongside the existing app hosting config, which
becomes an array):

```json
"hosting": [
  { ...existing app config... },
  { "target": "site", "public": "website", "ignore": ["README.md"] }
]
```

**Netlify / Vercel / GitHub Pages:** point them at the `website/` folder.
There is no build command.

## Before you go public, swap these

- `og:image` in `index.html` should become an absolute URL once you have a
  domain (e.g. `https://yourdomain.com/assets/img/og.png`), or link previews
  will not show the card.
- The contact address (footer + form fallback + legal pages) is currently
  riyaray.we@gmail.com; replace it if you set up a hello@ address.
- Screenshots in `assets/img/app-*.png` are real captures of the app running
  in demo mode. Re-capture them when the app's look changes.
