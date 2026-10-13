import { getYouTube } from './_ytmusic.js';

export default async function handler(req, res) {
  const id = req.query?.id;

  if (!id) return res.status(400).json({ error: 'Missing ID' });

  // Playlist-/Album-/Kanal-IDs sind keine Videos
  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Das ist keine abspielbare Audiospur (Playlist, Album oder Kanal).' });
  }

  try {
    const yt = await getYouTube();
    const info = await yt.music.getInfo(id);

    if (info.basic_info.is_live) {
      return res.status(415).json({ error: 'Livestreams werden nicht unterstützt.' });
    }

    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (!format) return res.status(404).json({ error: 'Stream format not found' });

    const url = await format.decipher(yt.session.player);
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, url);
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to fetch stream' });
  }
}
