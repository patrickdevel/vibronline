import { Innertube } from 'youtubei.js';

let youtube = null;

export default async function handler(req, res) {
  try {
    if (!youtube) youtube = await Innertube.create();
    const homeFeed = await youtube.music.getHomeFeed();
    
    const sections = homeFeed.sections?.map(sec => ({
      title: sec.title?.text || 'Empfehlungen',
      items: sec.contents?.map(item => ({
        id: item.id,
        title: item.title?.text || item.title || '',
        artist: item.authors?.[0]?.name || item.subtitle?.text || 'YouTube Music',
        thumbnail: item.thumbnails?.[0]?.url || ''
      })).filter(i => i.id) || []
    })) || [];

    res.status(200).json({ sections });
  } catch (err) {
    res.status(500).json({ sections: [] });
  }
}
