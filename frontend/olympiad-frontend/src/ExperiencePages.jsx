import React,{useEffect,useState,useRef} from "react";
import axios from "axios";
import {loginIntent} from "./navigation";
import {Link} from "react-router-dom";
import {useAuth} from "./context/AuthContext";
import {useLanguage} from "./context/LanguageContext";
import "./phase1.css";
import "./phase3.css";
import RichInlineText from "./components/RichInlineText";
import SitePageIntro from "./components/SitePageIntro";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
function PageTitle({contentKey,kicker,title,subtitle}){return contentKey?<SitePageIntro contentKey={contentKey} kicker={kicker} title={title} subtitle={subtitle}/>:<header className="p3-page-heading"><span className="p3-eyebrow">{kicker}</span><h1>{title}</h1><p>{subtitle}</p></header>}
export function TeacherApplicationPage(){
 const {currentUser}=useAuth(),{lang}=useLanguage();
 const [form,setForm]=useState({first_name:"",last_name:"",birth_date:"",subject:"Mathematics",bio:""});
 const [state,setState]=useState(null),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [statusLoading,setStatusLoading]=useState(true),[statusError,setStatusError]=useState(false),[statusRetry,setStatusRetry]=useState(0);
 useEffect(()=>{let live=true;if(!currentUser){setStatusLoading(false);return;}setStatusLoading(true);setStatusError(false);axios.get(API+"/experience/teacher/me",{headers:headers()}).then(r=>{if(live)setState(r.data)}).catch(()=>{if(live)setStatusError(true)}).finally(()=>{if(live)setStatusLoading(false)});return()=>{live=false}},[currentUser,statusRetry]);
 const submit=async e=>{e.preventDefault();setBusy(true);setNotice(""); try{const r=await axios.post(API+"/experience/teacher/apply",form,{headers:headers()});setState(r.data);setNotice(lang==="sq"?"Aplikimi u dërgua për verifikim.":"Your application awaits approval.");}
 catch(e){setNotice(typeof e.response?.data?.detail==="string"?e.response.data.detail:"Dërgimi dështoi.");}
 finally{setBusy(false);}};
 return <main className="p1-wrap p3-body"><PageTitle contentKey="page_teacher_application" kicker={lang==="sq"?"Bashkohu me ekipin":"Join the team"} title={lang==="sq"?"Apliko si mësues":"Apply as a teacher"}
 subtitle={lang==="sq"?"Aplikimet shqyrtohen nga administratori. Deri në miratim, nuk ke akses mësuesi.":"Applications are manually reviewed before teacher access is granted."}/>
 {!currentUser?<div className="p1-card"><Link to="/signup">Regjistrohu</Link> ose <Link to="/login" state={loginIntent("/teacher/apply")}>hyr në llogari</Link> për të aplikuar.</div>:
 statusLoading?<p role="status">{lang==='sq'?'Duke ngarkuar aplikimin…':'Loading application…'}</p>:statusError?<div role="alert"><p>{lang==='sq'?'Statusi i aplikimit nuk u ngarkua.':'Could not load your application status.'}</p><button className="p1-btn" onClick={()=>setStatusRetry(n=>n+1)}>{lang==='sq'?'Provo përsëri':'Retry'}</button></div>:
 state&&state.status!=="not_applied"?<div className="p1-card"><h2>Statusi: {state.status}</h2><p className="p1-muted">{state.review_note||"Aplikimi yt është regjistruar."}</p></div>:
 <form className="p3-form p1-card" onSubmit={submit}>
 <div className="p1-grid two"><label>Emri<input className="p1-input" required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label>
 <label>Mbiemri<input className="p1-input" required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label></div>
 <label>Datëlindja<input className="p1-input" type="date" max={new Date().toISOString().slice(0,10)} required value={form.birth_date} onChange={e=>setForm({...form,birth_date:e.target.value})}/></label>
 <label>Email i verifikuar<input className="p1-input" value={currentUser.email||""} disabled/></label>
 <label>Lënda<input className="p1-input" required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>
 <label>Eksperienca dhe bio<textarea className="p1-input" minLength={25} rows={6} required value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label>
 <button className="p1-btn" disabled={busy}>{busy?"Duke dërguar...":"Dërgo aplikimin"}</button></form>}
 {notice&&<p role="status" className="p1-note">{notice}</p>}</main>;
}
export function FAQPage(){
 const {lang}=useLanguage();const [items,setItems]=useState([]),[open,setOpen]=useState(null);
 useEffect(()=>{axios.get(API+"/experience/faq").then(r=>setItems(r.data)).catch(()=>{});},[]);
 return <main className="p1-wrap p3-body"><PageTitle contentKey="page_faq" kicker="FAQ" title={lang==="sq"?"Pyetje të shpeshta":"Frequently asked questions"}
 subtitle={lang==="sq"?"Gjithçka që duhet të dish për të përdorur platformën.":"Everything you need to know about the platform."}/>
 <div className="p3-faq-list">{items.map(item=><section className="p3-faq-entry" key={item.id}>
  <button type="button" aria-expanded={open===item.id} onClick={()=>setOpen(open===item.id?null:item.id)}>
   <span>{lang==="sq"?item.question_sq:item.question_en}</span><span>{open===item.id?"−":"+"}</span>
  </button>{open===item.id&&<p className="p3-rich-inline"><RichInlineText text={lang==="sq"?item.answer_sq:item.answer_en}/></p>}</section>)}</div>
 <div className="p3-help-footer"><strong>{lang==="sq"?"Ke ende pyetje?":"Still have questions?"}</strong><Link to="/support" className="p1-btn">{lang==="sq"?"Na shkruaj":"Get in touch"}</Link></div></main>;
}
export function SupportPage(){
 const {lang}=useLanguage(),{currentUser}=useAuth();
 const [form,setForm]=useState({name:currentUser?.username||"",email:currentUser?.email||"",category:"technical",subject:"",message:""}),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const submit=async e=>{e.preventDefault();setBusy(true);setNotice("");
  try{const r=await axios.post(API+"/experience/support/tickets",form);
    setNotice(lang==="sq"?"Kërkesa #"+r.data.ticket_id+" u regjistrua.":"Ticket #"+r.data.ticket_id+" received.");
    setForm({...form,subject:"",message:""});}
  catch(e){setNotice(e.response?.data?.detail||"Dërgimi dështoi.");}finally{setBusy(false);}};
 return <main className="p1-wrap p3-body"><PageTitle contentKey="page_support" kicker="Support" title={lang==="sq"?"Jemi këtu për të ndihmuar":"How can we help?"}
 subtitle={lang==="sq"?"Na shkruaj për probleme teknike ose materialet.":"Contact us about technical issues or learning resources."}/>
 <div className="p1-grid two"><form className="p1-card p3-form" onSubmit={submit}>
 <label>{lang==="sq"?"Emri":"Name"}<input className="p1-input" minLength={2} required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
 <label>Email<input className="p1-input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
 <label>Kategoria / Category<select className="p1-select" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="technical">Technical</option><option value="payment">Payments</option><option value="content">Materials</option><option value="other">Other</option></select></label>
 <label>Subjekti / Subject<input className="p1-input" required minLength={4} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>
 <label>Mesazhi / Message<textarea className="p1-input" rows={7} required minLength={12} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label>
 <button className="p1-btn" disabled={busy}>{busy?"Duke dërguar...":lang==="sq"?"Dërgo kërkesën":"Send request"}</button>
 {notice&&<p className="p1-note" role="status">{notice}</p>}
 </form><aside className="p3-side-help"><h2>{lang==="sq"?"Përgjigje të shpejta":"Quick answers"}</h2>
 <p>{lang==="sq"?"Shumica e pyetjeve për forumet dhe testet janë shpjeguar te FAQ.":"Common questions about forums and tests are answered in our FAQ."}</p>
 <Link className="p1-btn alt" to="/faq">FAQ →</Link></aside></div></main>;
}
export {default as TeacherWorkspace} from "./TeacherWorkspace";
