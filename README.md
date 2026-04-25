# aungkokomm.github.io

Personal landing page for my open-source projects.

Live: https://aungkokomm.github.io/

## Structure

- `index.html` — portfolio landing
- `cinelibrary/`, `netmon/`, `dictionary/` — per-project pages
- `assets/css/style.css` — shared styles
- `assets/img/` — drop screenshots here (referenced from project pages)

Plain static HTML — no Jekyll, no build step. Edit, commit, push.

## Adding screenshots

Each project page has a placeholder `<div class="shot-placeholder">`. Replace
with a real screenshot like:

```html
<div class="shot">
  <img src="../assets/img/cinelibrary-library.png" alt="CineLibrary library page">
</div>
```

## Enable GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch** →
Branch: `main` / `/` (root) → Save. Live within ~1 minute.
