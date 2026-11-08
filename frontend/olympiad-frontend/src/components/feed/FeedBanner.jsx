import React from "react";
import { useLanguage } from "../../context/LanguageContext";

function FeedBanner({ shownCount, activeTab }) {
  const { lang } = useLanguage();
  const albanian = lang === "sq";
  const tabLabels = albanian
    ? { all: "Të gjitha", following: "Ndjekjet", trending: "Të njohura" }
    : { all: "All", following: "Following", trending: "Trending" };

  return (
    <section className="feed-mini-banner" aria-labelledby="feed-heading">
      <div className="feed-mini-banner-content">
        <div className="feed-mini-kicker">
          <span className="feed-mini-kicker-dot" aria-hidden="true" />
          <span>{albanian ? "Olimpiada · Praktikë" : "Olimpiada · Practice"}</span>
        </div>

        <h1 className="feed-mini-title" id="feed-heading">
          {albanian ? "Probleme për t’u zgjidhur" : "Olympiad problem library"}
        </h1>

        <p className="feed-mini-subtitle">
          {albanian
            ? "Zgjidh probleme, ruaj pyetjet që të interesojnë dhe diskuto zgjidhjet me komunitetin."
            : "Solve challenging problems, save useful questions and discuss solutions with the community."}
        </p>
      </div>

      <div className="feed-mini-stats" aria-label={albanian ? "Gjendja e listës" : "Current list summary"}>
        <div className="feed-mini-stat">
          <span className="feed-mini-stat-value">{shownCount}</span>
          <span className="feed-mini-stat-label">
            {albanian ? "Në këtë faqe" : "On this page"}
          </span>
        </div>

        <div className="feed-mini-stat">
          <span className="feed-mini-stat-value">{tabLabels[activeTab] || activeTab}</span>
          <span className="feed-mini-stat-label">{albanian ? "Pamja" : "View"}</span>
        </div>
      </div>
    </section>
  );
}

export default FeedBanner;
