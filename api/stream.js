import { Innertube } from 'youtubei.js';

let youtube = null;

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || id === 'undefined' || id === 'null') {
    return res.status(400).json({ error: 'Invalid or missing Video ID' });
  }

  const videoId = id.trim();

  // 1. Primary: youtubei.js
  try {
    if (!youtube) {
      youtube = await Innertube.create({ location: 'US', language: 'en' });
    }

    let info;
    try {
      info = await youtube.getBasicInfo(videoId);
    } catch (e) {
      info = await youtube.music.getInfo(videoId);
    }

    const format = info?.chooseFormat({ type: 'audio', quality: 'best' });

    if (format) {
      let streamUrl = format.url;
      if (!streamUrl && format.decipher) {
        streamUrl = format.decipher(youtube.session.player);
      }
      if (streamUrl) {
        return res.redirect(302, streamUrl);
      }
    }
  } catch (err) {
    console.warn('youtubei.js stream extraction failed, trying fallback APIs...', err?.message);
  }

  // 2. Fallback: Piped public APIs for direct audio stream
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.video',
    'https://pipedapi.mha.fi'
  ];

  for (const instance of pipedInstances) {
    try {
      const response = await fetch(`${instance}/streams/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        const audioStream = data.audioStreams?.find(s => s.mimeType?.includes('audio')) || data.audioStreams?.[0];
        if (audioStream?.url) {
          return res.redirect(302, audioStream.url);
        }
      }
    } catch (fallbackErr) {
      console.warn(`Piped instance ${instance} failed:`, fallbackErr?.message);
    }
  }

  return res.status(500).json({ error: 'Failed to extract audio stream from all sources' });
}