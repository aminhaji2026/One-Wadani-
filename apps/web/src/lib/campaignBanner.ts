import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';
const BANNER_EVENT = 'waddani:campaign-banner-refresh';

export type FeaturedBanner = {
  id: string;
  title: string;
  description: string;
  message?: string | null;
  imageUrl: string;
  slug?: string | null;
};

let cached: FeaturedBanner | null | undefined;
let inflight: Promise<FeaturedBanner | null> | null = null;

async function loadFeaturedBanner(force = false): Promise<FeaturedBanner | null> {
  if (!force && cached !== undefined) return cached;
  if (force) {
    cached = undefined;
    inflight = null;
  }
  if (!inflight) {
    inflight = fetch(`${API}/public/campaigns`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return null;
        const campaigns = (d.campaigns || []) as Array<{
          id: string;
          title: string;
          description: string;
          message?: string | null;
          imageUrl?: string | null;
          slug?: string | null;
        }>;
        const withImage = campaigns.find((c) => c.imageUrl);
        cached = withImage?.imageUrl
          ? {
              id: withImage.id,
              title: withImage.title,
              description: withImage.description,
              message: withImage.message,
              imageUrl: withImage.imageUrl,
              slug: withImage.slug,
            }
          : null;
        return cached;
      })
      .catch(() => {
        cached = null;
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Featured active campaign banner for shell/portal headers. */
export function useFeaturedCampaignBanner() {
  const [banner, setBanner] = useState<FeaturedBanner | null>(cached ?? null);

  useEffect(() => {
    let alive = true;
    const pull = (force = false) => {
      loadFeaturedBanner(force).then((b) => {
        if (alive) setBanner(b);
      });
    };
    pull(false);
    const onRefresh = () => pull(true);
    window.addEventListener(BANNER_EVENT, onRefresh);
    return () => {
      alive = false;
      window.removeEventListener(BANNER_EVENT, onRefresh);
    };
  }, []);

  return banner;
}

export function refreshFeaturedCampaignBannerCache() {
  cached = undefined;
  window.dispatchEvent(new Event(BANNER_EVENT));
}
