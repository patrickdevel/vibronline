import { getYouTube, mapItem } from './_ytmusic.js';

export default async function handler(req, res) {
  const q = req.query?.q;
  if (!q) return res.status(200).json({ results: [] });

  try {
    const yt = await getYouTube();
    const search = await yt.music.search(q);

    const seen = new Set();
    const results = [];
    for (const shelf of search.contents || []) {
      for (const raw of shelf.contents || []) {
        const item = mapItem(raw);
        if (!item || item.kind === 'artist') continue;
        const key = `${item.kind}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(item);
      }
    }

    res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ results: [], error: 'Search failed' });
  }
}
