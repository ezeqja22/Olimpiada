import React from 'react';
import {useLanguage} from '../../context/LanguageContext';
export default function FeedBanner({shownCount,activeTab}) {
 const {lang}=useLanguage(),sq=lang==='sq';
 const tabs=sq?{all:'Të gjitha',following:'Të ndjekurit',trending:'Në diskutim'}:{all:'All',following:'Following',trending:'Trending'};
 return <section className="feed-mini-banner"><div className="feed-mini-banner-content">
  <div className="feed-mini-kicker">{sq?'Matematikë dhe shkenca':'Mathematics and science'}</div>
  <h1 className="feed-mini-title">{sq?'Probleme për të zgjidhur':'Problems to solve'}</h1>
  <p className="feed-mini-subtitle">{sq?'Shfleto problemet, ruaj ato që të interesojnë dhe diskuto zgjidhjet.':'Browse problems, save those that interest you and discuss solutions.'}</p>
 </div><div className="feed-mini-stats"><div className="feed-mini-stat"><span className="feed-mini-stat-value">{shownCount}</span><span className="feed-mini-stat-label">{sq?'Probleme':'Problems'}</span></div><div className="feed-mini-stat"><span className="feed-mini-stat-value">{tabs[activeTab]}</span><span className="feed-mini-stat-label">{sq?'Pamja':'View'}</span></div></div></section>;
}
