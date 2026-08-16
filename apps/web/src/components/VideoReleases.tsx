import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Card } from './Common';

type MediaAsset = {
  id: string;
  title: string;
  type: string;
  url: string;
  language: string;
  approved: boolean;
  published: boolean;
  createdAt: string;
};

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
  const [videos, setVideos] = useState<MediaAsset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api('/media?type=video')
      .then((rows: MediaAsset[]) => {
        const list = (rows || []).filter((x) => /video/i.test(x.type));
        setVideos(list);
        if (list[0]) setActiveId(list[0].id);
      })
      .catch((e: Error) => setErr(e.message));
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(280, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  const active = videos.find((v) => v.id === activeId) || videos[0];
  const activeEmbed = active ? embedSrc(active.url) : null;

  return (
    <Card title="Latest video releases">
      {err && <div className="error">{err}</div>}
      {!err && !videos.length && (
        <div className="empty">No published videos yet. Add media assets in Communications.</div>
      )}
      {!!videos.length && (
        <div className="videoReleases">
          {active && activeEmbed && (
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
                <h4>{active.title}</h4>
                <p>
                  {new Date(active.createdAt).toLocaleDateString()} · {active.language.toUpperCase()}
                </p>
              </div>
            </div>
          )}

          <div className="videoCarouselHeader">
            <span>Browse all videos</span>
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
              const selected = (active?.id || '') === v.id;
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
                  <small>{new Date(v.createdAt).toLocaleDateString()}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
