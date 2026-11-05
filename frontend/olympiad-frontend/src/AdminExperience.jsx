import React,{useEffect,useState} from "react";
import axios from "axios";
import "./phase1.css";
import "./phase3.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
const api=(path)=>API+"/experience"+path;
const blank={title_sq:"",title_en:"",subtitle_sq:"",subtitle_en:"",image_url:"",button_url:""};
export function AdminTeachers(){
 const [rows,setRows]=useState([]),[forms,setForms]=useState({}),[forums,setForums]=useState([]),[notice,setNotice]=useState("");
 const load=()=>axios.get(api("/admin/teachers"),{headers:headers()}).then(r=>setRows(r.data)).catch(()=>setNotice("Nuk u lexuan aplikimet."));
 useEffect(()=>{load();axios.get(API+"/core/forums/catalog",{headers:headers()}).then(r=>setForums(r.data)).catch(()=>{});},[]);
 const review=async(id,approve)=>{try{await axios.post(api("/admin/teachers/"+id+"/review"),{approve,note:""},{headers:headers()});load();}catch(e){setNotice(e.response?.data?.detail||"Nuk u ruajt vendimi.");}};
 const assign=async(e,id)=>{e.preventDefault();try{await axios.post(api("/admin/teacher-assignments"),{teacher_id:Number(forms[id]?.teacher_id||id),forum_id:Number(forms[id]?.forum_id)},{headers:headers()});setNotice("Mësuesi u caktua në forum.");}catch(e){setNotice(e.response?.data?.detail||"Caktimi dështoi.");}};
 const view=async(id,kind)=>{const tab=window.open("about:blank","_blank");
 try{const r=await axios.get(api("/admin/teachers/"+id+"/image/"+kind),{responseType:"blob",headers:headers()});
 const url=URL.createObjectURL(r.data);if(tab){tab.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),120000);}
 else{const a=document.createElement("a");a.href=url;a.download="teacher-review.jpg";a.click();setTimeout(()=>URL.revokeObjectURL(url),120000);}}
 catch(e){if(tab)tab.close();setNotice("Fotografia nuk u hap.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Mësuesit & Verifikimi</h1><p className="p1-muted">Foto e ID-së është private. Vetëm pas aprovimit mund t'i caktohet një klasë mësuesit.</p>
 <div className="p1-rows">{rows.map(r=><section className="p1-card" key={r.id}><div className="p1-row"><div><h2>{r.first_name} {r.last_name}</h2><p>{r.subject} · {r.status} · Data e lindjes: {r.birth_date}</p></div><div className="p1-row"><button className="p1-btn alt" onClick={()=>view(r.id,"portrait")}>Foto profesionale</button><button className="p1-btn alt" onClick={()=>view(r.id,"id")}>ID (private)</button></div></div>
 <p style={{whiteSpace:"pre-wrap"}}>{r.bio}</p>
 {r.status==="pending"&&<div className="p1-row"><button className="p1-btn" onClick={()=>review(r.id,true)}>Aprovo</button><button className="p1-btn alt" onClick={()=>review(r.id,false)}>Refuzo</button></div>}
 {r.status==="approved"&&<form className="p1-row p3-assignment" onSubmit={e=>assign(e,r.user_id)}>
 <label>Klasa / Forumi<select required className="p1-select" value={forms[r.user_id]?.forum_id||""} onChange={e=>setForms({...forms,[r.user_id]:{forum_id:e.target.value}})}>
 <option value="">Zgjidh forumin</option>{forums.map(f=><option key={f.id} value={f.id}>{f.title} · {f.subject||"General"}</option>)}
 </select></label>
 <button className="p1-btn">Cakto në klasë</button></form>}</section>)}</div>
 {rows.length===0&&<p className="p1-note">Nuk ka ende aplikime.</p>}{notice&&<p className="p1-note" role="status">{notice}</p>}</main>;
}
const KEYS=[["hero","Hero"],["competition","Gara / Olimpiadat"],["community","Komuniteti"],["partner","Spark Partner"],["cta","Thirrja për regjistrim"]];
export function AdminBranding(){
 const [blocks,setBlocks]=useState({}),[notice,setNotice]=useState(""),[uploading,setUploading]=useState("");
 useEffect(()=>{axios.get(api("/content")).then(r=>setBlocks(r.data)).catch(()=>{});},[]);
 const set=(key,field,value)=>setBlocks(prev=>({...prev,[key]:{...blank,...prev[key],[field]:value}}));
 const save=async key=>{try{await axios.put(api("/admin/content/"+key),{...blank,...blocks[key]},{headers:headers()});setNotice("Seksioni "+key+" u ruajt.");}catch(e){setNotice(e.response?.data?.detail||"Ruajtja dështoi.");}};
 const upload=async(key,file)=>{if(!file)return;setUploading(key);setNotice("");try{const body=new FormData();body.append("file",file);
 const r=await axios.post(api("/admin/branding/upload"),body,{headers:headers()});
 set(key,"image_url",r.data.url);setNotice("Foto u ngarkua. Kliko Ruaj seksionin për ta publikuar.");}
 catch(e){setNotice(e.response?.data?.detail||"Ngarkimi dështoi. Kontrollo Cloudinary.");}finally{setUploading("");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Branding & Bannerat</h1><p className="p1-muted">Çdo seksion ka titull e përshkrim në shqip dhe anglisht, foto dhe link. Ngarkimi optimizohet në backend.</p>
 <div className="p1-grid two">{KEYS.map(([key,name])=><section className="p1-card p3-form" key={key}><div className="p1-row"><h2>{name}</h2><span className="p1-pill">{key}</span></div>
 {blocks[key]?.image_url&&<img src={blocks[key].image_url} alt="" className="p3-preview"/>}
 <label>Foto (JPG/PNG/WEBP)<input className="p1-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(key,e.target.files?.[0])}/></label>
 {uploading===key&&<span>Duke ngarkuar...</span>}
 <label>Image URL HTTPS<input className="p1-input" value={blocks[key]?.image_url||""} onChange={e=>set(key,"image_url",e.target.value)}/></label>
 {["title_sq","title_en","subtitle_sq","subtitle_en","button_url"].map(f=><label key={f}>{f}<input className="p1-input" value={blocks[key]?.[f]||""} onChange={e=>set(key,f,e.target.value)}/></label>)}
 <button className="p1-btn" onClick={()=>save(key)}>Ruaj seksionin</button></section>)}</div>
 {notice&&<p className="p1-note" role="status">{typeof notice==="string"?notice:JSON.stringify(notice)}</p>}</main>;
}
const FAQBLANK={category:"General",question_sq:"",answer_sq:"",question_en:"",answer_en:"",position:0,active:true};
export function AdminFAQ(){
 const [rows,setRows]=useState([]),[form,setForm]=useState(FAQBLANK),[editing,setEditing]=useState(null),[notice,setNotice]=useState("");
 const load=()=>axios.get(api("/admin/faq"),{headers:headers()}).then(r=>setRows(r.data)).catch(()=>{});
 useEffect(load,[]);
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
 useEffect(load,[]);
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
 const [rows,setRows]=useState([]),[editing,setEditing]=useState(null),[form,setForm]=useState({}),[notice,setNotice]=useState("");
 const [recipients,setRecipients]=useState(""),[dispatchFields,setDispatchFields]=useState("{}");
 const load=()=>axios.get(api("/admin/templates"),{headers:headers()}).then(r=>setRows(r.data)).catch(()=>{});
 useEffect(load,[]);
 const save=async e=>{e.preventDefault();try{await axios.put(api("/admin/templates/"+form.key),form,{headers:headers()});setNotice("Template u ruajt.");setEditing(null);load();}catch(e){setNotice(e.response?.data?.detail||"Ruajtja dështoi.");}};
 return <section className="p1-card p1-group"><h2>Email Template Builder</h2>
 <p className="p1-muted">Template të personalizueshme sipas llojit të njoftimit. Placeholders: {"{{name}}, {{title}}, {{child_name}}, {{forum_name}}, {{result}}, {{link}}"}.</p>
 <div className="p3-template-grid"><div>{rows.map(row=><button className="p3-template-row" key={row.key} onClick={()=>{setForm(row);setEditing(row.key);}}>{row.key} <span>✎</span></button>)}
 <button className="p1-btn alt" onClick={()=>{setForm({key:"new_template",subject_sq:"",subject_en:"",body_sq:"",body_en:"",active:true});setEditing("new");}}>+ Template i ri</button></div>
 {editing&&<form className="p3-form" onSubmit={save}>
 <label>Template key<input required className="p1-input" value={form.key} disabled={editing!=="new"} onChange={e=>setForm({...form,key:e.target.value})}/></label>
 {["subject_sq","body_sq","subject_en","body_en"].map(k=><label key={k}>{k}<textarea className="p1-input" required rows={k.startsWith("body")?5:2} value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
 <label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label>
 <button className="p1-btn">Ruaj template</button></form>}</div>
 {editing&&<div className="p3-form" style={{marginTop:18}}><h3>Dërgo te përdorues specifikë (maksimumi 25)</h3>
 <label>User ID, të ndara me presje<input className="p1-input" value={recipients} onChange={e=>setRecipients(e.target.value)} placeholder="12, 35, 90"/></label>
 <label>Placeholder JSON<input className="p1-input" value={dispatchFields} onChange={e=>setDispatchFields(e.target.value)} placeholder='{"title":"Detyrë e re","link":"/courses"}'/></label>
 <button className="p1-btn alt" type="button" onClick={async()=>{try{const ids=recipients.split(",").map(n=>Number(n.trim())).filter(Number.isInteger);const fields=JSON.parse(dispatchFields);
 const r=await axios.post(api("/admin/templates/"+form.key+"/send"),{recipient_user_ids:ids,fields},{headers:headers()});setNotice("U dërguan "+r.data.recipients+" njoftime.");}
 catch(e){setNotice(e.response?.data?.detail||"Dërgimi dështoi.");}}}>Dërgo template</button></div>}
 {notice&&<p role="status" className="p1-note">{notice}</p>}</section>;
}
export function AdminParents(){
 const [parent,setParent]=useState(""),[student,setStudent]=useState(""),[link,setLink]=useState(""),[report,setReport]=useState(""),[notice,setNotice]=useState("");
 const [links,setLinks]=useState([]);
 const load=()=>axios.get(api("/admin/parent-links"),{headers:headers()}).then(r=>setLinks(r.data)).catch(()=>{});
 useEffect(load,[]);
 const connect=async e=>{e.preventDefault();try{await axios.post(api("/admin/parent-links"),{parent_id:Number(parent),student_id:Number(student)},{headers:headers()});setNotice("Ftesa u krijua. Kërkon miratimin e prindit dhe nxënësit.");load();}catch(e){setNotice(e.response?.data?.detail||"Krijimi dështoi.");}};
 const send=async e=>{e.preventDefault();const f=new FormData();f.append("report",report);try{const r=await axios.post(api("/admin/parent-reports/"+link),f,{headers:headers()});setNotice(r.data.delivered?"Raporti u dërgua.":"Raporti u ruajt në njoftimet e prindit; email-i nuk u dorëzua.");}catch(e){setNotice(e.response?.data?.detail||"Lidhja duhet konfirmuar.");}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Raportet për Prindërit</h1><p className="p1-muted">Raportet private kërkojnë dy miratime: nga prindi dhe nga nxënësi.</p>
 <div className="p1-grid two"><form className="p1-card p3-form" onSubmit={connect}><h2>Lidh prindin dhe nxënësin</h2><label>Parent user ID<input className="p1-input" type="number" min="1" required value={parent} onChange={e=>setParent(e.target.value)}/></label><label>Student user ID<input className="p1-input" type="number" min="1" required value={student} onChange={e=>setStudent(e.target.value)}/></label><button className="p1-btn">Krijo lidhjen</button></form>
 <form className="p1-card p3-form" onSubmit={send}><h2>Dërgo raport progresi</h2><label>Approved link ID<input required type="number" min="1" className="p1-input" value={link} onChange={e=>setLink(e.target.value)}/></label><label>Raporti<textarea className="p1-input" minLength={10} required rows={6} value={report} onChange={e=>setReport(e.target.value)}/></label><button className="p1-btn">Dërgo raportin</button></form></div>
 <section className="p1-card p1-group"><h2>Lidhjet & Miratimi</h2>{links.map(l=><div className="p3-assignment-row" key={l.id}><span>#{l.id}: Parent {l.parent_id} · Student {l.student_id} — {l.status}</span>{l.status==="approved"&&<button className="p1-btn alt" onClick={()=>setLink(String(l.id))}>Përdor për raport</button>}</div>)}</section>
 {notice&&<p className="p1-note">{notice}</p>}</main>;
}
