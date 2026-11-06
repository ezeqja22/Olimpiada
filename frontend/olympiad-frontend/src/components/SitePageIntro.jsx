import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import RichInlineText from "./RichInlineText";
import { SECTION_DEFAULTS } from "../siteContentConfig";
import "../siteContent.css";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

/** Read only the public CMS content. Empty/missing values keep the original page copy. */
export function useSiteBlock(key) {
  const [block, setBlock] = useState(null);
  useEffect(() => {
    let active = true;
    axios.get(API + "/experience/content")
      .then(r => { if (active) setBlock(r.data?.[key] || null); })
      .catch(() => {});
    return () => { active = false; };
  }, [key]);
  return block;
}

export default function SitePageIntro({
  contentKey, kicker, title, subtitle,
  actionTo, actionLabel, variant = "page"
}) {
  const { lang } = useLanguage();
  const block = useSiteBlock(contentKey);
  const displayTitle = block?.["title_" + lang]?.trim() || SECTION_DEFAULTS[contentKey]?.["title_" + lang] || title;
  const displaySubtitle = block?.["subtitle_" + lang]?.trim() || SECTION_DEFAULTS[contentKey]?.["subtitle_" + lang] || subtitle;
  const image = block?.image_url?.trim();
  return (
    <header className={"site-page-intro site-page-intro--" + variant}>
      <div className="site-page-intro__copy">
        {kicker && <span className="site-page-intro__kicker">{kicker}</span>}
        <h1><RichInlineText text={displayTitle} /></h1>
        {displaySubtitle && <p className="p3-rich-inline"><RichInlineText text={displaySubtitle}/></p>}
        {actionTo && <Link className="site-page-intro__action" to={actionTo}>{actionLabel}</Link>}
      </div>
      {image && <div className="site-page-intro__photo">
        <img loading="lazy" decoding="async" src={image} alt={displayTitle} />
      </div>}
    </header>
  );
}
