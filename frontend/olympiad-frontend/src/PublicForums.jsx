import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Layout from "./components/Layout";
import SitePageIntro from "./components/SitePageIntro";
import { loginIntent } from "./navigation";
import "./ForumDirectory.css";
import { useLanguage } from "./context/LanguageContext";
export default function PublicForums() {
  const { lang } = useLanguage();
  const [rows, setRows] = useState([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("loading"),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus("loading");
    axios
      .get(
        (process.env.REACT_APP_API_URL || "http://127.0.0.1:8000") +
          "/public/forums",
      )
      .then((r) => {
        if (active) {
          setRows(r.data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const sq=lang==='sq';
  const visible=rows.filter(f=>(f.title+' '+f.subject).toLowerCase().includes(query.toLowerCase()));
  return <Layout><div className="public-community-directory">
    <SitePageIntro contentKey="page_forums" title={sq?'Forumet':'Forums'} subtitle={sq?'Gjej një komunitet dhe bashkohu në diskutim.':'Find a community and join the discussion.'}/>
    <div className="forum-directory-layout">
      <aside className="forum-directory-rail"><h2>{sq?'Komuniteti':'Community'}</h2><p>{sq?'Shfleto forumet publike. Hyr për t’u bashkuar ose për të krijuar një forum. Diskutimet private kërkojnë anëtarësi.':'Browse public forums. Sign in to join or create a forum. Private discussions require membership.'}</p><Link className="public-community-login" to="/login" state={loginIntent('/forums')}>{sq?'Hyr në komunitet':'Join the community'} →</Link></aside>
      <section className="public-community-results"><label>{sq?'Kërko forume':'Search forums'}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        {status==='loading'&&<p role="status">{sq?'Duke ngarkuar…':'Loading…'}</p>}
        {status==='error'&&<div role="alert">{sq?'Forumet nuk u ngarkuan.':'Could not load forums.'}<button onClick={()=>setRetry(x=>x+1)}>{sq?'Provo përsëri':'Retry'}</button></div>}
        {status==='ready'&&<><p className="public-community-count">{visible.length} {sq?'forume publike':'public forums'}</p>{visible.map(f=><article className="forum-directory-entry" key={f.id}><div className="forum-directory-symbol" aria-hidden="true">{f.title?.slice(0,1)}</div><div className="forum-directory-content"><div className="forum-directory-meta">{f.subject} · {f.level}</div><h2>{f.title}</h2></div><Link className="public-community-join" to="/login" state={loginIntent('/forums')}>{sq?'Hyr për t’u bashkuar':'Log in to join'} →</Link></article>)}{!visible.length&&<p>{query?(sq?'Nuk u gjetën forume për këtë kërkim.':'No forums match this search.'):(sq?'Ende nuk ka forume publike.':'No public forums yet.')}</p>}</>}
      </section>
    </div>
  </div></Layout>;
}
