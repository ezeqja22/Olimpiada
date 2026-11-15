import {PublishingHeader,PublishingSection} from "./components/PublishingWorkspace";
import AdminUserSelect from "./components/AdminUserSelect";
import {Link} from "react-router-dom";
import React,{useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export default function AdminContent(){
 const [teacher,setTeacher]=useState({teacher_id:"",subject:"Mathematics"});
 const [resource,setResource]=useState({kind:"material",title:"",subject:"Mathematics",body:"",scheduled_at:""});
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const call=async(path,payload)=>{
   if(busy)return;setBusy(true);setMessage("");
   try{
     const r=await axios.post(API+path,payload,{headers:headers()});
     setMessage("U ruajt me sukses.");
     return r.data;
   }catch(e){setMessage(e.response?.data?.detail||"Operacioni dështoi.");return null;}finally{setBusy(false);}
 };
 return <main className="publishing-workspace"><PublishingHeader eyebrow="Learning / Resources" title="Administrimi i përmbajtjes" description="Publiko burime mësimore dhe cakto lëndët e mësuesve. Sfidat javore dhe testet kanë mjetet e tyre të publikimit." to="/learning-resources" linkLabel="Shiko burimet"/>
 {message&&<p className="p1-note" role="status">{typeof message==="string"?message:JSON.stringify(message)}</p>}
 <div className="publishing-columns">
  <section className="publishing-section"><h2>Problema e Javës (publike)</h2>
<p>Programo sfidën dhe shqyrto zgjidhjet në një vend.</p><Link className="p1-btn" to="/admin/weekly">Programo sfidën javore</Link>
  </section>
  <section className="publishing-section"><h2>Lëndët e profesorëve</h2>
   <p className="p1-muted">Zgjidh profesorin dhe lëndën që zhvillon.</p>
   <form className="p1-form" onSubmit={e=>{e.preventDefault();call("/access/admin/teacher-subjects",{teacher_id:Number(teacher.teacher_id),subject:teacher.subject});}}>
    <AdminUserSelect label="Teacher" role="teacher" value={teacher.teacher_id} onChange={teacher_id=>setTeacher({...teacher,teacher_id})}/>
    <label>Lënda<input className="p1-input" required value={teacher.subject} onChange={e=>setTeacher({...teacher,subject:e.target.value})}/></label>
    <button className="p1-btn" type="submit" disabled={busy}>Cakto lëndën</button>
   </form>
  </section>
 </div>
 <section className="publishing-section"><h2>Materiale dhe takime</h2><p><Link to="/learning-resources">Shiko materialet e publikuara</Link> · <Link to="/admin/courses">Krijo detyra dhe teste me kohë</Link></p>
   <p className="p1-muted">Përdoruesit e regjistruar shohin tekstin dhe lidhjet e kësaj përmbajtjeje.</p>
   <form className="p1-form" onSubmit={e=>{e.preventDefault();call("/access/admin/resources",{...resource,scheduled_at:resource.scheduled_at||null});}}>
    <label>Lloji<select className="p1-select" value={resource.kind} onChange={e=>setResource({...resource,kind:e.target.value})}><option value="material">Material</option><option value="test">Ushtrim (pa kohëmatës)</option><option value="meet">Google Meet</option></select></label>
    <label>Titulli<input className="p1-input" value={resource.title} required onChange={e=>setResource({...resource,title:e.target.value})}/></label>
    <label>Lënda<input className="p1-input" value={resource.subject} onChange={e=>setResource({...resource,subject:e.target.value})}/></label>
    <label>Data/orari (opsional)<input className="p1-input" type="datetime-local" value={resource.scheduled_at} onChange={e=>setResource({...resource,scheduled_at:e.target.value})}/></label>
    <label>Teksti, materiali ose lidhja Google Meet<textarea rows="6" className="p1-input" value={resource.body} onChange={e=>setResource({...resource,body:e.target.value})}/></label>
    <button className="p1-btn" type="submit" disabled={busy}>Publiko</button>
   </form>
 </section></main>;
}
