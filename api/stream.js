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

    const info = await youtube.getBasicInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

    if (!format) return res.status(404).json({ error: 'Stream format not found' });

    const url = format.decipher(youtube.session.player);
    res.redirect(302, url);
  } catch (err) {
    res.status(500).json({ error: 'Stream error' });
  }
}
