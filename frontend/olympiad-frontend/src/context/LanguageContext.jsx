import React,{createContext,useContext,useEffect,useMemo,useState} from "react";
import axios from "axios";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
const Context=createContext(null);
const TEXT={
 sq:{
  more:"Më shumë",feed:"Komuniteti",subjects:"Lëndët",profile:"Profili im",family:"Prindër & Raporte",settings:"Cilësimet",admin:"Paneli Admin",logout:"Dil",
  home:"Kreu",explore:"Eksploro",weekly:"Problema e Javës",
  courses:"Materiale & Teste",forums:"Forumet",login:"Hyr",signup:"Regjistrohu",support:"Suport",faq:"Pyetje të shpeshta",
  apply:"Bëhu mësues",teacher:"Paneli i Mësuesit",discover:"Zbulo platformën",learn:"Mëso më shumë",
  heroLabel:"Mëso. Zgjidh. Shkëlqe.",heroTitle:"Problemet e mëdha fillojnë me kuriozitet.",
  heroDesc:"Një hapësirë për mendjet që kërkojnë më shumë. Probleme olimpike, mentorim, teste dhe një komunitet që të shtyn përpara.",
  start:"Fillo falas",meet:"Njihu me komunitetin",community:"Njerëzit pas problemeve",
  competition:"Përgatitu për sfidën e radhës",competitionDesc:"Nga ushtrimi i parë te gara ndërkombëtare: zhvillo logjikën dhe qëndrueshmërinë tënde.",
  partner:"Partner zyrtar",contact:"Na kontakto",popular:"Gjej sfidën tënde të radhës",allRights:"Të gjitha të drejtat e rezervuara.",
  submitted:"U dërgua me sukses.",error:"Operacioni dështoi.",send:"Dërgo",name:"Emri",email:"Email",
 },
 en:{
  more:"More",feed:"Community",subjects:"Subjects",profile:"My Profile",family:"Parents & Reports",settings:"Settings",admin:"Admin Panel",logout:"Log out",
  home:"Home",explore:"Explore",weekly:"Problem of the Week",
  courses:"Materials & Tests",forums:"Forums",login:"Log in",signup:"Sign up",support:"Support",faq:"FAQ",
  apply:"Become a teacher",teacher:"Teacher workspace",discover:"Explore platform",learn:"Learn more",
  heroLabel:"Learn. Solve. Excel.",heroTitle:"Big ideas start with curiosity.",
  heroDesc:"A space for students who want to go further: olympiad problems, mentoring, tests and a community of ambitious learners.",
  start:"Start free",meet:"Meet our community",community:"The people behind the problems",
  competition:"Prepare for your next challenge",competitionDesc:"From your first problem to international competition: build reasoning and resilience.",
  partner:"Official partner",contact:"Contact us",popular:"Find your next challenge",allRights:"All rights reserved.",
  submitted:"Submitted successfully.",error:"Something went wrong.",send:"Send",name:"Name",email:"Email",
 }
};
export function LanguageProvider({children}){
 const [lang,setLang]=useState(()=>localStorage.getItem("olimpiada_language")==="en"?"en":"sq");
 useEffect(()=>{localStorage.setItem("olimpiada_language",lang);document.documentElement.lang=lang;},[lang]);
 useEffect(()=>{
   const token=localStorage.getItem("token");if(!token)return;
   axios.get(API+"/experience/language",{headers:{Authorization:"Bearer "+token}})
    .then(r=>{if(["sq","en"].includes(r.data.language))setLang(r.data.language);}).catch(()=>{});
 },[]);
 const chooseLanguage=(next)=>{
   setLang(next);
   const token=localStorage.getItem("token");if(!token)return;
   axios.put(API+"/experience/language",{language:next},
      {headers:{Authorization:"Bearer "+token}}).catch(()=>{});
 };
 const value=useMemo(()=>({lang,setLang:chooseLanguage,t:(key)=>TEXT[lang][key]||key}),[lang]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage(){const ctx=useContext(Context);if(!ctx)throw Error("LanguageProvider missing");return ctx;}
export function LanguageSwitch(){const {lang,setLang}=useLanguage();return <div className="p3-languages" aria-label="Language / Gjuha">
 <button aria-pressed={lang==="sq"} onClick={()=>setLang("sq")} type="button" title="Shqip">🇦🇱 SQ</button>
 <button aria-pressed={lang==="en"} onClick={()=>setLang("en")} type="button" title="English">🇬🇧 EN</button>
 </div>;}
