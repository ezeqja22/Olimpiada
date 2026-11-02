import React,{useEffect,useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import {LockKeyhole} from "lucide-react";
import {useAuth} from "./context/AuthContext";
import "./phase1.css";
import SitePageIntro from "./components/SitePageIntro";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export default function ForumCatalogue(){
 const {currentUser}=useAuth(),[rows,setRows]=useState([]),[error,setError]=useState("");
 useEffect(()=>{if(!currentUser)return;axios.get(API+"/core/forums/catalog",{headers:headers()}).then(r=>setRows(r.data)).catch(()=>setError("Nuk u ngarkuan forumet."));},[currentUser]);
 return <main className="p1-wrap"><SitePageIntro contentKey="page_forums" kicker="Komuniteti i Olimpiada" title="Forumet dhe diskutimet" subtitle="Të gjithë nxënësit mund të shohin titujt e forumeve. Vetëm abonentët me planin përkatës mund të hyjnë në diskutime dhe ushtrime." />
 {!currentUser&&<p className="p1-note"><Link to="/explore">Eksploro listën publike</Link> ose <Link to="/login">hyr në llogari</Link>.</p>}
 {error&&<p className="p1-alert">{error}</p>}
 <div className="p1-grid">{rows.map(f=><article className="p1-card p1-item" key={f.id}>
   <div className="p1-row"><span className="p1-pill">{f.required_plan?.toUpperCase()}</span>{f.is_private&&<span className="p1-muted">Me ftesë</span>}</div>
   <h2>{f.title}</h2><p className="p1-muted">{f.subject||"Forum"}</p>
   {f.accessible?<Link className="p1-btn" to={"/forum/"+f.id}>Hyr në forum</Link>:
      <div className="p1-lock-overlay"><LockKeyhole size={22}/><strong>{f.title}</strong><span>{f.is_private?"Kërkohet ftesë dhe abonimi përkatës":"Për të hyrë nevojitet plani "+f.required_plan}</span><Link to="/pricing">Shiko abonimet</Link></div>}
 </article>)}</div>
 {rows.length===0&&currentUser&&!error&&<p className="p1-note">Nuk ka forume të publikuara.</p>}
 <p style={{marginTop:26}}><Link to="/forums" className="p1-btn alt">Hap panelin e komunitetit</Link></p>
 </main>;
}
