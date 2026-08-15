const events = [
  { src: '/events/event-rally.jpg', label: 'National rally — Hargeisa' },
  { src: '/events/event-meeting.jpg', label: 'Branch organising meeting' },
  { src: '/events/event-diaspora.jpg', label: 'Diaspora campaign night' },
  { src: '/events/event-youth.jpg', label: 'Youth volunteer canvass' },
  { src: '/events/event-speech.jpg', label: 'Leadership address' },
  { src: '/events/event-march.jpg', label: 'Evening solidarity march' },
];

export default function EventBanner() {
  const strip = [...events, ...events];

  return (
    <div className="eventBanner" aria-label="Waddani events">
      <div className="eventBannerLabel">
        <span>Events</span>
      </div>
      <div className="eventBannerTrackWrap">
        <div className="eventBannerTrack">
          {strip.map((item, i) => (
            <figure className="eventBannerItem" key={`${item.src}-${i}`}>
              <img src={item.src} alt="" loading={i < 4 ? 'eager' : 'lazy'} />
              <figcaption>{item.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
