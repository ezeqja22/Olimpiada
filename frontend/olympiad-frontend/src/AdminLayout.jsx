/* eslint-disable react-hooks/exhaustive-deps */
import React,{useEffect,useState} from 'react';
import {Link,Outlet,useLocation,useNavigate} from 'react-router-dom';
import axios from 'axios';
import {useLanguage} from './context/LanguageContext';
import {loginIntent} from './navigation';
import {getAdminGroups,isAdminRouteActive,adminRoleLabel} from './adminNavigation';
import {AdminNavIcon} from './components/AdminDirectory';
import {useDialogFocus} from './hooks/useDialogFocus';
import './AdminLayout.css';
import './AdministrationWorkspace.css';

const API_URL=process.env.REACT_APP_API_URL||'http://127.0.0.1:8000';

export default function AdminLayout(){
 const navigate=useNavigate(),location=useLocation();
 const {lang,setLang}=useLanguage();
 const t=(en,sq)=>lang==='sq'?sq:en;
 const [sidebarOpen,setSidebarOpen]=useState(true);
 const [currentUser,setCurrentUser]=useState(null);
 const [loading,setLoading]=useState(true);
 const [isMobile,setIsMobile]=useState(false);
 const [query,setQuery]=useState('');
 const sidebarRef=useDialogFocus(isMobile&&sidebarOpen,()=>setSidebarOpen(false));

 useEffect(()=>{
  async function fetchCurrentUser(){
   try{
    const token=localStorage.getItem('token');
    if(!token){navigate('/login',{replace:true,state:loginIntent(location.pathname+location.search+location.hash)});return;}
    const response=await axios.get(API_URL+'/auth/me',{headers:{Authorization:'Bearer '+token}});
    if(!['admin','moderator','reviewer','super_admin'].includes(response.data.role)){navigate('/',{replace:true});return;}
    setCurrentUser(response.data);
   }catch(error){console.error('Error fetching current user:',error);navigate('/login',{replace:true,state:loginIntent(location.pathname+location.search+location.hash)});}
   finally{setLoading(false);}
  }
  fetchCurrentUser();
 },[]);
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 768px)');
  const sync=(event)=>{setIsMobile(event.matches);setSidebarOpen(!event.matches);};
  sync(media);media.addEventListener('change',sync);
  return()=>media.removeEventListener('change',sync);
 },[]);
 useEffect(()=>{if(isMobile)setSidebarOpen(false);setQuery('');},[location.pathname,isMobile]);

 const groups=getAdminGroups(currentUser?.role);
 const visibleGroups=sidebarOpen?getAdminGroups(currentUser?.role,query):groups;
 const activeGroup=groups.find(group=>group.items.some(item=>isAdminRouteActive(location.pathname,item.path)));
 const activeItem=activeGroup?.items.find(item=>isAdminRouteActive(location.pathname,item.path));
 if(loading)return <div className="admin-auth-loading" role="status"><div className="loading-spinner"/><span>{t('Loading admin panel…','Duke ngarkuar panelin…')}</span></div>;
 if(!currentUser)return null;

 return <div className={'admin-layout '+(sidebarOpen?'sidebar-expanded':'sidebar-collapsed')}>
  {isMobile&&sidebarOpen&&<button type="button" className="mobile-overlay show" aria-label={t('Close admin navigation','Mbyll menunë e administrimit')} onClick={()=>setSidebarOpen(false)}/>}
  <aside ref={sidebarRef} id="admin-navigation" role={isMobile&&sidebarOpen?'dialog':undefined} aria-modal={isMobile&&sidebarOpen?true:undefined} aria-label={t('Admin navigation','Menuja e administrimit')} inert={isMobile&&!sidebarOpen?true:undefined} className={'admin-sidebar '+(sidebarOpen?'open':'closed')}>
   <div className="admin-sidebar-header">
    {sidebarOpen&&<h2>{t('Admin Panel','Paneli i administrimit')}</h2>}
    <button type="button" className="sidebar-toggle" onClick={()=>setSidebarOpen(open=>!open)} aria-expanded={sidebarOpen} aria-controls="admin-navigation-links" aria-label={sidebarOpen?t('Collapse sidebar','Mbyll menunë'):t('Expand sidebar','Hap menunë')}>{isMobile?'×':sidebarOpen?'◀':'▶'}</button>
   </div>
   {sidebarOpen&&<div className="admin-nav-search"><label htmlFor="admin-nav-search">{t('Find a tool','Gjej një mjet')}</label><input id="admin-nav-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search admin tools…','Kërko në administrim…')}/></div>}
   <nav id="admin-navigation-links" className="admin-nav administration-navigation" aria-label={t('Admin navigation','Menuja e administrimit')}>
    {visibleGroups.map(group=><div className="administration-nav-group" key={group.id}>
     {sidebarOpen&&<h3>{group[lang]}</h3>}
     {group.items.map(item=><Link key={item.path} to={item.path} className={'admin-nav-item '+(isAdminRouteActive(location.pathname,item.path)?'active':'')} aria-current={isAdminRouteActive(location.pathname,item.path)?'page':undefined} title={!sidebarOpen?item[lang]:undefined} aria-label={!sidebarOpen?item[lang]:undefined} onClick={()=>{setQuery('');if(isMobile)setSidebarOpen(false);}}><span className="nav-icon"><AdminNavIcon name={item.icon}/></span>{sidebarOpen&&<span className="nav-label">{item[lang]}</span>}</Link>)}
    </div>)}
    {!visibleGroups.length&&<p className="admin-nav-empty" role="status">{t('No matching tools.','Nuk u gjet asnjë mjet.')}</p>}
   </nav>
   <div className="admin-sidebar-footer">
    <button type="button" className="back-to-site" onClick={()=>navigate('/')} title={!sidebarOpen?t('Back to site','Kthehu në faqe'):undefined} aria-label={!sidebarOpen?t('Back to site','Kthehu në faqe'):undefined}>
     <span className="nav-icon"><img src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795078/Home_icon_gezrca.svg" alt=""/></span>{sidebarOpen&&<span className="nav-label">{t('Back to site','Kthehu në faqe')}</span>}
    </button>
   </div>
  </aside>
  <div className="admin-content">
   <header className="admin-header">
    <div className="admin-header-left">
     {isMobile&&<button type="button" className="mobile-menu-toggle" onClick={()=>setSidebarOpen(true)} aria-label={t('Open admin navigation','Hap menunë e administrimit')} aria-expanded={sidebarOpen} aria-controls="admin-navigation">☰</button>}
     <div className="admin-header-copy">
      <div className="administration-breadcrumb"><Link to="/admin">{t('Administration','Administrimi')}</Link>{activeGroup&&activeItem?.path!=='/admin'&&<span>/ {activeGroup[lang]}</span>}<h1>{activeItem?.[lang]||t('Administration','Administrimi')}</h1></div>
      <span className="user-role">{adminRoleLabel(currentUser.role,lang)}</span>
     </div>
    </div>
    <div className="admin-header-right admin-header-tools">
     <span className="welcome-text">{t('Welcome','Mirë se erdhe')}, {currentUser.username}</span>
     <div className="admin-language-switch" role="group" aria-label="Language / Gjuha">
      <button type="button" aria-label="Shqip" aria-pressed={lang==='sq'} onClick={()=>setLang('sq')}>SQ</button>
      <button type="button" aria-label="English" aria-pressed={lang==='en'} onClick={()=>setLang('en')}>EN</button>
     </div>
    </div>
   </header>
   <main className="admin-main"><Outlet context={{currentUser}}/></main>
  </div>
 </div>;
}
