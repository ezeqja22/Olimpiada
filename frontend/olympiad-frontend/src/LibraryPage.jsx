import React,{useEffect,useRef,useState} from "react";
import axios from "axios";
import {Link,useParams} from "react-router-dom";
import {LockKeyhole} from "lucide-react";
import {useAuth} from "./context/AuthContext";
import "./phase1.css";
import SitePageIntro from "./components/SitePageIntro";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
const categories={book:"Libra",booklet:"Booklet",paper:"Teza",olympiad_scan:"Olimpiada të skanuara"};
export function LibraryCatalog(){
 const [docs,setDocs]=useState([]),[error,setError]=useState("");
 const [filter,setFilter]=useState({category:"",subject:"",level:""});
 const {accessInfo}=useAuth();const allowed=accessInfo?.features?.includes("material");
 useEffect(()=>{axios.get(API+"/core/library/catalog",{params:filter}).then(r=>setDocs(r.data)).catch(()=>setError("Biblioteka nuk u ngarkua."));},[filter.category,filter.subject,filter.level]);
 return <main className="p1-wrap"><SitePageIntro contentKey="page_library" kicker="Arkivi digjital" title="Biblioteka Olimpike" subtitle="Libra, booklet-e, teza dhe skanime të olimpiadave. Titujt janë publikë; leximi kërkon abonim Medium ose Premium." />
 <div className="p1-grid" style={{marginBottom:20}}>
 <label>Kategoria<select className="p1-select" value={filter.category} onChange={e=>setFilter({...filter,category:e.target.value})}><option value="">Të gjitha</option>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <label>Lënda<input className="p1-input" placeholder="Mathematics, Physics..." value={filter.subject} onChange={e=>setFilter({...filter,subject:e.target.value})}/></label>
 <label>Niveli<select className="p1-select" value={filter.level} onChange={e=>setFilter({...filter,level:e.target.value})}><option value="">Të gjitha</option><option value="school">Shkollor</option><option value="advanced">I Avancuar</option></select></label>
 </div>{error&&<p className="p1-alert">{error}</p>}
 <div className="p1-grid">{docs.map(d=><article className="p1-card" key={d.id}><div className="p1-row"><span className="p1-pill">{categories[d.category]}</span>{!allowed&&<LockKeyhole size={18}/>}</div>
 <h2>{d.title}</h2><p className="p1-muted">{d.subject} · {d.level==="school"?"Shkollor":"I Avancuar"} · {d.olympiad||""} · {d.year||""}</p>
 <Link className="p1-btn" to={allowed?"/library/"+d.id:"/pricing"}>{allowed?"Lexo online":"Zhblloko për lexim"}</Link></article>)}</div>
 {!docs.length&&!error&&<p className="p1-note">Nuk ka dokumente në këtë kategori.</p>}
 <p className="p1-note">Leximi bëhet faqe pas faqeje, me watermark personal. Nuk ofrohet shkarkimi i PDF-së; screenshot-et nuk mund të ndalohen plotësisht nga një website.</p></main>;
}
export function LibraryViewer(){
 const {id}=useParams(),{accessInfo}=useAuth();const [doc,setDoc]=useState(null),[page,setPage]=useState(1),[error,setError]=useState("");const canvas=useRef(null);
 const allowed=accessInfo?.features?.includes("material");
 useEffect(()=>{if(!allowed)return;axios.get(API+"/core/library/"+id,{headers:headers()}).then(r=>setDoc(r.data)).catch(()=>setError("Aksesi u refuzua ose dokumenti nuk ekziston."));},[id,allowed]);
 useEffect(()=>{
  if(!doc||!allowed)return;
  let cancelled=false;const controller=new AbortController();
  setError("");
  axios.get(API+"/core/library/"+id+"/pages/"+page,{headers:headers(),responseType:"blob",signal:controller.signal})
  .then(async r=>{const url=URL.createObjectURL(r.data);const img=new Image();
   try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    if(cancelled||!canvas.current)return;const c=canvas.current;c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);
   }finally{URL.revokeObjectURL(url);}
  }).catch(()=>{if(!cancelled)setError("Nuk u lexua faqja.");});
  return()=>{cancelled=true;controller.abort();};
 },[id,page,doc,allowed]);
 if(!allowed)return <main className="p1-wrap p1-card"><LockKeyhole/> <h2>Lexim vetëm për abonentët</h2><Link to="/pricing" className="p1-btn">Shiko planet</Link></main>;
 return <main className="p1-wrap"><Link to="/library">← Biblioteka</Link>
 <h1 className="p1-brand">{doc?.title||"Lexuesi privat"}</h1><p className="p1-muted">Lexim online me watermark personal. Fotografi të ekranit nuk mund të ndalohen plotësisht.</p>
 {doc&&<div className="p1-row p1-card"><button className="p1-btn alt" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Mbrapa</button>
 <strong>Faqja {page} / {doc.page_count}</strong><button className="p1-btn alt" disabled={page>=doc.page_count} onClick={()=>setPage(p=>p+1)}>Para</button></div>}
 <div onContextMenu={e=>e.preventDefault()} onCopy={e=>e.preventDefault()} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&["s","p","c"].includes(e.key.toLowerCase()))e.preventDefault();}}
 tabIndex={0} className="p1-card" style={{marginTop:16,display:"flex",justifyContent:"center",overflow:"auto",userSelect:"none"}}>
 <canvas ref={canvas} aria-label="Faqe e mbrojtur" style={{maxWidth:"100%",height:"auto",display:"block"}}/></div>
 {error&&<p className="p1-alert" role="alert">{error}</p>}</main>;
}
export function LibraryAdmin(){
 const [state,setState]=useState({title:"",category:"book",subject:"Mathematics",level:"school",olympiad:"",year:""}),[file,setFile]=useState(null),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const upload=async e=>{e.preventDefault();if(!file)return setNotice("Zgjidh një PDF.");setBusy(true);
 const form=new FormData();Object.entries(state).forEach(([k,v])=>{if(v)form.append(k,v);});form.append("file",file);
 try{const r=await axios.post(API+"/core/library/admin/upload",form,{headers:headers()});setNotice("Dokumenti u ruajt me "+r.data.page_count+" faqe.");}
 catch(e){setNotice(typeof e.response?.data?.detail==="string"?e.response.data.detail:"Ngarkimi dështoi.");}finally{setBusy(false);}};
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Biblioteka · Administrimi</h1><p className="p1-muted">Ngarko vetëm dokumente me leje publikimi. PDF-të ruhen privatisht.</p>
 <form className="p1-card p1-form" onSubmit={upload}>
 <label>Titulli<input className="p1-input" required value={state.title} onChange={e=>setState({...state,title:e.target.value})}/></label>
 <div className="p1-grid two"><label>Kategoria<select className="p1-select" value={state.category} onChange={e=>setState({...state,category:e.target.value})}>{Object.entries(categories).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
 <label>Niveli<select className="p1-select" value={state.level} onChange={e=>setState({...state,level:e.target.value})}><option value="school">Shkollor</option><option value="advanced">I Avancuar</option></select></label></div>
 <label>Lënda<input className="p1-input" value={state.subject} required onChange={e=>setState({...state,subject:e.target.value})}/></label>
 <label>Olimpiada (opsionale)<input className="p1-input" value={state.olympiad} onChange={e=>setState({...state,olympiad:e.target.value})}/></label>
 <label>Viti<input className="p1-input" type="number" min="1900" max="2100" value={state.year} onChange={e=>setState({...state,year:e.target.value})}/></label>
 <label>PDF (deri 25MB, 400 faqe)<input className="p1-input" type="file" accept="application/pdf" required onChange={e=>setFile(e.target.files?.[0])}/></label>
 <button className="p1-btn" disabled={busy} type="submit">{busy?"Duke ngarkuar...":"Ruaj dokumentin"}</button></form>
 {notice&&<p className="p1-note" role="status">{notice}</p>}</main>;
}
