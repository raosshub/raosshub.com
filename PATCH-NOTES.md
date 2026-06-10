# RAOSS Hub — Patch v3.1.7
**Date:** 2026-06-10
**Applies on top of:** v3.1.6
**Frontend only — no backend restart needed**

---

## 3 Bugs Fixed

### Bug 1 — Browser autocomplete dropdown above NDA modal
LoginScreen has `autoFocus` on the username input. When it mounts in the 'nda'
stage (as a background), the browser auto-focuses that input and shows its
native autocomplete dropdown. Browser-native dropdowns are OS-level — no CSS
z-index can go above them, including the NDA modal at z-index 1100.

Fix: wrap `<LoginScreen />` in `<div inert>` in the 'nda' stage render.
The HTML `inert` attribute propagates to all descendants: prevents focus,
prevents interaction, prevents browser autofill. `display: contents` ensures
the wrapper div itself has no visual box.

### Bug 2 — Login mesh background not visible
NDAModal's outer wrapper had `backdropFilter: blur(6px)`. This blurred the
LoginScreen behind it. The mesh uses `--border-subtle: #21262d` at 0.4 opacity
with a radial gradient mask — already very subtle. Blurring it rendered it
invisible.

Fix: removed `backdropFilter: blur(6px)`. Increased backdrop opacity slightly
(0.55 → 0.6) to maintain depth. The mesh is now visible through the overlay.

### Bug 3 — Loading bar and text invisible
LoadingScreen uses inline styles with CSS variables (var(--accent),
var(--text-primary), etc.). These variables are defined in global.css.
In Vite dev mode, global.css is injected via JavaScript — NOT as a
render-blocking `<link>` tag. There is a window between page load and
CSS injection where all variables are undefined → all colours transparent
→ loading bar invisible, text invisible.
The `@keyframes loadShimmer` animation is also in global.css → bar frozen.

Fix: added full :root variable block + @keyframes loadShimmer to the inline
`<style>` in index.html. Loads synchronously before any JavaScript. Also
handles body.light-mode overrides for light-mode users.

---

## Files Changed

```
frontend/index.html                      ← :root vars + @keyframes
frontend/src/App.tsx                     ← inert wrapper on LoginScreen
frontend/src/components/NDAModal.tsx     ← removed backdropFilter blur
```

---

## How to Apply

Extract into project root, then restart frontend only:
```bash
cd frontend && npm run dev
```

No backend restart needed.
