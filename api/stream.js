import { Innertube } from 'youtubei.js';

let youtube = null;

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || id === 'undefined' || id === 'null') {
    return res.status(400).json({ error: 'Invalid or missing Video ID' });
  }

  try {
    if (!youtube) {
      youtube = await Innertube.create({ location: 'US', language: 'en' });
    }

    let videoId = id.trim();

    if (videoId.startsWith('VL') || videoId.startsWith('PL') || videoId.startsWith('RD') || videoId.startsWith('MPRE')) {
      try {
        const cleanId = videoId.replace(/^VL/, '');
        const playlist = await youtube.music.getPlaylist(cleanId);
        const firstVideo = playlist.videos?.[0];
        const extractedId = firstVideo?.id || firstVideo?.video_id || firstVideo?.endpoint?.payload?.videoId;
        if (extractedId) videoId = extractedId;
      } catch (e) {
        console.warn('Playlist resolve warning:', e);
      }
    }

    let info;
    try {
      info = await youtube.getBasicInfo(videoId);
    } catch (e) {
      info = await youtube.music.getInfo(videoId);
    }

    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

    if (!format) {
      return res.status(404).json({ error: 'Stream format not found' });
    }

    let streamUrl = format.url;
    if (!streamUrl && format.decipher) {
      streamUrl = format.decipher(youtube.session.player);
    }

    if (!streamUrl) {
      return res.status(500).json({ error: 'Unable to decipher audio URL' });
    }

    return res.redirect(302, streamUrl);
  } catch (err) {
    console.error('Stream route error:', err);
    return res.status(500).json({ error: err.message || 'Stream processing failed' });
  }
}
