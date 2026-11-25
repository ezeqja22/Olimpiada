import {useLanguage} from "./context/LanguageContext";
import {PublishingHeader} from "./components/PublishingWorkspace";
import {Link} from "react-router-dom";
import React,{useEffect,useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export function AdminTutoring(){
 const {lang}=useLanguage();
 const tr=(sq,en)=>lang==="en"?en:sq;
 const [tutoring,setTutoring]=useState([]),[feedback,setFeedback]=useState("");
 const [status,setStatus]=useState(""),[loading,setLoading]=useState(true);
 const reload=()=>{setLoading(true);setFeedback("");return axios.get(API+"/access/admin/tutoring",{headers:headers()}).then(r=>setTutoring(r.data)).catch(()=>setFeedback(tr("Nuk u lexuan kërkesat.","Requests could not load."))).finally(()=>setLoading(false));};
 useEffect(()=>{reload();},[]);
 const decide=async(id,approve)=>{const note=window.prompt(tr("Shënim për vendimin (opsional):","Decision note (optional):"),"");if(note===null)return;
 try{await axios.post(API+"/access/admin/tutoring/"+id+"/review",{approve,note},{headers:headers()});setFeedback(tr("Vendimi u ruajt.","Decision saved."));reload();}catch(e){setFeedback(e.response?.data?.detail||tr("Operacioni dështoi.","Operation failed."));}};
 return <main className="publishing-workspace"><PublishingHeader eyebrow={tr("Të nxënit / Mentorimi","Learning / Tutoring")} title={tr("Kërkesat 1-to-1","1-to-1 requests")} description={tr("Shqyrto kërkesat për mentorim dhe regjistro vendimin me një shënim opsional.","Review tutoring requests and record decisions with an optional note.")} to="/tutoring" linkLabel={tr("Shiko mentorimin","View tutoring")}/>
 <div className="publishing-settings-columns"><aside className="publishing-section"><h2>{tr("Filtrat","Filters")}</h2><label>{tr("Statusi","Status")}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{tr("Të gjitha","All")}</option><option value="pending">{tr("Në pritje","Pending")}</option><option value="approved">{tr("Miratuar","Approved")}</option><option value="rejected">{tr("Refuzuar","Rejected")}</option></select></label><button className="p1-btn alt" onClick={reload}>{tr("Ringarko","Reload")}</button></aside>
 <section className="publishing-section publishing-history" aria-label={tr("Kërkesat për mentorim","Tutoring requests")}>{loading?<p role="status">{tr("Duke ngarkuar…","Loading…")}</p>:tutoring.filter(t=>!status||t.status===status).map(t=><article key={t.id}><div className="publishing-actions"><h3>{t.subject}</h3><span>{({pending:tr("Në pritje","Pending"),approved:tr("Miratuar","Approved"),rejected:tr("Refuzuar","Rejected")})[t.status]||t.status}</span></div><p>{tr("Nxënësi","Student")} #{t.student_id} · {tr("Mësuesi","Teacher")} #{t.teacher_id}</p><p className="publishing-submission">{t.message}</p>{t.status==="pending"&&<div className="publishing-actions"><button className="p1-btn" onClick={()=>decide(t.id,true)}>{tr("Mirato","Approve")}</button><button className="p1-btn alt" onClick={()=>decide(t.id,false)}>{tr("Refuzo","Reject")}</button></div>}</article>)}{!loading&&!feedback&&!tutoring.filter(t=>!status||t.status===status).length&&<p>{tr("Nuk ka kërkesa për këtë filtër.","No requests match this filter.")}</p>}</section></div>
 {feedback&&<p className="publishing-notice" role="status">{typeof feedback==='string'?feedback:tr("Operacioni dështoi.","Operation failed.")}</p>}</main>;
}

export function AdminFinance(){
 const {lang}=useLanguage();
 const tr=(sq,en)=>lang==="en"?en:sq;
 const year=new Date().getFullYear();
 const [selectedYear,setYear]=useState(year),[data,setData]=useState({expenses:[],total_all:0}),[form,setForm]=useState({year,month:new Date().getMonth()+1,category:"Platforma",description:"",amount_all:0}),[notice,setNotice]=useState("");
 const reload=()=>axios.get(API+"/access/admin/expenses?year="+selectedYear,{headers:headers()}).then(r=>setData(r.data)).catch(()=>setNotice(tr("Nuk u lexuan shpenzimet.","Expenses could not load.")));
 useEffect(()=>{reload();},[selectedYear]);
 const submit=async e=>{e.preventDefault();try{await axios.post(API+"/access/admin/expenses",form,{headers:headers()});setNotice(tr("Shpenzimi u ruajt.","Expense saved."));reload();}catch(e){setNotice(tr("Ruajtja dështoi.","Could not save."));}};
 return <section className="publishing-section"><div className="p1-row"><div><h2>{tr("Shpenzimet Mujore","Monthly expenses")}</h2><p className="p1-muted">{tr("Raporti i vitit të kaluar dërgohet automatikisht te Super Adminët në janar.","The previous year's report is sent automatically to super administrators in January.")}</p></div>
 <label>{tr("Viti","Year")}<input className="p1-input" type="number" min="2020" max="2100" value={selectedYear} onChange={e=>setYear(Number(e.target.value))}/></label></div>
 <h3>{tr("Totali","Total")} {selectedYear}: {data.total_all.toLocaleString(lang==="en"?"en-GB":"sq-AL")} ALL</h3>
 <div className="publishing-columns"><div className="publishing-table"><table className="p1-table"><thead><tr><th>{tr("Muaji","Month")}</th><th>{tr("Kategoria","Category")}</th><th>{tr("Përshkrimi","Description")}</th><th>ALL</th></tr></thead><tbody>{data.expenses.map(e=><tr key={e.id}><td>{e.month}</td><td>{e.category}</td><td>{e.description}</td><td>{e.amount_all.toLocaleString(lang==="en"?"en-GB":"sq-AL")}</td></tr>)}</tbody></table></div>
 <form className="publishing-form" onSubmit={submit}><h3>{tr("Shto shpenzim","Add expense")}</h3>
 <div className="p1-grid two"><label>{tr("Muaji","Month")}<input className="p1-input" type="number" min="1" max="12" value={form.month} onChange={e=>setForm({...form,month:Number(e.target.value)})}/></label>
 <label>{tr("Viti","Year")}<input className="p1-input" type="number" min="2020" max="2100" value={form.year} onChange={e=>setForm({...form,year:Number(e.target.value)})}/></label></div>
 <label>{tr("Kategoria","Category")}<input className="p1-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/></label>
 <label>{tr("Përshkrimi","Description")}<input className="p1-input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
 <label>{tr("Shuma (ALL)","Amount (ALL)")}<input className="p1-input" type="number" min="0" value={form.amount_all} onChange={e=>setForm({...form,amount_all:Number(e.target.value)})} required/></label>
 <button className="p1-btn" type="submit">{tr("Ruaj shpenzimin","Save expense")}</button></form></div>
 {notice&&<p role="status" className="p1-note">{notice}</p>}
 </section>;
}
