import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {useLanguage} from '../context/LanguageContext';
import {getAdminGroups,adminIcon} from '../adminNavigation';

const glyphs={
 olympiads:<><path d="M8 3h8v7a4 4 0 0 1-8 0V3Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 14v5M8 21h8M9 19h6"/></>,
 weekly:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 5 3 3 5-5"/></>,
 library:<><path d="M4 19V5a2 2 0 0 1 2-2h4v16H6a2 2 0 0 0 0 4M10 3h4v16h-4M14 5l4-1 4 15-4 1z"/></>,
 courses:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
 faq:<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2M12 17h.01"/></>,
};
export function AdminNavIcon({name}){
 const src=adminIcon(name);
 if(src)return <img src={src} alt=""/>;
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyphs[name]||glyphs.courses}</svg>;
}
export default function AdminDirectory({role}){
 const {lang}=useLanguage();
 const t=(en,sq)=>lang==='sq'?sq:en;
 const [query,setQuery]=useState('');
 const groups=getAdminGroups(role,query).map(group=>({...group,items:group.items.filter(item=>item.path!=='/admin')})).filter(group=>group.items.length);
 return <section className="administration-directory-panel" aria-labelledby="admin-directory-title">
  <header className="administration-directory-header">
   <div><h3 id="admin-directory-title">{t('Management tools','Mjetet e administrimit')}</h3><p>{t('Find the right workspace by section or search.','Gjej seksionin e duhur ose kërko sipas emrit.')}</p></div>
   <label className="administration-directory-search"><span>{t('Search tools','Kërko mjete')}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Olympiads, library, users…','Olimpiadat, biblioteka, përdoruesit…')}/></label>
  </header>
  <div className="administration-directory-grid">
   {groups.map(group=><section className="administration-directory-group" key={group.id}><h4>{group[lang]}</h4>
    {group.items.map(item=><Link to={item.path} key={item.path} className="administration-tool-link"><span className="administration-tool-icon"><AdminNavIcon name={item.icon}/></span><span><strong>{item[lang]}</strong><small>{lang==='sq'?item.descriptionSq:item.descriptionEn}</small></span><span className="administration-tool-arrow" aria-hidden="true">→</span></Link>)}
   </section>)}
  </div>
  {!groups.length&&<p className="administration-empty" role="status">{t('No matching tools. Try a different search.','Nuk u gjet asnjë mjet. Provo një kërkim tjetër.')}</p>}
 </section>;
}
