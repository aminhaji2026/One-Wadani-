import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { WADDANI_FACEBOOK_VIDEOS, type WaddaniVideo } from '../lib/waddaniVideos';

type VideoItem = WaddaniVideo;

const FALLBACK: VideoItem[] = WADDANI_FACEBOOK_VIDEOS;

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

function facebookPermalink(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('facebook.com') && !u.hostname.includes('fb.watch')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function facebookEmbedSrc(url: string): string {
  const params = new URLSearchParams({
    href: url,
    show_text: 'false',
    width: '560',
  });
  return `https://www.facebook.com/plugins/video.php?${params.toString()}`;
}

function embedSrc(url: string): { kind: 'iframe' | 'video'; src: string } {
  const yt = youtubeId(url);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt}` };
  const fb = facebookPermalink(url);
  if (fb) return { kind: 'iframe', src: facebookEmbedSrc(fb) };
  if (/vimeo\.com\/(\d+)/.test(url)) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: 'video', src: url };
  return { kind: 'iframe', src: url };
}

function thumbUrl(item: VideoItem): string | null {
  if (item.thumbUrl) return item.thumbUrl;
  const yt = youtubeId(item.url);
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
          // Prefer official Facebook catalogue when API still has placeholder YouTube seeds.
          const onlyPlaceholders = rows.every((r) => /youtube\.com|youtu\.be/i.test(r.url));
          if (onlyPlaceholders) return;
          const merged = rows.map((row) => {
            const match = FALLBACK.find((f) => f.url === row.url || f.id === row.id);
            return match ? { ...row, thumbUrl: row.thumbUrl || match.thumbUrl } : row;
          });
          setVideos(merged);
          setActiveId(merged[0].id);
        }
      })
      .catch(() => {
        /* keep Facebook fallback videos */
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
        <p>
          Recent messages and campaign films from the official Waddani Facebook pages (
          <a href="https://www.facebook.com/WADDANIP" target="_blank" rel="noreferrer">
            WADDANIP
          </a>
          ).
        </p>
      </div>

      <div className="videoFeature">
        <div className="videoPlayer">
          {activeEmbed.kind === 'iframe' ? (
            <iframe
              key={active.id}
              src={activeEmbed.src}
              title={active.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video key={active.id} src={activeEmbed.src} controls playsInline />
          )}
        </div>
        <div className="videoFeatureMeta">
          <span className="videoLatestTag">From Facebook</span>
          <h3>{active.title}</h3>
          <p>
            {active.createdAt ? new Date(active.createdAt).toLocaleDateString() : 'New'}
            {active.language ? ` · ${active.language.toUpperCase()}` : ''}
            {active.page ? ` · ${active.page}` : ''}
          </p>
          <a className="videoFacebookLink" href={active.url} target="_blank" rel="noreferrer">
            Open on Facebook →
          </a>
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
          const thumb = thumbUrl(v);
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
