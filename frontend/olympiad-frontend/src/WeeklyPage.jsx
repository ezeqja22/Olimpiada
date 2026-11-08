import {loginIntent} from "./navigation";
import React,{useEffect,useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import {useAuth} from "./context/AuthContext";
import MathRenderer from "./MathRenderer";
import "./phase1.css";
import SitePageIntro from "./components/SitePageIntro";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const hdr=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
const clock=s=>s?new Date(s+"Z").toLocaleString("sq-AL",{timeZone:"Europe/Tirane"}):"";
export default function WeeklyPage(){
 const {currentUser}=useAuth(),[challenge,setChallenge]=useState(null),[answer,setAnswer]=useState(""),[notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false);
 const reload=()=>{setLoading(true);setLoadError(false);return axios.get(API+"/core/weekly").then(r=>setChallenge(r.data.challenge)).catch(()=>setLoadError(true)).finally(()=>setLoading(false));};
 useEffect(()=>{reload();},[]);
 const send=async e=>{e.preventDefault();try{
  await axios.post(API+"/core/weekly/"+challenge.id+"/submit",{answer},{headers:hdr()});
  setNotice("Zgjidhja u dërgua për shqyrtim. Faleminderit!");setAnswer("");}catch(e){setNotice(e.response?.data?.detail||"Dërgimi dështoi.");}};
 return <main className="p1-wrap"><SitePageIntro contentKey="page_weekly" kicker="Sfida javore · Falas" title="Problema e Javës" subtitle="Çdo të hënë në 08:00 publikohet problemi i ri. Të dielën në 20:00 dalin fituesit dhe zgjidhja zyrtare." actionTo="/explore" actionLabel="Eksploro" />
 {loading?<p role="status">Loading…</p>:loadError?<div role="alert" className="ol-status">Could not load the weekly challenge. <button onClick={reload}>Retry</button></div>:!challenge?<section className="p1-card">Problema nuk është publikuar ende. Publikimi bëhet të hënën në 08:00.</section>:<div className="p1-rows">
  <section className="p1-card"><span className="p1-pill">Java e {challenge.week_date}</span><h2>{challenge.problem.title}</h2><div className="p1-muted">Mbyllet: {clock(challenge.closes_at)} • Statusi: {challenge.status}</div><div style={{marginTop:16}}><MathRenderer text={challenge.problem.description}/></div></section>
  {challenge.status==="open"&&<section className="p1-card"><h2>Dërgo zgjidhjen tënde</h2><p className="p1-muted">Një zgjidhje për çdo nxënës. Administratori e miraton ose refuzon.</p>
  {currentUser?<form className="p1-form" onSubmit={send}><textarea className="p1-input" required rows={7} maxLength={20000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Shpjego arsyetimin dhe zgjidhjen tënde..." />
<button className="p1-btn" type="submit">Dërgo zgjidhjen</button></form>:<Link to="/login" state={loginIntent("/weekly")} className="p1-btn">Hyr për të dërguar zgjidhjen</Link>}</section>}
  {challenge.status==="published"&&<><section className="p1-card"><h2>Zgjidhja zyrtare</h2><MathRenderer text={challenge.official_solution}/></section><section className="p1-card"><h2>Fituesit e javës</h2>{challenge.winners.length? <ol>{challenge.winners.map(w=><li key={w.user_id}>{w.username}</li>)}</ol>:<p>Asnjë zgjidhje nuk u miratua për këtë javë.</p>}</section></>}
 </div>}
 {notice&&<p className="p1-note" role="status">{notice}</p>}
 </main>;
}
export function AdminWeekly(){
 const [week,setWeek]=useState(""),[problem,setProblem]=useState(""),[solution,setSolution]=useState(""),[rows,setRows]=useState([]),[selected,setSelected]=useState(null),[submissions,setSubmissions]=useState([]),[notice,setNotice]=useState("");
 const [problemQuery,setProblemQuery]=useState(''),[problemOptions,setProblemOptions]=useState([]),[searchError,setSearchError]=useState('');
 useEffect(()=>{let live=true;setSearchError('');setProblemOptions([]);if(problemQuery.trim().length<2)return;const timer=setTimeout(()=>axios.get(API+'/auth/problems/search',{params:{q:problemQuery,limit:20},headers:hdr()}).then(r=>{if(live)setProblemOptions(r.data.problems)}).catch(()=>{if(live)setSearchError('Search failed. Change the search text to retry.')}),250);return()=>{live=false;clearTimeout(timer)}},[problemQuery]);
 const reload=()=>axios.get(API+"/core/weekly/admin/queue",{headers:hdr()}).then(r=>setRows(r.data)).catch(()=>setNotice("Could not load scheduled challenges. Please retry."));
 useEffect(()=>{reload();},[]);
 const schedule=async e=>{e.preventDefault();try{await axios.post(API+"/core/weekly/admin/schedule",{week_date:week,problem_id:Number(problem),official_solution:solution},{headers:hdr()});setNotice("Java u programua me sukses.");reload();}catch(e){setNotice(e.response?.data?.detail||"Programimi dështoi.");}};
 const open=async id=>{setSelected(id);try{const r=await axios.get(API+"/core/weekly/admin/"+id+"/submissions",{headers:hdr()});setSubmissions(r.data);}catch(e){setNotice("Nuk u lexuan zgjidhjet.");}};
 const decide=async(id,approve)=>{try{await axios.post(API+"/core/weekly/admin/submissions/"+id+"/review",{approve,note:""},{headers:hdr()});await open(selected);}catch(e){setNotice(e.response?.data?.detail||"Vendimi nuk u ruajt.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Problema e Javës · Administrimi</h1>
 <section className="p1-card p1-group"><h2>Programo javën e ardhshme</h2><p className="p1-muted">Data duhet të jetë e hënë; sistemi publikon në 08:00 dhe publikon zgjidhjen/fituesit të dielën 20:00 sipas Europe/Tirane.</p>
 <form className="p1-form" onSubmit={schedule}><label>E hëna<input className="p1-input" required type="date" value={week} onChange={e=>setWeek(e.target.value)}/></label><label>Search problems<input className="p1-input" value={problemQuery} onChange={e=>{setProblemQuery(e.target.value);setProblem('')}} placeholder="At least two characters"/></label>
 {searchError&&<p role="alert">{searchError}</p>}<label>Problem<select className="p1-select" required value={problem} onChange={e=>setProblem(e.target.value)}><option value="">Choose a problem</option>{problemOptions.map(p=><option key={p.id} value={p.id}>{p.title} · {p.subject} (#{p.id})</option>)}</select></label>
 <label>Zgjidhja zyrtare (mbahet private deri të dielën)<textarea className="p1-input" required rows={6} value={solution} onChange={e=>setSolution(e.target.value)}/></label><button className="p1-btn" type="submit">Programo publikimin</button></form></section>
 <section className="p1-card"><h2>Javët dhe verifikimi i zgjidhjeve</h2><button className="p1-btn alt" onClick={reload}>Refresh queue</button>{rows.map(r=><div className="p1-row" style={{padding:"12px 0",borderBottom:"1px solid #ddd"}} key={r.id}><span>{r.week_date} · {r.status} · problemi #{r.problem_id}</span><button className="p1-btn alt" onClick={()=>open(r.id)}>Shiko zgjidhjet</button></div>)}</section>
 {selected&&<section className="p1-card p1-group"><h2>Zgjidhjet · #{selected}</h2>{submissions.map(s=><article key={s.id} style={{padding:"12px 0",borderBottom:"1px solid #ddd"}}><div className="p1-row"><strong>Student ID: {s.student_id} · {s.status}</strong>{s.status==="pending"&&<div className="p1-row"><button className="p1-btn" onClick={()=>decide(s.id,true)}>Aprovo</button><button className="p1-btn alt" onClick={()=>decide(s.id,false)}>Refuzo</button></div>}</div><p style={{whiteSpace:"pre-wrap"}}>{s.answer}</p>
 </article>)}</section>}
 {notice&&<p className="p1-note" role="status">{notice}</p>}</main>;
}
