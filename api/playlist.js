import { getYouTube, mapItem } from './_ytmusic.js';

export default async function handler(req, res) {
  const id = req.query?.id;
  const kind = req.query?.kind === 'album' ? 'album' : 'playlist';

  if (!id) return res.status(400).json({ error: 'Missing ID' });

  try {
    const yt = await getYouTube();
    const data = kind === 'album' ? await yt.music.getAlbum(id) : await yt.music.getPlaylist(id.replace(/^VL/, ''));

    const header = data.header;
    const title = header?.title?.text || '';
    const headerThumbs = header?.thumbnails || header?.thumbnail?.contents || [];
    const cover = headerThumbs.length ? headerThumbs[headerThumbs.length - 1].url : '';

    const rawItems = kind === 'album' ? data.contents || [] : data.items || [];
    const albumArtist = header?.author?.name || header?.strapline_text_one?.text || '';

    const tracks = rawItems
      .map((raw) => {
        const item = mapItem(raw);
        if (!item) return null;
        if (!item.thumbnail) item.thumbnail = cover;
        if (item.artist === 'YouTube Music' && albumArtist) item.artist = albumArtist;
        return item;
      })
      .filter((t) => t && (t.kind === 'song' || t.kind === 'video'));

    res.status(200).json({ title, cover, tracks });
  } catch (error) {
    console.error('Playlist error:', error);
    res.status(500).json({ error: 'Playlist konnte nicht geladen werden.' });
  }
}
