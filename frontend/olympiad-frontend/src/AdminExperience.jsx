import {useLanguage} from "./context/LanguageContext";
import {adminStatusLabel} from "./adminNavigation";
import {PublishingHeader} from "./components/PublishingWorkspace";
import React,{useEffect,useState} from "react";
import axios from "axios";
import AdminUserSelect from "./components/AdminUserSelect";
import "./phase1.css";
import "./phase3.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
const api=(path)=>API+"/experience"+path;
const blank={title_sq:"",title_en:"",subtitle_sq:"",subtitle_en:"",image_url:"",button_url:""};
export function AdminTeachers(){
 const {lang}=useLanguage();
 const tr=(en,sq)=>lang==='sq'?sq:en;

 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false);
 const [rows,setRows]=useState([]),[forms,setForms]=useState({}),[forums,setForums]=useState([]),[notice,setNotice]=useState("");
 const load=()=>{setLoading(true);setLoadError(false);return axios.get(api("/admin/teachers"),{headers:headers()}).then(r=>setRows(r.data)).catch(()=>{setLoadError(true);setNotice(tr("Could not load applications.","Nuk u lexuan aplikimet."));}).finally(()=>setLoading(false));};
 useEffect(()=>{load();axios.get(API+"/core/forums/catalog",{headers:headers()}).then(r=>setForums(r.data)).catch(()=>setNotice(tr("Classes failed to load. Reload before assigning a class.","Klasat nuk u ngarkuan. Ringarko faqen për të caktuar një klasë.")));},[]);
 const review=async(id,approve)=>{try{await axios.post(api("/admin/teachers/"+id+"/review"),{approve,note:""},{headers:headers()});load();}catch(e){setNotice(e.response?.data?.detail||tr("Decision could not be saved.","Nuk u ruajt vendimi."));}};
 const assign=async(e,id)=>{e.preventDefault();try{await axios.post(api("/admin/teacher-assignments"),{teacher_id:Number(forms[id]?.teacher_id||id),forum_id:Number(forms[id]?.forum_id)},{headers:headers()});setNotice(tr("Teacher assigned to forum.","Mësuesi u caktua në forum."));}catch(e){setNotice(e.response?.data?.detail||tr("Assignment failed.","Caktimi dështoi."));}};
 return <main className="publishing-workspace"><PublishingHeader eyebrow={tr("Learning / Teachers","Mësuesit / Verifikimi")} title={tr("Teachers & verification","Mësuesit & Verifikimi")} description={tr("Review every applicant's experience and subject. Approved teachers can be assigned to a class.","Shqyrto përvojën dhe lëndën e çdo aplikanti. Mësuesit e miratuar mund të caktohen në një klasë.")} to="/teacher/apply" linkLabel={tr("View application","Shiko aplikimin")}/>
 <div className="publishing-history">{rows.map(r=><section className="publishing-ticket" key={r.id}><div><div className="p1-row"><div><h2>{r.first_name} {r.last_name}</h2><p>{r.subject} · {adminStatusLabel(r.status,lang)} · {tr("Date of birth:","Data e lindjes:")} {r.birth_date}</p></div></div>
 <p className="publishing-submission">{r.bio}</p></div><div className="publishing-review">
 {r.status==="pending"&&<div className="p1-row"><button className="p1-btn" onClick={()=>review(r.id,true)}>{tr("Approve","Aprovo")}</button><button className="p1-btn alt" onClick={()=>review(r.id,false)}>{tr("Reject","Refuzo")}</button></div>}
 {r.status==="approved"&&<form className="p1-row p3-assignment" onSubmit={e=>assign(e,r.user_id)}>
 <label>{tr("Class / forum","Klasa / Forumi")}<select required className="p1-select" value={forms[r.user_id]?.forum_id||""} onChange={e=>setForms({...forms,[r.user_id]:{forum_id:e.target.value}})}>
 <option value="">{tr("Choose a forum","Zgjidh forumin")}</option>{forums.map(f=><option key={f.id} value={f.id}>{f.title} · {f.subject||"General"}</option>)}
 </select></label>
 <button className="p1-btn">{tr("Assign to class","Cakto në klasë")}</button></form>}</div></section>)}</div>
 {loading&&<p role="status">{tr("Loading…","Duke ngarkuar…")}</p>}{loadError&&<button className="p1-btn alt" onClick={load}>{tr("Try again","Provo përsëri")}</button>}{!loading&&!loadError&&rows.length===0&&<p className="p1-note">{tr("No applications yet.","Nuk ka ende aplikime.")}</p>}{notice&&<p className="p1-note" role="status">{notice}</p>}</main>;
}
const KEYS=[["hero","Hero"],["competition","Gara / Olimpiadat"],["community","Komuniteti"],["partner","Spark Partner"],["cta","Thirrja për regjistrim"]];
export function AdminBranding(){
 const [blocks,setBlocks]=useState({}),[notice,setNotice]=useState("");
 useEffect(()=>{axios.get(api("/content")).then(r=>setBlocks(r.data)).catch(()=>{});},[]);
 const set=(key,field,value)=>setBlocks(prev=>({...prev,[key]:{...blank,...prev[key],[field]:value}}));
 const save=async key=>{try{await axios.put(api("/admin/content/"+key),{...blank,...blocks[key]},{headers:headers()});setNotice("Seksioni "+key+" u ruajt.");}catch(e){setNotice(e.response?.data?.detail||"Ruajtja dështoi.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Branding & Bannerat</h1><p className="p1-muted">Çdo seksion ka titull e përshkrim në shqip dhe anglisht, foto dhe link.</p>
 <div className="p1-grid two">{KEYS.map(([key,name])=><section className="p1-card p3-form" key={key}><div className="p1-row"><h2>{name}</h2><span className="p1-pill">{key}</span></div>
 {blocks[key]?.image_url&&<img src={blocks[key].image_url} alt="" className="p3-preview"/>}
 <label>Image URL HTTPS<input className="p1-input" value={blocks[key]?.image_url||""} onChange={e=>set(key,"image_url",e.target.value)}/></label>
 {["title_sq","title_en","subtitle_sq","subtitle_en","button_url"].map(f=><label key={f}>{f}<input className="p1-input" value={blocks[key]?.[f]||""} onChange={e=>set(key,f,e.target.value)}/></label>)}
 <button className="p1-btn" onClick={()=>save(key)}>Ruaj seksionin</button></section>)}</div>
 {notice&&<p className="p1-note" role="status">{typeof notice==="string"?notice:JSON.stringify(notice)}</p>}</main>;
}
const FAQBLANK={category:"General",question_sq:"",answer_sq:"",question_en:"",answer_en:"",position:0,active:true};
export function AdminFAQ(){
 const [rows,setRows]=useState([]),[form,setForm]=useState(FAQBLANK),[editing,setEditing]=useState(null),[notice,setNotice]=useState("");
 const load=()=>axios.get(api("/admin/faq"),{headers:headers()}).then(r=>setRows(r.data)).catch(()=>{});
 useEffect(()=>{load();},[]);
 const save=async e=>{e.preventDefault();try{await axios({method:editing?"put":"post",url:api("/admin/faq"+(editing?"/"+editing:"")),data:form,headers:headers()});setNotice("FAQ u ruajt.");setForm(FAQBLANK);setEditing(null);load();}catch(e){setNotice("Ruajtja dështoi.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>FAQ & Pyetjet</h1>
 <div className="p1-grid two"><form className="p1-card p3-form" onSubmit={save}><h2>{editing?"Ndrysho pyetjen":"Shto pyetje"}</h2>
 {Object.keys(FAQBLANK).filter(k=>k!=="active").map(k=><label key={k}>{k}<textarea className="p1-input" rows={k.startsWith("answer")?4:1} value={form[k]} onChange={e=>setForm({...form,[k]:k==="position"?Number(e.target.value):e.target.value})} required={k!=="position"} /></label>)}
 <label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Aktive</label>
 <button className="p1-btn">Ruaj FAQ</button></form>
 <div className="p1-card"><h2>Pyetjet ekzistuese</h2>{rows.map(r=><div className="p3-assignment-row" key={r.id}><b>{r.question_sq}</b><button className="p1-btn alt" onClick={()=>{setEditing(r.id);setForm({...FAQBLANK,...r});}}>Edito</button></div>)}</div></div>

 {notice&&<p className="p1-note">{notice}</p>}</main>;
}
export function AdminSupport(){
 const [tickets,setTickets]=useState([]),[replies,setReplies]=useState({}),[notice,setNotice]=useState("");
 const load=()=>axios.get(api("/admin/tickets"),{headers:headers()}).then(r=>setTickets(r.data)).catch(()=>{});
 useEffect(()=>{load();},[]);
 const mark=async (id,status)=>{try{
 const r=await axios.put(api("/admin/tickets/"+id),{status,response:replies[id]??""},{headers:headers()});
 setNotice(r.data.email_delivered===false?"Statusi u ruajt, por email-i nuk u dorëzua.":"Statusi dhe përgjigjja u ruajtën.");load();}
 catch(e){setNotice("Nuk u përditësua.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Technical Support · Tickets</h1>
 {tickets.map(t=><article className="p1-card p1-group" key={t.id}><div className="p1-row"><h2>#{t.id} — {t.subject}</h2><span className="p1-pill">{t.status}</span></div>
 <p className="p1-muted">{t.name} · {t.email} · {t.category}</p><p style={{whiteSpace:"pre-wrap"}}>{t.message}</p>
 <label>Përgjigjja për {t.email} (opsionale)<textarea className="p1-input" rows={4} value={replies[t.id]??t.response??""}
 onChange={e=>setReplies({...replies,[t.id]:e.target.value})}/></label>
 <div className="p1-row"><button className="p1-btn alt" onClick={()=>mark(t.id,"in_progress")}>Në proces</button><button className="p1-btn" onClick={()=>mark(t.id,"resolved")}>Zgjidhur</button></div></article>)}
 {!tickets.length&&<p className="p1-note">Nuk ka kërkesa.</p>}
 {notice&&<p className="p1-note">{notice}</p>}</main>;
}
export function AdminTemplates(){
 const {lang}=useLanguage();
 const tr=(en,sq)=>lang==='sq'?sq:en;

 const [rows,setRows]=useState([]),[editing,setEditing]=useState(null),[form,setForm]=useState({}),[notice,setNotice]=useState("");
 const [recipients,setRecipients]=useState(""),[dispatchFields,setDispatchFields]=useState("{}");
 const load=()=>axios.get(api("/admin/templates"),{headers:headers()}).then(r=>setRows(r.data)).catch(()=>{});
 useEffect(()=>{load();},[]);
 const save=async e=>{e.preventDefault();try{await axios.put(api("/admin/templates/"+form.key),form,{headers:headers()});setNotice(tr("Template saved.","Template u ruajt."));setEditing(null);load();}catch(e){setNotice(e.response?.data?.detail||tr("Save failed.","Ruajtja dështoi."));}};
 return <section className="publishing-section"><h2>{tr("Notification templates","Modelet e njoftimeve")}</h2>
 <p className="p1-muted">{tr("Customizable templates by notification type. Placeholders:","Template të personalizueshme sipas llojit të njoftimit. Placeholders:")} {"{{name}}, {{title}}, {{child_name}}, {{forum_name}}, {{result}}, {{link}}"}.</p>
 <div className="publishing-settings-columns"><nav className="publishing-queue" aria-label={tr("Notification templates","Modelet e njoftimeve")}>{rows.map(row=><button aria-pressed={editing===row.key} className="p3-template-row" key={row.key} onClick={()=>{setForm(row);setEditing(row.key);}}>{row.key} <span>✎</span></button>)}
 <button className="p1-btn alt" onClick={()=>{setForm({key:"new_template",subject_sq:"",subject_en:"",body_sq:"",body_en:"",active:true});setEditing("new");}}>{tr("+ New template","+ Template i ri")}</button></nav>
 {editing&&<form className="publishing-form" onSubmit={save}>
 <label>{tr("Template key","Identifikuesi i modelit")}<input required className="p1-input" value={form.key} disabled={editing!=="new"} onChange={e=>setForm({...form,key:e.target.value})}/></label>
 {["subject_sq","body_sq","subject_en","body_en"].map(k=><label key={k}>{k}<textarea className="p1-input" required rows={k.startsWith("body")?5:2} value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
 <label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> {tr("Active","Aktiv")}</label>
 <button className="p1-btn">{tr("Save template","Ruaj template")}</button></form>}</div>
 {editing&&<div className="p3-form" style={{marginTop:18}}><h3>{tr("Send to specific users (maximum 25)","Dërgo te përdorues specifikë (maksimumi 25)")}</h3>
 <label>{tr("User IDs, comma-separated","User ID, të ndara me presje")}<input className="p1-input" value={recipients} onChange={e=>setRecipients(e.target.value)} placeholder="12, 35, 90"/></label>
 <label>{tr("Placeholder JSON","Vlerat JSON")}<input className="p1-input" value={dispatchFields} onChange={e=>setDispatchFields(e.target.value)} placeholder='{"title":"Detyrë e re","link":"/courses"}'/></label>
 <button className="p1-btn alt" type="button" onClick={async()=>{try{const ids=recipients.split(",").map(n=>Number(n.trim())).filter(n=>Number.isInteger(n)&&n>0);if(!ids.length)throw new Error(tr("Choose at least one recipient","Zgjidh të paktën një marrës"));const fields=JSON.parse(dispatchFields);
 const r=await axios.post(api("/admin/templates/"+form.key+"/send"),{recipient_user_ids:ids,fields},{headers:headers()});setNotice("U dërguan "+r.data.recipients+" njoftime.");}
 catch(e){setNotice(e.response?.data?.detail||tr("Delivery failed.","Dërgimi dështoi."));}}}>{tr("Send template","Dërgo template")}</button></div>}
 {notice&&<p role="status" className="p1-note">{notice}</p>}</section>;
}
export function AdminParents(){
 const {lang}=useLanguage();
 const tr=(en,sq)=>lang==='sq'?sq:en;

 const [parent,setParent]=useState(""),[student,setStudent]=useState(""),[link,setLink]=useState(""),[report,setReport]=useState(""),[notice,setNotice]=useState("");
 const [links,setLinks]=useState([]),[loadError,setLoadError]=useState(false),[loading,setLoading]=useState(true);
 const load=()=>{setLoading(true);setLoadError(false);return axios.get(api("/admin/parent-links"),{headers:headers()}).then(r=>setLinks(r.data)).catch(()=>setLoadError(true)).finally(()=>setLoading(false));};
 useEffect(()=>{load();},[]);
 const connect=async e=>{e.preventDefault();try{await axios.post(api("/admin/parent-links"),{parent_id:Number(parent),student_id:Number(student)},{headers:headers()});setNotice(tr("Invitation created. Parent and student approval is required.","Ftesa u krijua. Kërkon miratimin e prindit dhe nxënësit."));load();}catch(e){setNotice(e.response?.data?.detail||tr("Could not create the link.","Krijimi dështoi."));}};
 const send=async e=>{e.preventDefault();const f=new FormData();f.append("report",report);try{const r=await axios.post(api("/admin/parent-reports/"+link),f,{headers:headers()});setNotice(r.data.delivered?tr("Report sent.","Raporti u dërgua."):tr("Report saved to parent notifications; email delivery failed.","Raporti u ruajt në njoftimet e prindit; email-i nuk u dorëzua."));}catch(e){setNotice(e.response?.data?.detail||tr("The family link must be confirmed.","Lidhja duhet konfirmuar."));}};
 return <main className="publishing-workspace"><PublishingHeader eyebrow={tr("Community / Family","Komuniteti / Familja")} title={tr("Parent reports","Raportet për Prindërit")} description={tr("Create an invitation for a family link. Private reports require both parent and student approval.","Krijo një ftesë për lidhjen familjare. Raportet private kërkojnë miratimin e prindit dhe të nxënësit.")} to="/family" linkLabel={tr("View family workspace","Shiko hapësirën familjare")}/>
 <div className="publishing-columns"><form className="publishing-section publishing-form" onSubmit={connect}><h2>{tr("Link a parent and student","Lidh prindin dhe nxënësin")}</h2><AdminUserSelect lang={lang} label={tr("Parent","Prindi")} value={parent} onChange={setParent}/><AdminUserSelect lang={lang} label={tr("Student","Nxënësi")} value={student} onChange={setStudent}/><button className="p1-btn">{tr("Create link","Krijo lidhjen")}</button></form>
 <form className="publishing-section publishing-form" onSubmit={send}><h2>{tr("Send progress report","Dërgo raport progresi")}</h2><label>{tr("Approved family link","Lidhje familjare e miratuar")}<select required className="p1-select" value={link} onChange={e=>setLink(e.target.value)}><option value="">{tr("Choose an approved link","Zgjidh një lidhje të miratuar")}</option>{links.filter(l=>l.status==="approved").map(l=><option key={l.id} value={l.id}>{tr("Parent","Prindi")} #{l.parent_id} · {tr("Student","Nxënësi")} #{l.student_id}</option>)}</select></label><label>{tr("Report","Raporti")}<textarea className="p1-input" minLength={10} required rows={6} value={report} onChange={e=>setReport(e.target.value)}/></label><button className="p1-btn">{tr("Send report","Dërgo raportin")}</button></form></div>
 <section className="publishing-section publishing-history"><h2>{tr("Links & approval","Lidhjet & Miratimi")}</h2>{loading&&<p role="status">{tr("Loading…","Duke ngarkuar…")}</p>}{loadError&&<p role="alert">{tr("Family links could not be loaded.","Lidhjet nuk u ngarkuan.")} <button className="p1-btn alt" onClick={load}>{tr("Try again","Provo përsëri")}</button></p>}{!loading&&!loadError&&!links.length&&<p>{tr("No family links yet.","Nuk ka lidhje familjare.")}</p>}{links.map(l=><div className="p3-assignment-row" key={l.id}><span>#{l.id}: {tr("Parent","Prindi")} {l.parent_id} · {tr("Student","Nxënësi")} {l.student_id} — {adminStatusLabel(l.status,lang)}</span>{l.status==="approved"&&<button className="p1-btn alt" onClick={()=>setLink(String(l.id))}>{tr("Use for report","Përdor për raport")}</button>}</div>)}</section>
 {notice&&<p className="p1-note">{notice}</p>}</main>;
}
