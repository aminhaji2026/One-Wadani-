import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

type VideoItem = {
  id: string;
  title: string;
  url: string;
  language?: string;
  createdAt?: string;
};

const FALLBACK: VideoItem[] = [
  {
    id: '1',
    title: 'Waddani Weekly Address — Latest Release',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    language: 'so',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Membership Drive Launch',
    url: 'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    language: 'so',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Diaspora Town Hall Highlights',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    language: 'en',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '4',
    title: 'Youth Wing Campaign Briefing',
    url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    language: 'so',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: '5',
    title: 'Fundraising Call to Action',
    url: 'https://www.youtube.com/watch?v=hY7m5jjJ9mM',
    language: 'en',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
];

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
      return u.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

function embedSrc(url: string): { kind: 'iframe' | 'video'; src: string } {
  const yt = youtubeId(url);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt}` };
  if (/vimeo\.com\/(\d+)/.test(url)) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: 'video', src: url };
  return { kind: 'iframe', src: url };
}

function thumbUrl(url: string): string | null {
  const yt = youtubeId(url);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
}

export default function VideoReleases() {
  const [videos, setVideos] = useState<VideoItem[]>(FALLBACK);
  const [activeId, setActiveId] = useState(FALLBACK[0].id);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api('/public/videos')
      .then((rows: VideoItem[]) => {
        if (Array.isArray(rows) && rows.length) {
          setVideos(rows);
          setActiveId(rows[0].id);
        }
      })
      .catch(() => {
        /* keep fallback videos */
      });
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, Math.floor(el.clientWidth * 0.7)), behavior: 'smooth' });
  };

  const active = videos.find((v) => v.id === activeId) || videos[0];
  const activeEmbed = active ? embedSrc(active.url) : null;

  if (!videos.length || !active || !activeEmbed) return null;

  return (
    <section className="section videoReleases reveal" id="videos">
      <div className="sectionHead">
        <p className="kicker">Watch</p>
        <h2>Latest video release</h2>
        <p>Scroll through recent messages, briefings, and campaign films from Waddani.</p>
      </div>

      <div className="videoFeature">
        <div className="videoPlayer">
          {activeEmbed.kind === 'iframe' ? (
            <iframe
              key={active.id}
              src={activeEmbed.src}
              title={active.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video key={active.id} src={activeEmbed.src} controls playsInline />
          )}
        </div>
        <div className="videoFeatureMeta">
          <span className="videoLatestTag">Latest release</span>
          <h3>{active.title}</h3>
          <p>
            {active.createdAt ? new Date(active.createdAt).toLocaleDateString() : 'New'}
            {active.language ? ` · ${active.language.toUpperCase()}` : ''}
          </p>
        </div>
      </div>

      <div className="videoCarouselHeader">
        <span>More videos</span>
        <div className="videoCarouselNav">
          <button type="button" aria-label="Scroll videos left" onClick={() => scrollBy(-1)}>
            ‹
          </button>
          <button type="button" aria-label="Scroll videos right" onClick={() => scrollBy(1)}>
            ›
          </button>
        </div>
      </div>

      <div className="videoTrack" ref={trackRef}>
        {videos.map((v, i) => {
          const thumb = thumbUrl(v.url);
          const selected = active.id === v.id;
          return (
            <button
              type="button"
              key={v.id}
              className={`videoCard${selected ? ' selected' : ''}`}
              onClick={() => setActiveId(v.id)}
            >
              <div className="videoThumb" style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}>
                {!thumb && <span>▶</span>}
                {i === 0 && <em>New</em>}
              </div>
              <strong>{v.title}</strong>
              <small>{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
