import React,{useEffect,useState} from 'react';
import {Link,useOutletContext} from 'react-router-dom';
import axios from 'axios';
import {useLanguage} from './context/LanguageContext';
import {adminRoleLabel} from './adminNavigation';
import AdminDirectory from './components/AdminDirectory';
import './AdminLayout.css';
import './AdministrationWorkspace.css';

const API_URL=process.env.REACT_APP_API_URL||'http://127.0.0.1:8000';

export default function AdminDashboard(){
 const context=useOutletContext();
 const {lang}=useLanguage();
 const t=(en,sq)=>lang==='sq'?sq:en;
 const [stats,setStats]=useState(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 const date=(value)=>new Date(value).toLocaleDateString(lang==='sq'?'sq-AL':'en-GB');
 async function fetchDashboardStats(){
  try{
   setLoading(true);setError(false);
   const token=localStorage.getItem('token');
   const response=await axios.get(API_URL+'/admin/dashboard',{headers:{Authorization:'Bearer '+token}});
   setStats(response.data);
  }catch(err){setError(true);console.error('Dashboard error:',err);}
  finally{setLoading(false);}
 }
 useEffect(()=>{fetchDashboardStats();},[]);
 return <div className="administration-overview">
  <header className="administration-heading"><div><p>{t('Platform overview','Përmbledhja e platformës')}</p><h2>{t('Community & learning','Komuniteti dhe mësimi')}</h2></div><button onClick={fetchDashboardStats} disabled={loading}>{t('Refresh overview','Rifresko përmbledhjen')}</button></header>
  {!loading&&!error&&stats&&<div className="administration-summary">
    {[[t('Members','Anëtarët'),stats.users.total,t(stats.users.new_today+' joined today',stats.users.new_today+' u regjistruan sot'),'/admin/users'],[t('Active members','Anëtarët aktivë'),stats.users.active,t(stats.users.banned+' banned',stats.users.banned+' të bllokuar'),'/admin/users'],[t('Problems','Problemet'),stats.problems.total,t(stats.problems.new_today+' published today',stats.problems.new_today+' të publikuara sot'),'/admin/content'],[t('Forums','Forumet'),stats.forums.total,t(stats.forums.public+' public · '+stats.forums.private+' private',stats.forums.public+' publike · '+stats.forums.private+' private'),'/admin/forums']].map(([title,value,note,path])=><Link key={title} to={path}><span>{title}</span><strong>{value}</strong><small>{note}</small></Link>)}
   </div>}
  <AdminDirectory role={context?.currentUser?.role}/>
  {loading?<div className="loading" role="status" aria-label={t('Loading overview','Duke ngarkuar përmbledhjen')}><div className="loading-spinner"/></div>:error||!stats?<div className="admin-card admin-error-card" role="alert"><h2>{t('Overview unavailable','Përmbledhja nuk është e disponueshme')}</h2><p>{t('Could not load dashboard statistics. You can still use the management tools above.','Statistikat nuk u ngarkuan. Mund të përdorësh ende mjetet e administrimit më sipër.')}</p><button className="admin-btn" onClick={fetchDashboardStats}>{t('Try again','Provo përsëri')}</button></div>:<>
   <div className="administration-columns">
    <section className="administration-activity">
     <header><h3>{t('Recent members','Anëtarët e fundit')}</h3><Link to="/admin/users">{t('Manage users','Administro përdoruesit')} →</Link></header>
     {stats.recent_users.length?<div className="administration-table" tabIndex={0} role="region" aria-label={t('Recent members','Anëtarët e fundit')}><table><thead><tr>{[t('Member','Anëtari'),t('Role','Roli'),t('Status','Statusi'),t('Joined','Regjistrimi')].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{stats.recent_users.map(user=><tr key={user.id}><td><strong>{user.username}</strong><small>{user.email}</small></td><td>{adminRoleLabel(user.role,lang)}</td><td><span className={user.is_active?'administration-status':'administration-status is-muted'}>{user.is_active?t('Active','Aktiv'):t('Inactive','Joaktiv')}</span></td><td>{date(user.created_at)}</td></tr>)}</tbody></table></div>:<p className="administration-empty">{t('No recent members.','Nuk ka anëtarë të rinj.')}</p>}
     <header><h3>{t('Recent forums','Forumet e fundit')}</h3><Link to="/admin/forums">{t('Moderate forums','Modero forumet')} →</Link></header>
     {stats.recent_forums.length?<div className="administration-forum-list">{stats.recent_forums.map(forum=><article key={forum.id}><div><Link to={'/forum/'+forum.id}>{forum.title}</Link><p>{forum.creator} · {date(forum.created_at)}</p></div><span className="administration-status is-muted">{forum.is_private?t('Private','Privat'):t('Public','Publik')}</span></article>)}</div>:<p className="administration-empty">{t('No recent forums.','Nuk ka forume të reja.')}</p>}
    </section>
    <aside className="administration-actions"><section className="administration-review"><p>{t('Moderation queue','Radha e moderimit')}</p><strong>{stats.reports.pending}</strong><h3>{t('Reports awaiting review','Raportime në pritje të shqyrtimit')}</h3><Link to="/admin/reports">{t('Review reports','Shqyrto raportimet')} →</Link></section></aside>
   </div>
  </>}
 </div>;
}
