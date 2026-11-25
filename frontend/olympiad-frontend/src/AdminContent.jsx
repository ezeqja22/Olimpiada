import {useLanguage} from "./context/LanguageContext";
import {PublishingHeader} from "./components/PublishingWorkspace";
import AdminUserSelect from "./components/AdminUserSelect";
import {Link} from "react-router-dom";
import React,{useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export default function AdminContent(){
 const {lang} = useLanguage();
 const t = (sq,en) => lang === "en" ? en : sq;
 const [teacher,setTeacher]=useState({teacher_id:"",subject:"Mathematics"});
 const [resource,setResource]=useState({kind:"material",title:"",subject:"Mathematics",body:"",scheduled_at:""});
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const call=async(path,payload)=>{
   if(busy)return;setBusy(true);setMessage("");
   try{
     const r=await axios.post(API+path,payload,{headers:headers()});
     setMessage(t("U ruajt me sukses.", "Saved successfully."));
     return r.data;
   }catch(e){setMessage(e.response?.data?.detail||t("Operacioni dështoi.", "Operation failed."));return null;}finally{setBusy(false);}
 };
 return <main className="publishing-workspace"><PublishingHeader eyebrow={t("Të nxënit / Burimet", "Learning / Resources")} title={t("Administrimi i përmbajtjes", "Content management")} description={t("Publiko burime mësimore dhe cakto lëndët e mësuesve. Sfidat javore dhe testet kanë mjetet e tyre të publikimit.", "Publish learning resources and assign teachers' subjects. Weekly challenges and tests have dedicated publishing tools.")} to="/learning-resources" linkLabel={t("Shiko burimet", "View resources")}/>
 {message&&<p className="p1-note" role="status">{typeof message==="string"?message:JSON.stringify(message)}</p>}
 <div className="publishing-columns">
  <section className="publishing-section"><h2>{t("Problema e Javës (publike)", "Problem of the Week (public)")}</h2>
<p>{t("Programo sfidën dhe shqyrto zgjidhjet në një vend.", "Schedule challenges and review submissions in one place.")}</p><Link className="p1-btn" to="/admin/weekly">{t("Programo sfidën javore", "Schedule weekly challenge")}</Link>
  </section>
  <section className="publishing-section"><h2>{t("Lëndët e profesorëve", "Teachers' subjects")}</h2>
   <p className="p1-muted">{t("Zgjidh profesorin dhe lëndën që zhvillon.", "Select the teacher and subject they teach.")}</p>
   <form className="p1-form" onSubmit={e=>{e.preventDefault();call("/access/admin/teacher-subjects",{teacher_id:Number(teacher.teacher_id),subject:teacher.subject});}}>
    <AdminUserSelect label={t("Mësuesi", "Teacher")} role="teacher" value={teacher.teacher_id} onChange={teacher_id=>setTeacher({...teacher,teacher_id})}/>
    <label>{t("Lënda", "Subject")}<input className="p1-input" required value={teacher.subject} onChange={e=>setTeacher({...teacher,subject:e.target.value})}/></label>
    <button className="p1-btn" type="submit" disabled={busy}>{t("Cakto lëndën", "Assign subject")}</button>
   </form>
  </section>
 </div>
 <section className="publishing-section"><h2>{t("Materiale dhe takime", "Materials and meetings")}</h2><p><Link to="/learning-resources">{t("Shiko materialet e publikuara", "View published resources")}</Link> · <Link to="/admin/courses">{t("Krijo detyra dhe teste me kohë", "Create assignments and timed tests")}</Link></p>
   <p className="p1-muted">{t("Përdoruesit e regjistruar shohin tekstin dhe lidhjet e kësaj përmbajtjeje.", "Registered users can see the text and links in this content.")}</p>
   <form className="p1-form" onSubmit={e=>{e.preventDefault();call("/access/admin/resources",{...resource,scheduled_at:resource.scheduled_at||null});}}>
    <label>{t("Lloji", "Type")}<select className="p1-select" value={resource.kind} onChange={e=>setResource({...resource,kind:e.target.value})}><option value="material">{t("Material", "Material")}</option><option value="test">{t("Ushtrim (pa kohëmatës)", "Exercise (untimed)")}</option><option value="meet">Google Meet</option></select></label>
    <label>{t("Titulli", "Title")}<input className="p1-input" value={resource.title} required onChange={e=>setResource({...resource,title:e.target.value})}/></label>
    <label>{t("Lënda", "Subject")}<input className="p1-input" value={resource.subject} onChange={e=>setResource({...resource,subject:e.target.value})}/></label>
    <label>{t("Data/orari (opsional)", "Date/time (optional)")}<input className="p1-input" type="datetime-local" value={resource.scheduled_at} onChange={e=>setResource({...resource,scheduled_at:e.target.value})}/></label>
    <label>{t("Teksti, materiali ose lidhja Google Meet", "Text, material or Google Meet link")}<textarea rows="6" className="p1-input" value={resource.body} onChange={e=>setResource({...resource,body:e.target.value})}/></label>
    <button className="p1-btn" type="submit" disabled={busy}>{t("Publiko", "Publish")}</button>
   </form>
 </section></main>;
}
