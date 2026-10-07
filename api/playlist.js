import { Innertube } from 'youtubei.js';

let youtube = null;

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing Playlist ID' });

  try {
    if (!youtube) youtube = await Innertube.create({ location: 'US', language: 'en' });
    const cleanId = id.replace(/^VL/, '');

    let playlist;
    try {
      playlist = await youtube.music.getPlaylist(cleanId);
    } catch (e) {
      playlist = await youtube.music.getAlbum(cleanId);
    }

    const title = playlist.header?.title?.text || playlist.title || 'Playlist';
    const thumbnail = playlist.header?.thumbnails?.[0]?.url || playlist.thumbnails?.[0]?.url || '';

    const rawTracks = playlist.videos || playlist.contents || [];
    const tracks = rawTracks.map(song => {
      const songId = song.id || song.video_id || song.videoId || song.endpoint?.payload?.videoId || '';
      const songTitle = song.title?.text || song.title || '';
      const songArtist = song.artists?.[0]?.name || song.author?.name || song.subtitle?.text || 'YouTube Music';
      const songThumb = song.thumbnails?.[0]?.url || thumbnail;

      return {
        id: songId,
        title: songTitle,
        artist: songArtist,
        thumbnail: songThumb
      };
    }).filter(s => s.id && s.id !== 'undefined');

    res.status(200).json({ title, thumbnail, tracks });
  } catch (err) {
    console.error('Playlist API error:', err);
    res.status(500).json({ error: 'Failed to load playlist' });
  }
}
