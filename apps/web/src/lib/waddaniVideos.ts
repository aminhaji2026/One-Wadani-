export type WaddaniVideo = {
  id: string;
  title: string;
  url: string;
  language?: string;
  createdAt?: string;
  thumbUrl?: string;
  page?: string;
};

/** Official Waddani Facebook videos from facebook.com/WADDANIP and afhayeenka.waddani */
export const WADDANI_FACEBOOK_VIDEOS: WaddaniVideo[] = [
  {
    id: 'fb-lahadal-biyaha',
    title: 'La Hadal Xisbigaaga — Wasiirka Horumarinta Biyaha',
    url: 'https://www.facebook.com/WADDANIP/videos/wasiirka-horumarinta-biyaha-oo-marti-ku-ah-kulanka-5aad-ee-barnaamijka-la-hadal-/1647657564027375/',
    language: 'so',
    createdAt: '2026-08-15T00:00:00.000Z',
    thumbUrl: '/videos/fb-lahadal-biyaha.jpg',
    page: 'WADDANIP',
  },
  {
    id: 'fb-xirsi-fursad',
    title: '“Caqabadaha idin haysta ayaad u bedeli kartaan fursad…” — Guddoomiye Xirsi',
    url: 'https://www.facebook.com/WADDANIP/videos/caqabadaha-idin-haysta-ayaad-u-bedeli-kartaan-fursad-guddoomiye-xirsi/1697516284876762/',
    language: 'so',
    createdAt: '2026-08-15T00:00:00.000Z',
    thumbUrl: '/videos/fb-xirsi-fursad.jpg',
    page: 'WADDANIP',
  },
  {
    id: 'fb-cadaalad-naafada',
    title: 'Wasiirka Caddaaladda — difaaca dadka nugul',
    url: 'https://www.facebook.com/WADDANIP/videos/qofka-naafada-ah-ama-iin-kale-leh-qofka-magac-xun-ku-yidhaahda-ciqaab-baa-ka-dha/1095925010056333/',
    language: 'so',
    createdAt: '2026-08-11T00:00:00.000Z',
    thumbUrl: '/videos/fb-cadaalad-naafada.jpg',
    page: 'WADDANIP',
  },
  {
    id: 'fb-afhayeen-riftvalley',
    title: 'Af-hayeenka WADDANI — Rift Valley Medical College qalin-jebin',
    url: 'https://www.facebook.com/afhayeenka.waddani/videos/af-hayeenka-xisbiga-waddani-oo-hadalo-qalbiga-taabanaya-u-jeediyey-ardey-ka-qali/857289208367128/',
    language: 'so',
    createdAt: '2026-08-01T00:00:00.000Z',
    thumbUrl: '/videos/fb-afhayeen-riftvalley.jpg',
    page: 'afhayeenka.waddani',
  },
  {
    id: 'fb-afhayeen-doorasho',
    title: 'Af-hayeenka WADDANI — xeerka doorashooyinka',
    url: 'https://www.facebook.com/afhayeenka.waddani/videos/xeerka-doorashooyinka-ee-ummadda-somaliland-indhaha-ku-hayso-wixii-caqabad-ka-yi/1434383903805854/',
    language: 'so',
    createdAt: '2026-07-20T00:00:00.000Z',
    thumbUrl: '/videos/fb-afhayeen-doorasho.jpg',
    page: 'afhayeenka.waddani',
  },
];
