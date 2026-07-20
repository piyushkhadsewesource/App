# Tether launch site

The public website for Tether, written as the launch-day version: the product
is presented as live, with "Get the app" store buttons and a browser link.
Static files only, no build step, no dependencies, no analytics, and the site
collects no data at all.

> **Prepared in advance.** The app has not actually launched yet; this site is
> the version to publish on launch day. Until then, keep it unpublished and
> work through the TODO list below.

```
website/
  index.html        the launch page
  privacy.html      plain-words privacy policy
  terms.html        plain-words terms
  assets/css        Rose & Bloom tokens ported from src/theme (keep in sync)
  assets/js         nav, staggered scroll reveals
  assets/fonts      self-hosted Fraunces + Inter (variable woff2)
  assets/img        real app screenshots, store logos, favicon, OG card
  assets/video      real in-app screen recording (webm) for the hero phone
```

## Preview locally

```bash
cd website
python3 -m http.server 8090
# open http://localhost:8090
```

## TODO before launch day

Search `index.html` for `TODO:` comments; they mark every placeholder link.

- **App Store button** points at `https://apps.apple.com/app/tether`, a
  placeholder. Replace it with the real listing URL once the app is approved.
- **Google Play button** uses the app's real id
  (`com.tether.app`); verify the listing is live before publishing.
- **"Open in your browser" links** point at `https://tether-aee5d.web.app`
  (this project's default Firebase Hosting site). Confirm the web app is
  deployed there, or update the URL.
- **`og:image`** should become an absolute URL once you have a domain
  (e.g. `https://yourdomain.com/assets/img/og.png`), or link previews will
  not show the card.
- **Contact address** (footer + legal pages) is riyaray.we@gmail.com;
  replace it if you set up a hello@ address.
- **Screenshots** in `assets/img/app-*.png` are real captures of the app in
  demo mode. Re-capture them when the app's look changes.

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

## Note on the waitlist rules

`firestore.rules` still contains a create-only rule for a `/waitlist`
collection from the pre-launch version of this site. The current site no
longer submits to it; the rule is harmless and can stay (useful if you ever
bring an email capture back) or be removed.
