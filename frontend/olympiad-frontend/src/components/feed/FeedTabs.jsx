import React from "react";

function FeedTabs({ activeTab, onTabChange, problemsCount }) {
  return (
    <section className="feed-tabs-card">
      <div className="feed-tabs">
        <button
          onClick={() => onTabChange("all")}
          className={`feed-tab-button ${activeTab === "all" ? "active" : ""}`}
        >
          All Problems
        </button>

        <button
          onClick={() => onTabChange("following")}
          className={`feed-tab-button ${
            activeTab === "following" ? "active" : ""
          }`}
        >
          Following
        </button>

        <button
          onClick={() => onTabChange("trending")}
          className={`feed-tab-button ${
            activeTab === "trending" ? "active" : ""
          }`}
        >
          Trending
        </button>
      </div>

      <div className="feed-count">
        <strong>{problemsCount}</strong>{" "}
        {problemsCount === 1 ? "problem" : "problems"} shown
      </div>
    </section>
  );
}

export default FeedTabs;
