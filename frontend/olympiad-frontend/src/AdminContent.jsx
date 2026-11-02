import React,{useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export default function AdminContent(){
 const [weekly,setWeekly]=useState("");
 const [teacher,setTeacher]=useState({teacher_id:"",subject:"Mathematics"});
 const [resource,setResource]=useState({kind:"material",title:"",subject:"Mathematics",body:"",scheduled_at:""});
 const [message,setMessage]=useState("");
 const call=async(path,payload)=>{
   setMessage("");
   try{
     const r=await axios.post(API+path,payload,{headers:headers()});
     setMessage("U ruajt me sukses.");
     return r.data;
   }catch(e){setMessage(e.response?.data?.detail||"Operacioni dështoi.");return null;}
 };
 return <main className="admin-page p1-wrap" style={{maxWidth:"none",margin:"0 auto"}}>
 <h1>Administrimi i përmbajtjes</h1><p className="p1-muted">Publiko Problemën e Javës, materialet, testet, lidhjet Google Meet dhe cakto lëndët e profesorëve.</p>
 {message&&<p className="p1-note" role="status">{typeof message==="string"?message:JSON.stringify(message)}</p>}
 <div className="p1-grid two">
  <section className="p1-card"><h2>Problema e Javës (publike)</h2>
   <p className="p1-muted">Përdor ID-në e një problemi ekzistues. Teksti i këtij problemi bëhet publik pa abonim.</p>
   <form className="p1-form" onSubmit={e=>{e.preventDefault();call("/access/admin/problem-of-week",{problem_id:Number(weekly)});}}>
    <label>ID e problemit<input className="p1-input" type="number" min="1" required value={weekly} onChange={e=>setWeekly(e.target.value)}/></label>
    <button className="p1-btn" type="submit">Publiko Problemën e Javës</button>
   </form>
  </section>
  <section className="p1-card"><h2>Lëndët e profesorëve</h2>
   <p className="p1-muted">Vendos ID-në e një përdoruesi me rolin Teacher dhe lëndën që zhvillon.</p>
   <form className="p1-form" onSubmit={e=>{e.preventDefault();call("/access/admin/teacher-subjects",{teacher_id:Number(teacher.teacher_id),subject:teacher.subject});}}>
    <label>Teacher ID<input className="p1-input" type="number" min="1" required value={teacher.teacher_id} onChange={e=>setTeacher({...teacher,teacher_id:e.target.value})}/></label>
    <label>Lënda<input className="p1-input" required value={teacher.subject} onChange={e=>setTeacher({...teacher,subject:e.target.value})}/></label>
    <button className="p1-btn" type="submit">Cakto lëndën</button>
   </form>
  </section>
 </div>
 <section className="p1-card p1-group"><h2>Materiale, teste dhe Google Meet</h2>
   <p className="p1-muted">Vetëm abonentët Medium/Premium shohin tekstin dhe lidhjet e kësaj përmbajtjeje.</p>
   <form className="p1-form" onSubmit={e=>{e.preventDefault();call("/access/admin/resources",{...resource,scheduled_at:resource.scheduled_at||null});}}>
    <label>Lloji<select className="p1-select" value={resource.kind} onChange={e=>setResource({...resource,kind:e.target.value})}><option value="material">Material</option><option value="test">Test</option><option value="meet">Google Meet</option></select></label>
    <label>Titulli<input className="p1-input" value={resource.title} required onChange={e=>setResource({...resource,title:e.target.value})}/></label>
    <label>Lënda<input className="p1-input" value={resource.subject} onChange={e=>setResource({...resource,subject:e.target.value})}/></label>
    <label>Data/orari (opsional)<input className="p1-input" type="datetime-local" value={resource.scheduled_at} onChange={e=>setResource({...resource,scheduled_at:e.target.value})}/></label>
    <label>Teksti, materiali ose lidhja Google Meet<textarea rows="6" className="p1-input" value={resource.body} onChange={e=>setResource({...resource,body:e.target.value})}/></label>
    <button className="p1-btn" type="submit">Publiko për abonentët</button>
   </form>
 </section></main>;
}
