import React,{useEffect,useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const headers=()=>({Authorization:"Bearer "+localStorage.getItem("token")});
export default function AdminForumTiers(){
 const [forums,setForums]=useState([]),[message,setMessage]=useState("");
 const reload=()=>axios.get(API+"/auth/forums",{headers:headers()}).then(r=>setForums(r.data)).catch(()=>setMessage("Nuk u lexuan forumet."));
 useEffect(reload,[]);
 const setTier=async(id,required_plan)=>{
  try{await axios.put(API+"/core/forums/"+id+"/tier",{required_plan},{headers:headers()});setMessage("Niveli i forumit u ruajt.");reload();}
  catch(e){setMessage("Ndryshimi i nivelit dështoi.");}
 };
 return <main className="p1-wrap" style={{maxWidth:"none"}}><h1>Abonimet e Forumeve</h1>
 <p className="p1-muted">Zgjidh planin minimal për çdo forum. Forumet private kërkojnë edhe anëtarësi/ftesë.</p>
 <div className="p1-card p1-table-wrap"><table className="p1-table"><thead><tr><th>Forumi</th><th>Lënda</th><th>Privat</th><th>Abonimi minimal</th></tr></thead><tbody>
 {forums.map(f=><tr key={f.id}><td><strong>{f.title}</strong></td><td>{f.subject}</td><td>{f.is_private?"Po":"Jo"}</td><td><select className="p1-select" value={f.required_plan||"basic"} onChange={e=>setTier(f.id,e.target.value)}>
 <option value="basic">Basic</option><option value="medium">Medium</option><option value="premium">Premium</option></select></td></tr>)}</tbody></table></div>
 {message&&<p className="p1-note" role="status">{message}</p>}</main>;
}
