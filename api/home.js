import { getYouTube, mapItem } from './_ytmusic.js';

export default async function handler(req, res) {
  try {
    const yt = await getYouTube();
    const homeFeed = await yt.music.getHomeFeed();

    const sections = (homeFeed.sections || [])
      .map((section) => ({
        title: section.header?.title?.text || 'Empfehlungen',
        items: (section.contents || []).map(mapItem).filter(Boolean),
      }))
      .filter((s) => s.items.length > 0);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({ sections });
  } catch (error) {
    console.error('Home feed error:', error);
    res.status(500).json({ sections: [], error: 'Home feed failed' });
  }
}
