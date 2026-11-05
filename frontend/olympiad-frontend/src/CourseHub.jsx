import React,{useEffect,useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import MathRenderer from "./MathRenderer";
import VisualMathEditor from "./components/VisualMathEditor";
import "./phase1.css";
import SitePageIntro from "./components/SitePageIntro";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000",hdr=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
const toUTC=local=>new Date(local).toISOString().slice(0,19);
const readUTC=s=>new Date(s+"Z").toLocaleString("sq-AL",{timeZone:"Europe/Tirane"});
export default function CourseHub(){
 const [items,setItems]=useState([]),[notice,setNotice]=useState(""),[active,setActive]=useState(null),[attempt,setAttempt]=useState(null),[answer,setAnswer]=useState(""),[now,setNow]=useState(Date.now());
 useEffect(()=>{axios.get(API+"/core/courses/items",{headers:hdr()}).then(r=>setItems(r.data)).catch(()=>setNotice("Materialet nuk u ngarkuan."));},[]);
 useEffect(()=>{const n=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(n);},[]);
 const open=async item=>{setNotice("");setActive(item);setAnswer("");setAttempt(null);
   if(item.kind==="test"){try{const r=await axios.post(API+"/core/courses/items/"+item.id+"/start",{}, {headers:hdr()});setAttempt(r.data);setActive({...item,body:r.data.body});}catch(e){setNotice(e.response?.data?.detail||"Testi nuk mund të fillojë.");}}};
 const submit=async e=>{e.preventDefault();if(!active)return;try{await axios.post(API+"/core/courses/items/"+active.id+"/submit",{answers:answer},{headers:hdr()});setNotice("Përgjigjja u dorëzua.");setActive(null);}
 catch(e){setNotice(e.response?.data?.detail||"Dërgimi dështoi.");}};
 const secondsLeft=attempt?Math.max(0,Math.floor((new Date(attempt.deadline+"Z").getTime()-now)/1000)):null;
 return <main className="p1-wrap"><SitePageIntro contentKey="page_courses" kicker="Mësimi online" title="Materiale, Detyra dhe Teste" subtitle="Materialet janë të ndara sipas lëndës. Testet kanë kohëmatës të kontrolluar nga serveri." />
 {notice&&<p className="p1-note" role="status">{notice}</p>}
 {active&&<section className="p1-card p1-group"><div className="p1-row"><h2>{active.title}</h2><button className="p1-btn alt" onClick={()=>setActive(null)}>Kthehu</button></div>
 {attempt&&<p className="p1-pill">Koha e mbetur: {Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,"0")}</p>}
 <p className="p1-muted">{active.instructions}</p><MathRenderer text={active.body}/>
 {active.kind!=="material"&&(!attempt||!attempt.submitted)&&<form className="p1-form" onSubmit={submit}><label>Përgjigjja jote<textarea className="p1-input" rows={8} required value={answer} onChange={e=>setAnswer(e.target.value)}/></label>
 <button className="p1-btn" type="submit" disabled={active.kind==="test"&&(!attempt||secondsLeft<=0)}>{secondsLeft===0?"Koha përfundoi":"Dorëzo përgjigjen"}</button></form>}
 </section>}
 <div className="p1-grid">{items.map(item=><article className="p1-card" key={item.id}><span className="p1-pill">{item.kind==="material"?"MATERIAL":item.kind==="test"?"TEST ME KOHË":"DETYRË"}</span><h2>{item.title}</h2><p className="p1-muted">{item.subject} · Publikuar {readUTC(item.published_at)}{item.duration_minutes?" · "+item.duration_minutes+" minuta":""}</p>
 {item.kind==="material"?<button className="p1-btn" onClick={()=>setActive(item)}>Lexo materialin</button>:<button className="p1-btn" onClick={()=>open(item)}>{item.kind==="test"?"Fillo testin":"Hap detyrën"}</button>}
 </article>)}</div>
 {!items.length&&!notice&&<p className="p1-note">Nuk ka përmbajtje të publikuar.</p>}
</main>;
}
export function AdminCourses(){
 const [classes,setClasses]=useState([]);
 const [item,setItem]=useState({forum_id:null,kind:"material",title:"",subject:"Mathematics",instructions:"",body:"",published_at:"",due_at:"",duration_minutes:60}),[notice,setNotice]=useState("");
 useEffect(()=>{axios.get(API+"/experience/teacher/classes",{headers:hdr()}).then(r=>setClasses(r.data)).catch(()=>{});},[]);
 const submit=async e=>{e.preventDefault();try{const payload={...item,published_at:toUTC(item.published_at),due_at:item.due_at?toUTC(item.due_at):null,duration_minutes:item.kind==="test"?Number(item.duration_minutes):null};
 await axios.post(API+"/core/courses/admin/items",payload,{headers:hdr()});setNotice("Materiali/detyra/testi u programua me sukses.");}
 catch(e){setNotice(e.response?.data?.detail||"Nuk u ruajt përmbajtja.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Materiale dhe Teste · Administrimi</h1><p className="p1-muted">Data e publikimit dhe afati futen në orën lokale të pajisjes; në server ruhen në UTC.</p>
 <form className="p1-card p1-form" onSubmit={submit}>
 {classes.length>0&&<label>Klasa/forumi (i detyrueshëm për mësuesit)
 <select className="p1-select" required value={item.forum_id||""} onChange={e=>setItem({...item,forum_id:Number(e.target.value)||null})}>
 <option value="">Zgjidh klasën</option>{classes.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
 <label>Format<select className="p1-select" value={item.kind} onChange={e=>setItem({...item,kind:e.target.value})}><option value="material">Material</option><option value="homework">Detyrë</option><option value="test">Test me kohëmatës</option></select></label>
 <label>Titulli<input className="p1-input" required value={item.title} onChange={e=>setItem({...item,title:e.target.value})}/></label>
 <label>Lënda<input className="p1-input" required value={item.subject} onChange={e=>setItem({...item,subject:e.target.value})}/></label>
 <label>Udhëzimet<textarea className="p1-input" value={item.instructions} onChange={e=>setItem({...item,instructions:e.target.value})}/></label>
 <label>Përmbajtja (formulat shtohen vizualisht)<VisualMathEditor value={item.body} onChange={body=>setItem({...item,body})} minHeight={200}/></label>
 <label>Publikimi<input type="datetime-local" className="p1-input" required value={item.published_at} onChange={e=>setItem({...item,published_at:e.target.value})}/></label>
 {item.kind!=="material"&&<label>Afati (opsional)<input type="datetime-local" className="p1-input" value={item.due_at} onChange={e=>setItem({...item,due_at:e.target.value})}/></label>}
 {item.kind==="test"&&<label>Kohëzgjatja (minuta)<input className="p1-input" required type="number" min="1" max="360" value={item.duration_minutes} onChange={e=>setItem({...item,duration_minutes:Number(e.target.value)})}/></label>}
 <button type="submit" className="p1-btn">Programo publikimin</button></form>{notice&&<p className="p1-note" role="status">{notice}</p>}</main>;
}
