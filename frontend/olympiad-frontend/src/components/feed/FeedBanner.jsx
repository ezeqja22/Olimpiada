import React from "react";

function FeedBanner({ shownCount, activeTab }) {
  return (
    <section className="feed-mini-banner">
      <div className="feed-mini-banner-content">
        <div className="feed-mini-kicker">
          <span className="feed-mini-kicker-dot" />
          <span>Science Practice Hub</span>
        </div>

        <h1 className="feed-mini-title">Science Problems Feed</h1>

        <p className="feed-mini-subtitle">
          Explore olympiad-style science problems, follow strong creators,
          save useful questions, and discuss solutions with the community.
        </p>
      </div>

      <div className="feed-mini-stats">
        <div className="feed-mini-stat">
          <span className="feed-mini-stat-value">{shownCount}</span>
          <span className="feed-mini-stat-label">Shown</span>
        </div>

        <div className="feed-mini-stat">
          <span className="feed-mini-stat-value">{activeTab}</span>
          <span className="feed-mini-stat-label">Feed</span>
        </div>
      </div>
    </section>
  );
}

export default FeedBanner;
