import {PublishingHeader} from "./components/PublishingWorkspace";
import {Link} from "react-router-dom";
import React,{useEffect,useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export function AdminTutoring(){
 const [tutoring,setTutoring]=useState([]),[feedback,setFeedback]=useState("");
 const [status,setStatus]=useState(""),[loading,setLoading]=useState(true);
 const reload=()=>{setLoading(true);setFeedback("");return axios.get(API+"/access/admin/tutoring",{headers:headers()}).then(r=>setTutoring(r.data)).catch(()=>setFeedback("Nuk u lexuan kërkesat.")).finally(()=>setLoading(false));};
 useEffect(()=>{reload();},[]);
 const decide=async(id,approve)=>{const note=window.prompt("Shënim për vendimin (opsional):","");if(note===null)return;
 try{await axios.post(API+"/access/admin/tutoring/"+id+"/review",{approve,note},{headers:headers()});setFeedback("Vendimi u ruajt.");reload();}catch(e){setFeedback(e.response?.data?.detail||"Operacioni dështoi.");}};
 return <main className="publishing-workspace"><PublishingHeader eyebrow="Learning / Tutoring" title="Kërkesat 1-to-1" description="Shqyrto kërkesat për mentorim dhe regjistro vendimin me një shënim opsional." to="/tutoring" linkLabel="Shiko mentorimin"/>
 <div className="publishing-settings-columns"><aside className="publishing-section"><h2>Filtrat</h2><label>Statusi<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Të gjitha</option><option value="pending">Në pritje</option><option value="approved">Miratuar</option><option value="rejected">Refuzuar</option></select></label><button className="p1-btn alt" onClick={reload}>Ringarko</button></aside>
 <section className="publishing-section publishing-history" aria-label="Tutoring requests">{loading?<p role="status">Duke ngarkuar…</p>:tutoring.filter(t=>!status||t.status===status).map(t=><article key={t.id}><div className="publishing-actions"><h3>{t.subject}</h3><span>{t.status}</span></div><p>Student #{t.student_id} · Teacher #{t.teacher_id}</p><p className="publishing-submission">{t.message}</p>{t.status==="pending"&&<div className="publishing-actions"><button className="p1-btn" onClick={()=>decide(t.id,true)}>Approve</button><button className="p1-btn alt" onClick={()=>decide(t.id,false)}>Reject</button></div>}</article>)}{!loading&&!feedback&&!tutoring.filter(t=>!status||t.status===status).length&&<p>Nuk ka kërkesa për këtë filtër.</p>}</section></div>
 {feedback&&<p className="publishing-notice" role="status">{typeof feedback==='string'?feedback:'Operacioni dështoi.'}</p>}</main>;
}

export function AdminFinance(){
 const year=new Date().getFullYear();
 const [selectedYear,setYear]=useState(year),[data,setData]=useState({expenses:[],total_all:0}),[form,setForm]=useState({year,month:new Date().getMonth()+1,category:"Platforma",description:"",amount_all:0}),[notice,setNotice]=useState("");
 const reload=()=>axios.get(API+"/access/admin/expenses?year="+selectedYear,{headers:headers()}).then(r=>setData(r.data)).catch(()=>setNotice("Nuk u lexuan shpenzimet."));
 useEffect(()=>{reload();},[selectedYear]);
 const submit=async e=>{e.preventDefault();try{await axios.post(API+"/access/admin/expenses",form,{headers:headers()});setNotice("Shpenzimi u ruajt.");reload();}catch(e){setNotice("Ruajtja dështoi.");}};
 return <section className="publishing-section"><div className="p1-row"><div><h2>Shpenzimet Mujore</h2><p className="p1-muted">Raporti i vitit të kaluar dërgohet automatikisht te Super Adminët në janar.</p></div>
 <label>Viti <input className="p1-input" type="number" min="2020" max="2100" value={selectedYear} onChange={e=>setYear(Number(e.target.value))}/></label></div>
 <h3>Totali {selectedYear}: {data.total_all.toLocaleString("sq-AL")} ALL</h3>
 <div className="publishing-columns"><div className="publishing-table"><table className="p1-table"><thead><tr><th>Muaji</th><th>Kategoria</th><th>Përshkrimi</th><th>ALL</th></tr></thead><tbody>{data.expenses.map(e=><tr key={e.id}><td>{e.month}</td><td>{e.category}</td><td>{e.description}</td><td>{e.amount_all.toLocaleString("sq-AL")}</td></tr>)}</tbody></table></div>
 <form className="publishing-form" onSubmit={submit}><h3>Shto shpenzim</h3>
 <div className="p1-grid two"><label>Muaji<input className="p1-input" type="number" min="1" max="12" value={form.month} onChange={e=>setForm({...form,month:Number(e.target.value)})}/></label>
 <label>Viti<input className="p1-input" type="number" min="2020" max="2100" value={form.year} onChange={e=>setForm({...form,year:Number(e.target.value)})}/></label></div>
 <label>Kategoria<input className="p1-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/></label>
 <label>Përshkrimi<input className="p1-input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
 <label>Shuma (ALL)<input className="p1-input" type="number" min="0" value={form.amount_all} onChange={e=>setForm({...form,amount_all:Number(e.target.value)})} required/></label>
 <button className="p1-btn" type="submit">Ruaj shpenzimin</button></form></div>
 {notice&&<p role="status" className="p1-note">{notice}</p>}
 </section>;
}
