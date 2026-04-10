# Canadian Code Compass

Mobile-first PWA for licensed HVAC/gas technicians to look up CSA B149 code clauses by describing field violations in plain language. Built for one-handed use on job sites — search, find clause, copy citation for TSSA tag entry.

## What it does

- **Describe Problem** — Fuzzy-match plain-language field descriptions (e.g., "furnace too close to wood framing") to the correct clause
- **Search Keywords** — Search clause titles, descriptions, or exact clause numbers (e.g., "4.13")
- **Browse Sections** — Expandable tree of all clauses organized by code section
- **One-tap Copy Citation** — Copy formatted TSSA citation strings (e.g., `CSA B149.1-25 Clause 4.13.1`) with haptic feedback
- **TSSA Bulletins** — Director's Orders tagged against related clauses
- **Full Offline** — Service worker caches all data; works completely offline after first load
- **Install to Home Screen** — Full PWA with Android, Chrome, and iOS Safari install support

## Data

| Source | Records |
|---|---|
| CSA B149.1-25 (Natural Gas) | 1,178 clauses |
| CSA B149.2-25 (Propane) | 177 clauses |
| Scenario index (plain-language → clause) | 58 scenarios |
| TSSA bulletins | 12 Director's Orders (with live PDF links) |

## Stack

- Static HTML + vanilla JS (ES modules, no build step)
- [Fuse.js](https://fusejs.io/) — fuzzy search
- [DOMPurify](https://github.com/cure53/DOMPurify) — XSS-safe HTML rendering
- Service Worker — cache-first offline
- PWA manifest with proper `any` + `maskable` icons

## Running locally

```bash
python -m http.server 8765
# then open http://localhost:8765
```

No build step. No dependencies. Just serve the folder.

## Disclaimer

Not affiliated with CSA, TSSA, or Fanshawe College. Plain-language summaries are for quick reference only — always consult the official code for authoritative wording. Built by Michael Kapin as a personal reference tool for licensed technicians.
