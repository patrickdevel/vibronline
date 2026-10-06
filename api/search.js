import { Innertube } from 'youtubei.js';

let youtube = null;

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(200).json({ results: [] });

  try {
    if (!youtube) youtube = await Innertube.create();
    const searchResults = await youtube.music.search(q, { type: 'song' });
    
    const results = searchResults.songs?.contents.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unbekannt',
      thumbnail: song.thumbnails?.[0]?.url || ''
    })) || [];

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
}
