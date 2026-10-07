import { Innertube } from 'youtubei.js';

let youtube = null;

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  try {
    if (!youtube) youtube = await Innertube.create();
    let videoId = id;

    if (id.startsWith('VL') || id.startsWith('PL') || id.startsWith('RD') || id.startsWith('MPRE')) {
      try {
        const cleanId = id.replace(/^VL/, '');
        const playlist = await youtube.music.getPlaylist(cleanId);
        if (playlist.videos?.[0]?.id) videoId = playlist.videos[0].id;
      } catch (e) {}
    }

    let info;
    try {
      info = await youtube.music.getInfo(videoId);
    } catch (e) {
      info = await youtube.getBasicInfo(videoId);
    }

    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

    if (!format) return res.status(404).json({ error: 'Stream format not found' });

    let url = format.url;
    if (!url && format.decipher) {
      url = format.decipher(youtube.session.player);
    }

    if (!url) return res.status(500).json({ error: 'Could not extract stream URL' });

    res.redirect(302, url);
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ error: err.message || 'Stream error' });
  }
}
