import {PublishingHeader} from "./components/PublishingWorkspace";
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
const weeklyStatuses = {
 scheduled: ["E planifikuar", "Scheduled"], open: ["E hapur", "Open"],
 closed: ["E mbyllur", "Closed"], published: ["E publikuar", "Published"],
 pending: ["Në shqyrtim", "Pending"], approved: ["Miratuar", "Approved"],
 rejected: ["Refuzuar", "Rejected"],
};
const statusLabel = (value, sq) => weeklyStatuses[value]?.[sq ? 0 : 1] ?? value;
function WeeklyRankings({challenge, sq}) {
 const [mode,setMode]=useState("total"),[week,setWeek]=useState("");
 const [weeks,setWeeks]=useState([]),[rows,setRows]=useState(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const selection=mode==="week"?week:"";
 useEffect(()=>{
  let active=true;
  setRows(null);setFailed(false);
  axios.get(API+"/core/weekly/rankings",{params:selection?{week:selection}:{}})
   .then(({data})=>{if(active){setWeeks(data.weeks||[]);setRows(data.rankings||[]);}})
   .catch(()=>{if(active)setFailed(true);});
  return()=>{active=false;};
 },[selection,challenge?.id,challenge?.status,retry]);
 const shown=mode==="week"&&!week?challenge?.rankings||[]:rows;
 return <section className="weekly-rankings" aria-labelledby="weekly-rankings-title">
  <h2 id="weekly-rankings-title">{sq?"Renditja":"Leaderboard"}</h2>
  <div className="weekly-rankings-controls">
   <button type="button" aria-pressed={mode==="total"} onClick={()=>setMode("total")}>{sq?"Totali":"Overall"}</button>
   <button type="button" aria-pressed={mode==="week"} onClick={()=>setMode("week")}>{sq?"Sipas javës":"By week"}</button>
  </div>
  {mode==="week"&&<label>{sq?"Java":"Week"} <select value={week} onChange={e=>setWeek(e.target.value)}>
   <option value="">{sq?"Këtë javë":"This week"}</option>{weeks.map(value=><option key={value}>{value}</option>)}
  </select></label>}
  {mode==="week"&&!week&&challenge?.status!=="published"?<p>{sq?"Pikët shfaqen kur publikohen rezultatet.":"Scores appear when the results are published."}</p>
   :failed&&(mode==="total"||week)?<p role="alert">{sq?"Renditja nuk u ngarkua.":"Leaderboard could not be loaded."} <button onClick={()=>setRetry(n=>n+1)}>{sq?"Riprovo":"Retry"}</button></p>
   :shown===null?<p role="status">{sq?"Duke ngarkuar…":"Loading…"}</p>
   :shown.length?<div className="weekly-rankings-scroll"><table>
    <thead><tr><th scope="col">#</th><th scope="col">{sq?"Nxënësi":"Student"}</th><th scope="col">{sq?"Pikë":"Points"}</th></tr></thead>
    <tbody>{shown.map(row=><tr key={row.username}><td>{row.rank}</td><td>{row.username}</td><td>{row.points}</td></tr>)}</tbody>
   </table></div>:<p>{sq?"Ende s’ka pikë të publikuara.":"No published scores yet."}</p>}
 </section>;
}

export default function WeeklyPage(){
 const {lang}=useLanguage(),sq=lang==="sq";
 const {currentUser}=useAuth(),[challenge,setChallenge]=useState(null),[answer,setAnswer]=useState(""),[notice,setNotice]=useState("");
 const [sending,setSending]=useState(false);
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false);
 const reload=()=>{setLoading(true);setLoadError(false);return axios.get(API+"/core/weekly").then(r=>setChallenge(r.data.challenge)).catch(()=>setLoadError(true)).finally(()=>setLoading(false));};
 useEffect(()=>{reload();},[]);
 useEffect(()=>{
  const refresh=()=>axios.get(API+"/core/weekly").then(r=>setChallenge(r.data.challenge)).catch(()=>{});
  const timer=setInterval(refresh,60000);
  window.addEventListener("focus",refresh);
  return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);};
 },[]);
 const send=async e=>{e.preventDefault();if(sending)return;setSending(true);try{
  await axios.post(API+"/core/weekly/"+challenge.id+"/submit",{answer},{headers:hdr()});
  setNotice(sq?"Zgjidhja u dërgua për shqyrtim.":"Your solution was submitted for review.");setAnswer("");}catch(e){setNotice(e.response?.data?.detail||(sq?"Dërgimi dështoi. Zgjidhja jote është ruajtur në formular.":"Submission failed. Your solution is still in the form."));}finally{setSending(false);}};
 return <main className="weekly-workspace">
  <SitePageIntro contentKey="page_weekly" kicker={sq?"Sfida javore":"Weekly challenge"} title={sq?"Problema e Javës":"Problem of the Week"} subtitle={sq?"Çdo të hënë në 08:00 publikohet problemi i ri. Dërgimet mbyllen të dielën në 20:00. Rezultatet publikohen pas vlerësimit.":"A new problem every Monday at 08:00. Submissions close Sunday at 20:00. Results are published after grading."} actionTo="/explore" actionLabel={sq?"Eksploro":"Explore"} />
  <div className="weekly-workspace-grid">
    <div className="weekly-workspace-content">
      {loading?<p role="status">{sq?"Duke ngarkuar…":"Loading…"}</p>:loadError?<div role="alert" className="ol-status">{sq?"Sfida nuk u ngarkua.":"Could not load the weekly challenge."} <button onClick={reload}>{sq?"Riprovo":"Retry"}</button></div>:!challenge?<section className="weekly-awaiting"><h2>{sq?"Sfida e radhës":"The next challenge"}</h2><p>{sq?"Problema nuk është publikuar ende. Publikimi bëhet të hënën në 08:00.":"The problem has not been published yet. Check back on Monday at 08:00."}</p><Link to="/feed">{sq?"Shfleto problemet ndërkohë →":"Browse problems meanwhile →"}</Link></section>:<>
        <article className="weekly-statement"><div className="weekly-edition">{sq?"Java e":"Week of"} {challenge.week_date}<span>{statusLabel(challenge.status,sq)}</span></div><h2><MathRenderer text={challenge.problem.title}/></h2><div className="weekly-statement-body"><MathRenderer text={challenge.problem.description}/></div></article>
        {challenge.status==="open"&&<section className="weekly-submission"><span className="weekly-section-number">02 / {sq?"Arsyetimi yt":"Your reasoning"}</span><h2>{sq?"Dërgo zgjidhjen tënde":"Submit your solution"}</h2><p>{sq?"Një zgjidhje për çdo nxënës. Administratori e miraton ose refuzon.":"One solution per student, reviewed by an administrator."}</p>
          {currentUser?<form onSubmit={send}><label htmlFor="weekly-answer">{sq?"Zgjidhja jote":"Your solution"}</label><textarea id="weekly-answer" required rows={9} maxLength={20000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={sq?"Shpjego arsyetimin dhe zgjidhjen tënde...":"Explain your reasoning and solution..."}/><button type="submit" disabled={sending}>{sending?(sq?"Duke dërguar…":"Sending…"):(sq?"Dërgo zgjidhjen":"Submit solution")}</button></form>:<Link to="/login" state={loginIntent("/weekly")} className="weekly-login">{sq?"Hyr për të dërguar zgjidhjen":"Sign in to submit your solution"}</Link>}
        </section>}
        {challenge.status==="closed"&&<p role="status">{sq?'Dërgimet janë mbyllur. Rezultatet presin përfundimin e vlerësimit.':'Submissions are closed. Results await completion of grading.'}</p>}
        {challenge.status==="published"&&<section className="weekly-official"><span className="weekly-section-number">02 / {sq?"Shqyrtimi":"Review"}</span><h2>{sq?"Zgjidhja zyrtare":"Official solution"}</h2><MathRenderer text={challenge.official_solution}/></section>}
      </>}
      {notice&&<p className="weekly-notice" role="status">{notice}</p>}
    </div>
    <aside className="weekly-schedule"><h2>{sq?"Këtë javë":"This week"}</h2><ol><li><span>01</span><div><strong>{sq?"Publikimi":"Publication"}</strong><p>{sq?"E hënë · 08:00":"Monday · 08:00"}</p></div></li><li><span>02</span><div><strong>{sq?"Afati i dorëzimit":"Submission deadline"}</strong><p>{challenge?.closes_at?clock(challenge.closes_at):(sq?"Shfaqet me problemën":"Shown with the problem")}</p></div></li><li><span>03</span><div><strong>{sq?"Zgjidhja dhe rezultatet":"Solution and results"}</strong><p>{sq?"Pas përfundimit të vlerësimit":"After grading is complete"}</p></div></li></ol><p className="weekly-timezone">Europe/Tirane</p>
      <WeeklyRankings challenge={challenge} sq={sq}/>
      {challenge?.status==="published"&&<section className="weekly-winners"><h2>{sq?"Fituesit e javës":"This week's winners"}</h2>{challenge.winners?.length?<ol>{challenge.winners.map(w=><li key={w.username}>{w.username}</li>)}</ol>:<p>{sq?"Asnjë zgjidhje nuk u miratua për këtë javë.":"No solutions were approved this week."}</p>}</section>}
    </aside>
  </div>
 </main>;
}

export function AdminWeekly(){
 const requestVersion=useRef(0),[submissionsLoading,setSubmissionsLoading]=useState(false);
 useEffect(()=>()=>{requestVersion.current+=1;},[]);
 const [week,setWeek]=useState(""),[problem,setProblem]=useState(""),[solution,setSolution]=useState(""),[rows,setRows]=useState([]),[selected,setSelected]=useState(null),[submissions,setSubmissions]=useState([]),[notice,setNotice]=useState("");
 const [grades,setGrades]=useState({}),[savingReview,setSavingReview]=useState(null);
 const [problemQuery,setProblemQuery]=useState(''),[problemOptions,setProblemOptions]=useState([]),[searchError,setSearchError]=useState('');
 useEffect(()=>{let live=true;setSearchError('');setProblemOptions([]);if(problemQuery.trim().length<2)return;const timer=setTimeout(()=>axios.get(API+'/auth/problems/search',{params:{q:problemQuery,limit:20},headers:hdr()}).then(r=>{if(live)setProblemOptions(r.data.problems)}).catch(()=>{if(live)setSearchError(t('Kërkimi dështoi. Ndrysho tekstin për të riprovuar.','Search failed. Change the search text to retry.'))}),250);return()=>{live=false;clearTimeout(timer)}},[problemQuery]);
 const reload=()=>axios.get(API+"/core/weekly/admin/queue",{headers:hdr()}).then(r=>setRows(r.data)).catch(()=>setNotice(t("Sfidat nuk u ngarkuan. Provo përsëri.","Could not load scheduled challenges. Please retry.")));
 useEffect(()=>{reload();},[]);
 const schedule=async e=>{e.preventDefault();try{await axios.post(API+"/core/weekly/admin/schedule",{week_date:week,problem_id:Number(problem),official_solution:solution},{headers:hdr()});setNotice(t("Java u programua me sukses.", "Week scheduled."));reload();}catch(e){setNotice(e.response?.data?.detail||t("Programimi dështoi.", "Scheduling failed."));}};
 const open=async id=>{const version=++requestVersion.current;setSelected(id);setSubmissions([]);setSubmissionsLoading(true);setNotice("");try{const r=await axios.get(API+"/core/weekly/admin/"+id+"/submissions",{headers:hdr()});if(version===requestVersion.current){setSubmissions(r.data);setGrades({});}}catch(e){if(version===requestVersion.current)setNotice(t("Nuk u lexuan zgjidhjet. Provo përsëri.", "Could not load submissions. Try again."));}finally{if(version===requestVersion.current)setSubmissionsLoading(false);}};
 const decide=async(submission,approve)=>{
  if(savingReview!==null)return;
  const score=Number(grades[submission.id]??submission.score);
  if(approve&&(!Number.isInteger(score)||score<1||score>10)){setNotice(t("Zgjidh një pikë nga 1 deri në 10.", "Choose a score from 1 to 10."));return;}
  const version=requestVersion.current;
  setSavingReview(submission.id);
  try{
   await axios.post(API+"/core/weekly/admin/submissions/"+submission.id+"/review",
    {approve,score:approve?score:null,note:submission.review_note||""},{headers:hdr()});
   if(version===requestVersion.current)await open(selected);
  }catch(e){setNotice(e.response?.data?.detail||t("Vendimi nuk u ruajt.", "Review could not be saved."));}
  finally{setSavingReview(null);}
 };
 const sq=useLanguage().lang==='sq';
 const t=(albanian,english)=>sq?albanian:english;
 const [publishing,setPublishing]=useState(false);
 const publish=async()=>{setPublishing(true);try{await axios.post(API+'/core/weekly/admin/'+selected+'/publish',{}, {headers:hdr()});await reload();setNotice(sq?'Rezultatet u publikuan.':'Results published.');}catch(e){setNotice(e.response?.data?.detail||(sq?'Publikimi dështoi.':'Publication failed.'));}finally{setPublishing(false);}};
 const canPublish=rows.find(row=>row.id===selected)?.status==='closed'&&!submissionsLoading&&!submissions.some(s=>s.status==='pending'||(s.status==='approved'&&s.score==null));
 const canReview=rows.find(row=>row.id===selected)?.status!=="published";
 return <main className="publishing-workspace"><PublishingHeader eyebrow={t("Garat / Sfida e javës","Competitions / Weekly challenge")} title={t("Problema e Javës", "Weekly challenge")} description={t("Programo sfidën, shqyrto zgjidhjet dhe publiko rezultatet pas vlerësimit.", "Schedule challenges, review submissions and publish results after grading.")} to="/weekly" linkLabel={t("Shiko sfidën publike", "View public challenge")}/><div className="publishing-columns">
 <section className="publishing-section"><h2>{t("Programo javën e ardhshme", "Schedule the next week")}</h2><p className="p1-muted">{t("Data duhet të jetë e hënë; sistemi hap dërgimet në 08:00 dhe i mbyll të dielën 20:00 sipas Europe/Tirane.", "Choose a Monday. Submissions open at 08:00 and close Sunday at 20:00, Europe/Tirane.")}</p>
 <form className="p1-form" onSubmit={schedule}><label>{t("E hëna", "Monday")}<input className="p1-input" required type="date" value={week} onChange={e=>setWeek(e.target.value)}/></label><label>{t("Kërko problemet", "Search problems")}<input className="p1-input" value={problemQuery} onChange={e=>{setProblemQuery(e.target.value);setProblem('')}} placeholder={t("Të paktën dy shkronja", "At least two characters")}/></label>
 {searchError&&<p role="alert">{searchError}</p>}<label>{t("Problemi", "Problem")}<select className="p1-select" required value={problem} onChange={e=>setProblem(e.target.value)}><option value="">{t("Zgjidh një problem", "Choose a problem")}</option>{problemOptions.map(p=><option key={p.id} value={p.id}>{p.title} · {p.subject} (#{p.id})</option>)}</select></label>
 <label>{t("Zgjidhja zyrtare (mbahet private deri në publikimin e rezultateve)", "Official solution (private until results are published)")}<textarea className="p1-input" required rows={6} value={solution} onChange={e=>setSolution(e.target.value)}/></label><button className="p1-btn" type="submit">{t("Programo publikimin", "Schedule challenge")}</button></form></section>
 <section className="publishing-section"><h2>{t("Javët dhe verifikimi i zgjidhjeve", "Weeks and submission review")}</h2><button className="p1-btn alt" onClick={reload}>{t("Ringarko listën", "Refresh queue")}</button><div className="publishing-queue">{rows.map(r=><button key={r.id} aria-pressed={selected===r.id} onClick={()=>open(r.id)}><span><strong>{r.week_date}</strong><small>{statusLabel(r.status,sq)} · {t("Problemi","Problem")} #{r.problem_id}</small></span><span>{t("Shiko zgjidhjet →", "View submissions →")}</span></button>)}</div></section>
 </div>{selected&&<section className="publishing-section publishing-history"><h2>{t("Zgjidhjet", "Submissions")} · #{selected}</h2>{submissionsLoading?<p role="status">{t("Duke ngarkuar…", "Loading…")}</p>:<button className="p1-btn alt" onClick={()=>open(selected)}>{t("Ringarko zgjidhjet", "Reload submissions")}</button>}{rows.find(row=>row.id===selected)?.status==='closed'&&<div><p>{sq?'Vlerëso të gjitha zgjidhjet përpara publikimit.':'Review all submissions before publishing results.'}</p><button className="p1-btn" disabled={!canPublish||publishing||savingReview!==null} onClick={publish}>{sq?'Publiko rezultatet':'Publish results'}</button></div>}{submissions.map(s=><article key={s.id} style={{padding:"12px 0",borderBottom:"1px solid #ddd"}}><div className="p1-row"><strong>{t("ID e nxënësit","Student ID")}: {s.student_id} · {statusLabel(s.status,sq)}</strong>{s.score!=null&&<span>{s.score}/10</span>}{canReview&&<div className="p1-row">
 <label htmlFor={"score-"+s.id}>{t("Pikët", "Score")}</label><select id={"score-"+s.id} className="p1-select" disabled={savingReview!==null} value={grades[s.id]??s.score??""} onChange={e=>setGrades({...grades,[s.id]:e.target.value})}>
 <option value="">{t("Zgjidh", "Choose")}</option>{Array.from({length:10},(_,index)=><option key={index+1}>{index+1}</option>)}</select>
 <button className="p1-btn" disabled={savingReview!==null} onClick={()=>decide(s,true)}>{s.status==="approved"?t("Ruaj pikët", "Save score"):t("Aprovo", "Approve")}</button>
 <button className="p1-btn alt" disabled={savingReview!==null} onClick={()=>decide(s,false)}>{t("Refuzo", "Reject")}</button></div>}</div><div className="publishing-submission"><MathRenderer text={s.answer}/></div>
 </article>)}</section>}
 {notice&&<p className="p1-note" role="status">{notice}</p>}</main>;
}
