import { Innertube } from 'youtubei.js';
import { Readable } from 'node:stream';

let youtube = null;

// Verschiedene Clients ausprobieren – der WEB-Client wird von YouTube oft blockiert
const CLIENTS = ['IOS', 'ANDROID', 'TV_EMBEDDED', 'YTMUSIC', 'WEB'];

// Home-Feed liefert teils Playlist-/Album-IDs (VL..., RDCLAK..., MPREb...), keine Video-IDs.
// Daraus wird hier das erste Lied ermittelt.
async function resolveVideoId(yt, id) {
  const isVideoId = /^[\w-]{11}$/.test(id);
  if (isVideoId) return id;

  try {
    if (id.startsWith('MPRE')) {
      const album = await yt.music.getAlbum(id);
      const first = album.contents?.[0]?.id;
      if (first) return first;
    }
  } catch (e) {
    console.error('Album-Auflösung fehlgeschlagen:', e?.message);
  }

  try {
    const cleanId = id.replace(/^VL/, '');
    const playlist = await yt.music.getPlaylist(cleanId);
    const first = playlist.items?.[0]?.id ?? playlist.contents?.[0]?.id;
    if (first) return first;
  } catch (e) {
    console.error('Playlist-Auflösung fehlgeschlagen:', e?.message);
  }

  return null;
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  try {
    if (!youtube) youtube = await Innertube.create();

    const videoId = await resolveVideoId(youtube, id);
    if (!videoId) return res.status(404).json({ error: 'Kein abspielbarer Titel gefunden' });

    const range = req.headers.range || 'bytes=0-';
    let lastError = 'Kein Stream verfügbar';

    for (const client of CLIENTS) {
      try {
        const info = await youtube.getBasicInfo(videoId, client);
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        if (!format) continue;

        const url = format.url || format.decipher(youtube.session.player);
        if (!url) continue;

        // Die Stream-URL ist an die IP des Servers gebunden, daher wird der Stream
        // über die Funktion durchgereicht statt per Redirect an den Browser.
        const upstream = await fetch(url, { headers: { Range: range } });
        if (!upstream.ok && upstream.status !== 206) {
          lastError = `Client ${client}: HTTP ${upstream.status}`;
          continue;
        }

        res.status(upstream.status);
        for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
          const v = upstream.headers.get(h);
          if (v) res.setHeader(h, v);
        }
        res.setHeader('Cache-Control', 'no-store');

        Readable.fromWeb(upstream.body).pipe(res);
        return;
      } catch (e) {
        lastError = `Client ${client}: ${e?.message}`;
        console.error(lastError);
      }
    }

    return res.status(502).json({ error: 'Stream error', detail: lastError });
  } catch (err) {
    console.error('Stream-Fehler:', err);
    youtube = null; // Session beim nächsten Aufruf neu aufbauen
    return res.status(500).json({ error: 'Stream error', detail: err?.message });
  }
}
