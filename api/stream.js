import { getYouTube } from './_ytmusic.js';

// Zufällig gewählte Chunk-Größe: bleibt sicher unter dem 4,5-MB-Limit von Vercel-Funktionen
const CHUNK = 2 * 1024 * 1024;

// Clients, die ohne PO-Token/Login Audio liefern, in Reihenfolge der Zuverlässigkeit
const CLIENTS = ['ANDROID_VR', 'IOS', 'YTMUSIC_ANDROID', 'TV', 'WEB_EMBEDDED', 'YTMUSIC', 'WEB'];

const UA = {
  ANDROID_VR: 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
  IOS: 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)',
  DEFAULT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

// Aufgelöste Stream-URLs kurz zwischenspeichern (der Browser fragt Audio in mehreren Range-Requests ab)
const cache = new Map();
const TTL = 20 * 60 * 1000;

async function resolveStream(id) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.ts < TTL) return hit;

  const yt = await getYouTube();
  const errors = [];

  for (const client of CLIENTS) {
    try {
      const info = await yt.getBasicInfo(id, { client });
      const status = info.playability_status?.status;
      if (status && status !== 'OK') {
        errors.push(`${client}: ${status}${info.playability_status?.reason ? ' (' + info.playability_status.reason + ')' : ''}`);
        continue;
      }
      if (info.basic_info?.is_live) throw Object.assign(new Error('Livestreams werden nicht unterstützt.'), { fatal: 415 });

      // bevorzugt m4a (AAC) – wird von allen Browsern abgespielt
      let format;
      try { format = info.chooseFormat({ type: 'audio', quality: 'best', format: 'mp4' }); } catch {}
      if (!format) { try { format = info.chooseFormat({ type: 'audio', quality: 'best', format: 'any' }); } catch {} }
      if (!format) { errors.push(`${client}: kein Audio-Format`); continue; }

      const url = await format.decipher(yt.session.player);
      if (!url) { errors.push(`${client}: keine URL`); continue; }

      const entry = {
        url,
        mime: (format.mime_type || 'audio/mp4').split(';')[0],
        ua: UA[client] || UA.DEFAULT,
        ts: Date.now(),
        client,
      };
      cache.set(id, entry);
      return entry;
    } catch (e) {
      if (e?.fatal) throw e;
      errors.push(`${client}: ${e?.message || e}`);
    }
  }

  const err = new Error('Kein Client konnte einen Stream liefern. ' + errors.join(' | '));
  err.details = errors;
  throw err;
}

export default async function handler(req, res) {
  const id = req.query?.id;

  if (!id) return res.status(400).json({ error: 'Missing ID' });
  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Das ist keine abspielbare Audiospur (Playlist, Album oder Kanal).' });
  }

  try {
    let s = await resolveStream(id);

    // Range des Browsers auslesen (Audio-Elemente schicken immer "bytes=START-")
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : start + CHUNK - 1;
    end = Math.min(end, start + CHUNK - 1);

    const fetchUpstream = (entry) =>
      fetch(entry.url, {
        headers: {
          'User-Agent': entry.ua,
          Range: `bytes=${start}-${end}`,
          Origin: 'https://www.youtube.com',
          Referer: 'https://www.youtube.com/',
        },
      });

    let up = await fetchUpstream(s);

    // URL abgelaufen oder IP/Client abgelehnt -> einmal neu auflösen
    if (up.status === 403 || up.status === 410) {
      cache.delete(id);
      s = await resolveStream(id);
      up = await fetchUpstream(s);
    }

    if (!up.ok && up.status !== 206) {
      return res.status(502).json({ error: `YouTube-Server antwortete mit Status ${up.status} (Client: ${s.client}).` });
    }

    const buf = Buffer.from(await up.arrayBuffer());
    const contentRange = up.headers.get('content-range');

    res.setHeader('Content-Type', s.mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (contentRange) {
      res.status(206);
      res.setHeader('Content-Range', contentRange);
    } else {
      // Upstream hat den ganzen Inhalt geliefert (kein Range-Support)
      res.status(200);
    }
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
  } catch (error) {
    console.error('Stream error:', error);
    const status = error?.fatal || 500;
    res.status(status).json({ error: error?.message || 'Failed to fetch stream' });
  }
}
