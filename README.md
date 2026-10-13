# vibrmusiconline

YouTube-Music-Web-Player als **eine statische `index.html`** + kleine Vercel-Serverless-Funktionen unter `/api`.

## Struktur

```
index.html        -> komplette Oberfläche (HTML + CSS + JS, kein Build nötig)
api/_ytmusic.js   -> gemeinsame Helfer (youtubei.js)
api/home.js       -> /api/home
api/search.js     -> /api/search?q=...
api/playlist.js   -> /api/playlist?id=...&kind=album|playlist
api/stream.js     -> /api/stream?id=VIDEO_ID
package.json
vercel.json
```

## Deployment

1. Ordner in ein GitHub-Repo pushen
2. Auf vercel.com → *Add New Project* → Repo importieren
3. Framework Preset: **Other** (kein Build Command, kein Output Directory)
4. Deploy

Lokal testen: `npm i -g vercel && npm install && vercel dev`
