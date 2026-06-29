// ─────────────────────────────────────────────────────────────────────────
// Turn the Expo web export (dist/) into an installable iOS/Android PWA.
//
// Run AFTER `npx expo export -p web`. Idempotent — safe to run repeatedly.
// It injects the manifest + Apple home-screen meta tags that Expo's bare web
// export doesn't generate, so "Add to Home Screen" on iOS gives a real
// full-screen app with a proper icon (no Safari chrome).
// ─────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIST = resolve('dist');
const indexHtml = resolve(DIST, 'index.html');
if (!existsSync(indexHtml)) {
  console.error('✗ dist/index.html not found. Run "npx expo export -p web" first.');
  process.exit(1);
}

const APP_NAME = 'Tether';
const THEME = '#FBF8F6'; // app background — the iOS status-bar area blends with it

// 1) Home-screen icon: reuse the 1024×1024 app icon (iOS downscales it).
const iconSrc = resolve('assets/icon.png');
if (existsSync(iconSrc)) {
  copyFileSync(iconSrc, resolve(DIST, 'apple-touch-icon.png'));
} else {
  console.warn('! assets/icon.png missing — home-screen icon will fall back to a screenshot.');
}

// 2) Web app manifest (Android/Chrome install + metadata).
const manifest = {
  name: APP_NAME,
  short_name: APP_NAME,
  description: 'Close, across any distance.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: THEME,
  theme_color: THEME,
  icons: [{ src: '/apple-touch-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' }],
};
writeFileSync(resolve(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 3) Inject the PWA / iOS meta tags into <head>.
let html = readFileSync(indexHtml, 'utf8');

// Edge-to-edge viewport so the app flows around the notch in standalone mode.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />',
);

if (!html.includes('rel="manifest"')) {
  const tags = [
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    `<meta name="apple-mobile-web-app-title" content="${APP_NAME}" />`,
    `<meta name="theme-color" content="${THEME}" />`,
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    '<link rel="manifest" href="/manifest.json" />',
  ].join('\n    ');
  html = html.replace('</head>', `  ${tags}\n  </head>`);
}

writeFileSync(indexHtml, html);
console.log('✓ PWA ready: manifest.json + apple-touch-icon.png written, iOS meta tags injected into dist/index.html');
