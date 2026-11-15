import {loginIntent} from "./navigation";
import React,{useEffect,useState,useRef} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import {useAuth} from "./context/AuthContext";
import MathRenderer from "./MathRenderer";
import "./phase1.css";
import {useLanguage} from "./context/LanguageContext";
import "./WeeklyWorkspace.css";
import SitePageIntro from "./components/SitePageIntro";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const hdr=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
const clock=s=>s?new Date(s+"Z").toLocaleString("sq-AL",{timeZone:"Europe/Tirane"}):"";
export default function WeeklyPage(){
 const {lang}=useLanguage(),sq=lang==="sq";
 const {currentUser}=useAuth(),[challenge,setChallenge]=useState(null),[answer,setAnswer]=useState(""),[notice,setNotice]=useState("");
 const [sending,setSending]=useState(false);
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false);
 const reload=()=>{setLoading(true);setLoadError(false);return axios.get(API+"/core/weekly").then(r=>setChallenge(r.data.challenge)).catch(()=>setLoadError(true)).finally(()=>setLoading(false));};
 useEffect(()=>{reload();},[]);
 const send=async e=>{e.preventDefault();if(sending)return;setSending(true);try{
  await axios.post(API+"/core/weekly/"+challenge.id+"/submit",{answer},{headers:hdr()});
  setNotice("Zgjidhja u dërgua për shqyrtim. Faleminderit!");setAnswer("");}catch(e){setNotice(e.response?.data?.detail||"Dërgimi dështoi. Zgjidhja jote është ruajtur në formular.");}finally{setSending(false);}};
 return <main className="weekly-workspace">
  <SitePageIntro contentKey="page_weekly" kicker={sq?"Sfida javore":"Weekly challenge"} title={sq?"Problema e Javës":"Problem of the Week"} subtitle={sq?"Çdo të hënë në 08:00 publikohet problemi i ri. Të dielën në 20:00 dalin fituesit dhe zgjidhja zyrtare.":"A new problem every Monday at 08:00. Results and the official solution are published on Sunday at 20:00."} actionTo="/explore" actionLabel={sq?"Eksploro":"Explore"} />
  <div className="weekly-workspace-grid">
    <div className="weekly-workspace-content">
      {loading?<p role="status">Loading…</p>:loadError?<div role="alert" className="ol-status">Could not load the weekly challenge. <button onClick={reload}>Retry</button></div>:!challenge?<section className="weekly-awaiting"><h2>{sq?"Sfida e radhës":"The next challenge"}</h2><p>{sq?"Problema nuk është publikuar ende. Publikimi bëhet të hënën në 08:00.":"The problem has not been published yet. Check back on Monday at 08:00."}</p><Link to="/feed">{sq?"Shfleto problemet ndërkohë →":"Browse problems meanwhile →"}</Link></section>:<>
        <article className="weekly-statement"><div className="weekly-edition">{sq?"Java e":"Week of"} {challenge.week_date}<span>{challenge.status}</span></div><h2><MathRenderer text={challenge.problem.title}/></h2><div className="weekly-statement-body"><MathRenderer text={challenge.problem.description}/></div></article>
        {challenge.status==="open"&&<section className="weekly-submission"><span className="weekly-section-number">02 / {sq?"Arsyetimi yt":"Your reasoning"}</span><h2>{sq?"Dërgo zgjidhjen tënde":"Submit your solution"}</h2><p>{sq?"Një zgjidhje për çdo nxënës. Administratori e miraton ose refuzon.":"One solution per student, reviewed by an administrator."}</p>
          {currentUser?<form onSubmit={send}><label htmlFor="weekly-answer">{sq?"Zgjidhja jote":"Your solution"}</label><textarea id="weekly-answer" required rows={9} maxLength={20000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={sq?"Shpjego arsyetimin dhe zgjidhjen tënde...":"Explain your reasoning and solution..."}/><button type="submit" disabled={sending}>{sending?(sq?"Duke dërguar…":"Sending…"):(sq?"Dërgo zgjidhjen":"Submit solution")}</button></form>:<Link to="/login" state={loginIntent("/weekly")} className="weekly-login">{sq?"Hyr për të dërguar zgjidhjen":"Sign in to submit your solution"}</Link>}
        </section>}
        {challenge.status==="published"&&<section className="weekly-official"><span className="weekly-section-number">02 / {sq?"Shqyrtimi":"Review"}</span><h2>{sq?"Zgjidhja zyrtare":"Official solution"}</h2><MathRenderer text={challenge.official_solution}/></section>}
      </>}
      {notice&&<p className="weekly-notice" role="status">{notice}</p>}
    </div>
    <aside className="weekly-schedule"><h2>{sq?"Këtë javë":"This week"}</h2><ol><li><span>01</span><div><strong>{sq?"Publikimi":"Publication"}</strong><p>{sq?"E hënë · 08:00":"Monday · 08:00"}</p></div></li><li><span>02</span><div><strong>{sq?"Afati i dorëzimit":"Submission deadline"}</strong><p>{challenge?.closes_at?clock(challenge.closes_at):(sq?"Shfaqet me problemën":"Shown with the problem")}</p></div></li><li><span>03</span><div><strong>{sq?"Zgjidhja dhe rezultatet":"Solution and results"}</strong><p>{sq?"E diel · 20:00":"Sunday · 20:00"}</p></div></li></ol><p className="weekly-timezone">Europe/Tirane</p>
      {challenge?.status==="published"&&<section className="weekly-winners"><h2>{sq?"Fituesit e javës":"This week's winners"}</h2>{challenge.winners.length?<ol>{challenge.winners.map(w=><li key={w.user_id}>{w.username}</li>)}</ol>:<p>{sq?"Asnjë zgjidhje nuk u miratua për këtë javë.":"No solutions were approved this week."}</p>}</section>}
    </aside>
  </div>
 </main>;
}

export function AdminWeekly(){
 const requestVersion=useRef(0),[submissionsLoading,setSubmissionsLoading]=useState(false);
 useEffect(()=>()=>{requestVersion.current+=1;},[]);
 const [week,setWeek]=useState(""),[problem,setProblem]=useState(""),[solution,setSolution]=useState(""),[rows,setRows]=useState([]),[selected,setSelected]=useState(null),[submissions,setSubmissions]=useState([]),[notice,setNotice]=useState("");
 const [problemQuery,setProblemQuery]=useState(''),[problemOptions,setProblemOptions]=useState([]),[searchError,setSearchError]=useState('');
 useEffect(()=>{let live=true;setSearchError('');setProblemOptions([]);if(problemQuery.trim().length<2)return;const timer=setTimeout(()=>axios.get(API+'/auth/problems/search',{params:{q:problemQuery,limit:20},headers:hdr()}).then(r=>{if(live)setProblemOptions(r.data.problems)}).catch(()=>{if(live)setSearchError('Search failed. Change the search text to retry.')}),250);return()=>{live=false;clearTimeout(timer)}},[problemQuery]);
 const reload=()=>axios.get(API+"/core/weekly/admin/queue",{headers:hdr()}).then(r=>setRows(r.data)).catch(()=>setNotice("Could not load scheduled challenges. Please retry."));
 useEffect(()=>{reload();},[]);
 const schedule=async e=>{e.preventDefault();try{await axios.post(API+"/core/weekly/admin/schedule",{week_date:week,problem_id:Number(problem),official_solution:solution},{headers:hdr()});setNotice("Java u programua me sukses.");reload();}catch(e){setNotice(e.response?.data?.detail||"Programimi dështoi.");}};
 const open=async id=>{const version=++requestVersion.current;setSelected(id);setSubmissions([]);setSubmissionsLoading(true);setNotice("");try{const r=await axios.get(API+"/core/weekly/admin/"+id+"/submissions",{headers:hdr()});if(version===requestVersion.current)setSubmissions(r.data);}catch(e){if(version===requestVersion.current)setNotice("Nuk u lexuan zgjidhjet. Provo përsëri.");}finally{if(version===requestVersion.current)setSubmissionsLoading(false);}};
 const decide=async(id,approve)=>{try{await axios.post(API+"/core/weekly/admin/submissions/"+id+"/review",{approve,note:""},{headers:hdr()});await open(selected);}catch(e){setNotice(e.response?.data?.detail||"Vendimi nuk u ruajt.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Problema e Javës · Administrimi</h1>
 <section className="p1-card p1-group"><h2>Programo javën e ardhshme</h2><p className="p1-muted">Data duhet të jetë e hënë; sistemi publikon në 08:00 dhe publikon zgjidhjen/fituesit të dielën 20:00 sipas Europe/Tirane.</p>
 <form className="p1-form" onSubmit={schedule}><label>E hëna<input className="p1-input" required type="date" value={week} onChange={e=>setWeek(e.target.value)}/></label><label>Search problems<input className="p1-input" value={problemQuery} onChange={e=>{setProblemQuery(e.target.value);setProblem('')}} placeholder="At least two characters"/></label>
 {searchError&&<p role="alert">{searchError}</p>}<label>Problem<select className="p1-select" required value={problem} onChange={e=>setProblem(e.target.value)}><option value="">Choose a problem</option>{problemOptions.map(p=><option key={p.id} value={p.id}>{p.title} · {p.subject} (#{p.id})</option>)}</select></label>
 <label>Zgjidhja zyrtare (mbahet private deri të dielën)<textarea className="p1-input" required rows={6} value={solution} onChange={e=>setSolution(e.target.value)}/></label><button className="p1-btn" type="submit">Programo publikimin</button></form></section>
 <section className="p1-card"><h2>Javët dhe verifikimi i zgjidhjeve</h2><button className="p1-btn alt" onClick={reload}>Refresh queue</button>{rows.map(r=><div className="p1-row" style={{padding:"12px 0",borderBottom:"1px solid #ddd"}} key={r.id}><span>{r.week_date} · {r.status} · problemi #{r.problem_id}</span><button className="p1-btn alt" onClick={()=>open(r.id)}>Shiko zgjidhjet</button></div>)}</section>
 {selected&&<section className="p1-card p1-group"><h2>Zgjidhjet · #{selected}</h2>{submissionsLoading?<p role="status">Duke ngarkuar…</p>:<button className="p1-btn alt" onClick={()=>open(selected)}>Ringarko zgjidhjet</button>}{submissions.map(s=><article key={s.id} style={{padding:"12px 0",borderBottom:"1px solid #ddd"}}><div className="p1-row"><strong>Student ID: {s.student_id} · {s.status}</strong>{s.status==="pending"&&<div className="p1-row"><button className="p1-btn" onClick={()=>decide(s.id,true)}>Aprovo</button><button className="p1-btn alt" onClick={()=>decide(s.id,false)}>Refuzo</button></div>}</div><p style={{whiteSpace:"pre-wrap"}}>{s.answer}</p>
 </article>)}</section>}
 {notice&&<p className="p1-note" role="status">{notice}</p>}</main>;
}
