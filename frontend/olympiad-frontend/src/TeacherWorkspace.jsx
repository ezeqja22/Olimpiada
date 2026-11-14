import React,{useState,useEffect,useRef} from 'react';
import axios from 'axios';
import {Link} from 'react-router-dom';
import {useLanguage} from './context/LanguageContext';
import MathRenderer from './MathRenderer';
import './TeachingWorkspace.css';
const API=process.env.REACT_APP_API_URL||'http://127.0.0.1:8000';
const headers=()=>({Authorization:'Bearer '+localStorage.getItem('token')});
export default function TeacherWorkspace(){
 const reviewVersion=useRef(0);
 const [reviewLoading,setReviewLoading]=useState(false),[reviewError,setReviewError]=useState(false);
 useEffect(()=>()=>{reviewVersion.current+=1},[]);
 const {lang}=useLanguage(),[classes,setClasses]=useState([]),[items,setItems]=useState([]),[form,setForm]=useState({forum_id:"",title:"",meet_url:"",starts_at:""}),[notice,setNotice]=useState(""),[chosen,setChosen]=useState(null),[answers,setAnswers]=useState([]),[grade,setGrade]=useState({});
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[saving,setSaving]=useState(null);
 const reload=()=>{setLoading(true);setLoadError(false);Promise.all([axios.get(API+"/experience/teacher/classes",{headers:headers()}),axios.get(API+"/experience/teacher/courses",{headers:headers()})]).then(([c,i])=>{setClasses(c.data);setItems(i.data)}).catch(()=>setLoadError(true)).finally(()=>setLoading(false))};
 useEffect(()=>{reload()},[]);
 const open=async id=>{const version=++reviewVersion.current;setChosen(id);setReviewLoading(true);setReviewError(false);setAnswers([]);setGrade({});setNotice("");try{const r=await axios.get(API+"/experience/teacher/courses/"+id+"/submissions",{headers:headers()});if(version!==reviewVersion.current)return;setAnswers(r.data);setGrade(Object.fromEntries(r.data.map(a=>[a.attempt_id,{score:a.score??0,feedback:a.feedback??""}])));}catch(e){if(version===reviewVersion.current)setReviewError(true);}finally{if(version===reviewVersion.current)setReviewLoading(false);}};
 const saveGrade=async id=>{if(saving!==null)return;setSaving(id);try{await axios.post(API+"/experience/teacher/submissions/"+id+"/grade",{score:Number(grade[id]?.score||0),feedback:grade[id]?.feedback||""},{headers:headers()});setNotice("Vlerësimi u ruajt.");await open(chosen);}catch(e){setNotice("Vlerësimi nuk u ruajt.");}finally{setSaving(null)}};
 const meeting=async e=>{e.preventDefault();try{await axios.post(API+"/experience/teacher/meetings",{...form,forum_id:Number(form.forum_id),starts_at:new Date(form.starts_at).toISOString().slice(0,19)},{headers:headers()});setNotice("Takimi u publikua.");}catch(e){setNotice(e.response?.data?.detail||"Takimi nuk u publikua.");}};
 const sq=lang==='sq';
 return <main className="teaching-workspace">
  <header className="teaching-heading"><div><span>{sq?'Hapësira e mësuesit':'Teacher workspace'}</span><h1>{sq?'Klasat dhe vlerësimet':'Classes and assessment'}</h1><p>{sq?'Forumet dhe materialet që të janë caktuar.':'Your assigned forums, learning materials and student work.'}</p></div><Link to="/teacher/courses">{sq?'Publiko materiale':'Publish materials'} →</Link></header>
  {loading&&<p role="status">{sq?'Duke ngarkuar…':'Loading workspace…'}</p>}{loadError&&<div role="alert"><p>{sq?'Hapësira nuk u ngarkua.':'Could not load the workspace.'}</p><button onClick={reload}>{sq?'Provo përsëri':'Retry'}</button></div>}
  <div className="teaching-layout">
   <aside className="teaching-classes"><h2>{sq?'Klasat e mia':'My classes'} <span>{classes.length}</span></h2>{classes.map(c=><Link to={'/forum/'+c.id} key={c.id}><small>{c.subject}</small><strong>{c.title}</strong><span>{sq?'Hap klasën':'Open class'} →</span></Link>)}{!loading&&!loadError&&!classes.length&&<p>{sq?'Nuk të është caktuar ende një klasë.':'No classes have been assigned yet.'}</p>}
    <details className="teaching-meeting"><summary>{sq?'Planifiko një takim':'Schedule a meeting'}</summary><form onSubmit={meeting}>
      <label>{sq?'Forumi':'Forum'}<select required value={form.forum_id} onChange={e=>setForm({...form,forum_id:e.target.value})}><option value="">{sq?'Zgjidh klasën':'Choose a class'}</option>{classes.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>
      <label>{sq?'Titulli':'Title'}<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
      <label>Google Meet URL<input type="url" required placeholder="https://meet.google.com/..." value={form.meet_url} onChange={e=>setForm({...form,meet_url:e.target.value})}/></label>
      <label>{sq?'Ora dhe data':'Date and time'}<input type="datetime-local" required value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label><button>{sq?'Publiko takimin':'Publish meeting'}</button>
    </form></details>
   </aside>
   <div className="teaching-main"><section><h2>{sq?'Materiale dhe korrigjime':'Materials and assessment'}</h2><div className="teaching-assignments">{items.map(i=><article key={i.id}><div><small>{[i.subject,i.kind].filter(Boolean).join(' · ')}</small><h3>{i.title}</h3></div><button type="button" aria-pressed={chosen===i.id} onClick={()=>open(i.id)}>{sq?'Shiko dorëzimet':'View submissions'}</button></article>)}</div>{!loading&&!loadError&&!items.length&&<p className="teaching-empty">{sq?'Ende nuk ka materiale për të vlerësuar.':'No materials to review yet.'}</p>}</section>
   {chosen&&<section className="teaching-review" aria-labelledby="teaching-review-heading"><header><div><small>{items.find(i=>i.id===chosen)?.title}</small><h2 id="teaching-review-heading">{sq?'Dorëzimet':'Submissions'}</h2></div><button onClick={()=>{reviewVersion.current+=1;setChosen(null);}}>{sq?'Mbyll':'Close'}</button></header>
    {reviewLoading?<p role="status">{sq?'Duke ngarkuar përgjigjet…':'Loading answers…'}</p>:reviewError?<div role="alert"><p>{sq?'Dorëzimet nuk u ngarkuan.':'Could not load submissions.'}</p><button onClick={()=>open(chosen)}>{sq?'Provo përsëri':'Retry'}</button></div>:!answers.length?<p>{sq?'Ende nuk ka dorëzime.':'No submissions yet.'}</p>:answers.map(a=><article key={a.attempt_id} className="teaching-submission"><div className="teaching-answer"><h3>{sq?'Nxënësi':'Student'} #{a.student_id}</h3><MathRenderer text={a.answers||''}/></div><form className="teaching-grade" onSubmit={e=>{e.preventDefault();saveGrade(a.attempt_id);}}>
    <label>Score /100<input type="number" min="0" max="100" value={grade[a.attempt_id]?.score??a.score??0} onChange={e=>setGrade({...grade,[a.attempt_id]:{...grade[a.attempt_id],score:e.target.value}})}/></label><label>Feedback<textarea rows={4} value={grade[a.attempt_id]?.feedback??a.feedback??''} onChange={e=>setGrade({...grade,[a.attempt_id]:{...grade[a.attempt_id],feedback:e.target.value}})}/></label><button disabled={saving!==null}>{sq?'Ruaj vlerësimin':'Save assessment'}</button></form></article>)}
   </section>}
   </div>
  </div>{notice&&<p role="status" className="teaching-notice">{notice}</p>}
 </main>;
}
