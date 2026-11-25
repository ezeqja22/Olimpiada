import {useLanguage} from "./context/LanguageContext";
import {adminStatusLabel} from "./adminNavigation";
import {PublishingHeader} from "./components/PublishingWorkspace";
import {Link} from "react-router-dom";
import React,{useEffect,useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export function AdminTutoring(){
 const {lang}=useLanguage();
 const tr=(en,sq)=>lang==='sq'?sq:en;

 const [tutoring,setTutoring]=useState([]),[feedback,setFeedback]=useState("");
 const [status,setStatus]=useState(""),[loading,setLoading]=useState(true);
 const reload=()=>{setLoading(true);setFeedback("");return axios.get(API+"/access/admin/tutoring",{headers:headers()}).then(r=>setTutoring(r.data)).catch(()=>setFeedback(tr("Could not load requests.","Nuk u lexuan kërkesat."))).finally(()=>setLoading(false));};
 useEffect(()=>{reload();},[]);
 const decide=async(id,approve)=>{const note=window.prompt(tr("Decision note (optional):","Shënim për vendimin (opsional):"),"");if(note===null)return;
 try{await axios.post(API+"/access/admin/tutoring/"+id+"/review",{approve,note},{headers:headers()});setFeedback(tr("Decision saved.","Vendimi u ruajt."));reload();}catch(e){setFeedback(e.response?.data?.detail||tr("Operation failed.","Operacioni dështoi."));}};
 return <main className="publishing-workspace"><PublishingHeader eyebrow={tr("Learning / Tutoring","Mësuesit / Mentorimi")} title={tr("1-to-1 tutoring requests","Kërkesat 1-to-1")} description={tr("Review tutoring requests and record your decision with an optional note.","Shqyrto kërkesat për mentorim dhe regjistro vendimin me një shënim opsional.")} to="/tutoring" linkLabel={tr("View tutoring","Shiko mentorimin")}/>
 <div className="publishing-settings-columns"><aside className="publishing-section"><h2>{tr("Filters","Filtrat")}</h2><label>{tr("Status","Statusi")}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{tr("All","Të gjitha")}</option><option value="pending">{tr("Pending","Në pritje")}</option><option value="approved">{tr("Approved","Miratuar")}</option><option value="rejected">{tr("Rejected","Refuzuar")}</option></select></label><button className="p1-btn alt" onClick={reload}>{tr("Reload","Ringarko")}</button></aside>
 <section className="publishing-section publishing-history" aria-label={tr("Tutoring requests","Kërkesat për mentorim")}>{loading?<p role="status">{tr("Loading…","Duke ngarkuar…")}</p>:tutoring.filter(t=>!status||t.status===status).map(t=><article key={t.id}><div className="publishing-actions"><h3>{t.subject}</h3><span>{adminStatusLabel(t.status,lang)}</span></div><p>{tr("Student","Nxënësi")} #{t.student_id} · {tr("Teacher","Mësuesi")} #{t.teacher_id}</p><p className="publishing-submission">{t.message}</p>{t.status==="pending"&&<div className="publishing-actions"><button className="p1-btn" onClick={()=>decide(t.id,true)}>{tr("Approve","Mirato")}</button><button className="p1-btn alt" onClick={()=>decide(t.id,false)}>{tr("Reject","Refuzo")}</button></div>}</article>)}{!loading&&!feedback&&!tutoring.filter(t=>!status||t.status===status).length&&<p>{tr("No requests match this filter.","Nuk ka kërkesa për këtë filtër.")}</p>}</section></div>
 {feedback&&<p className="publishing-notice" role="status">{typeof feedback==='string'?feedback:tr("Operation failed.","Operacioni dështoi.")}</p>}</main>;
}

export function AdminFinance(){
 const {lang}=useLanguage();
 const tr=(en,sq)=>lang==='sq'?sq:en;

 const year=new Date().getFullYear();
 const [selectedYear,setYear]=useState(year),[data,setData]=useState({expenses:[],total_all:0}),[form,setForm]=useState({year,month:new Date().getMonth()+1,category:"Platforma",description:"",amount_all:0}),[notice,setNotice]=useState("");
 const reload=()=>axios.get(API+"/access/admin/expenses?year="+selectedYear,{headers:headers()}).then(r=>setData(r.data)).catch(()=>setNotice(tr("Could not load expenses.","Nuk u lexuan shpenzimet.")));
 useEffect(()=>{reload();},[selectedYear]);
 const submit=async e=>{e.preventDefault();try{await axios.post(API+"/access/admin/expenses",form,{headers:headers()});setNotice(tr("Expense saved.","Shpenzimi u ruajt."));reload();}catch(e){setNotice(tr("Save failed.","Ruajtja dështoi."));}};
 return <section className="publishing-section"><div className="p1-row"><div><h2>{tr("Monthly expenses","Shpenzimet Mujore")}</h2><p className="p1-muted">{tr("The previous year's report is automatically sent to super administrators in January.","Raporti i vitit të kaluar dërgohet automatikisht te Super Adminët në janar.")}</p></div>
 <label>{tr("Year","Viti")} <input className="p1-input" type="number" min="2020" max="2100" value={selectedYear} onChange={e=>setYear(Number(e.target.value))}/></label></div>
 <h3>{tr("Total","Totali")} {selectedYear}: {data.total_all.toLocaleString("sq-AL")} ALL</h3>
 <div className="publishing-columns"><div className="publishing-table"><table className="p1-table"><thead><tr><th>{tr("Month","Muaji")}</th><th>{tr("Category","Kategoria")}</th><th>{tr("Description","Përshkrimi")}</th><th>ALL</th></tr></thead><tbody>{data.expenses.map(e=><tr key={e.id}><td>{e.month}</td><td>{e.category}</td><td>{e.description}</td><td>{e.amount_all.toLocaleString("sq-AL")}</td></tr>)}</tbody></table></div>
 <form className="publishing-form" onSubmit={submit}><h3>{tr("Add an expense","Shto shpenzim")}</h3>
 <div className="p1-grid two"><label>{tr("Month","Muaji")}<input className="p1-input" type="number" min="1" max="12" value={form.month} onChange={e=>setForm({...form,month:Number(e.target.value)})}/></label>
 <label>{tr("Year","Viti")}<input className="p1-input" type="number" min="2020" max="2100" value={form.year} onChange={e=>setForm({...form,year:Number(e.target.value)})}/></label></div>
 <label>{tr("Category","Kategoria")}<input className="p1-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/></label>
 <label>{tr("Description","Përshkrimi")}<input className="p1-input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
 <label>{tr("Amount (ALL)","Shuma (ALL)")}<input className="p1-input" type="number" min="0" value={form.amount_all} onChange={e=>setForm({...form,amount_all:Number(e.target.value)})} required/></label>
 <button className="p1-btn" type="submit">{tr("Save expense","Ruaj shpenzimin")}</button></form></div>
 {notice&&<p role="status" className="p1-note">{notice}</p>}
 </section>;
}
