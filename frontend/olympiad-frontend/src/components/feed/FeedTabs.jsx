import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import "./FeedTabs.css";

export default function FeedTabs({ activeTab, onTabChange, problemsCount }) {
  const { lang } = useLanguage();
  const labels = lang === "sq"
    ? [["all", "Të gjitha"], ["following", "Nga të ndjekurit"], ["trending", "Në vëmendje"]]
    : [["all", "All Problems"], ["following", "Following"], ["trending", "Trending"]];
  return (
    <div className="discovery-tabs">
      <div className="discovery-tabs__choices" aria-label={lang === "sq" ? "Renditja e problemeve" : "Problem feeds"} role="group">
        {labels.map(([value, label]) => <button key={value} type="button" aria-pressed={activeTab === value} onClick={() => onTabChange(value)}>{label}</button>)}
      </div>
      <span className="discovery-tabs__count">{problemsCount} {lang === "sq" ? "probleme" : problemsCount === 1 ? "problem" : "problems"}</span>
    </div>
  );
}
