import {useLanguage} from "./context/LanguageContext";
import {PublishingHeader} from "./components/PublishingWorkspace";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { SITE_SECTIONS, SECTION_DEFAULTS } from "./siteContentConfig";
import RichInlineText from "./components/RichInlineText";
import { useAuth } from "./context/AuthContext";
import "./siteContent.css";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const ENDPOINT = API + "/experience";
const EMPTY = {title_sq:"",title_en:"",subtitle_sq:"",subtitle_en:"",image_url:"",button_url:""};
const normalized = (block) => Object.fromEntries(Object.keys(EMPTY).map(field => [field, typeof block?.[field] === "string" ? block[field] : ""]));

function errorText(error, tr) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(item => item.msg || tr("Gabim", "Error")).join("; ");
  return tr("Operacioni dështoi. Kontrollo lidhjen me API-në.", "Operation failed. Check the API connection.");
}

export default function AdminSiteEditor() {
  const {lang: uiLang} = useLanguage();
  const tr = (sq,en) => uiLang === "en" ? en : sq;
  const { currentUser, authLoading } = useAuth();
  const canEdit = !!(currentUser?.is_superuser || ["admin","super_admin"].includes(currentUser?.role));
  const [stored, setStored] = useState({});
  const [drafts, setDrafts] = useState({});
  const [selected, setSelected] = useState(SITE_SECTIONS[0].key);
  const [lang, setLang] = useState("sq");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState(false),[retry,setRetry]=useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const labelsEn = {"Kryefaqja · Hero":"Homepage · Hero","Hyrja · Eksploro platformën":"Introduction · Explore the platform","Karta · Problema e Javës":"Card · Problem of the Week","Karta · Forumet":"Card · Forums","Karta · Materialet & Testet":"Card · Materials & Tests","Karta · Suport":"Card · Support","Olimpiadat":"Olympiads","Komuniteti":"Community","Mentorët & Seancat":"Mentors & sessions","Partneri SPARK":"SPARK partner","Thirrja për regjistrim":"Registration call to action","Eksploro":"Explore","Problema e Javës":"Problem of the Week","Forumet":"Forums","Materialet & Testet":"Materials & Tests","Seancat Individuale":"Individual sessions","Pyetjet e shpeshta":"FAQ","Suporti":"Support","Aplikimi si Mësues":"Teacher application"};
  const sectionLabel = item => uiLang === "en" ? labelsEn[item.label] || item.label : item.label;
  const section = SITE_SECTIONS.find(item => item.key === selected) || SITE_SECTIONS[0];
  const current = normalized(drafts[selected] || stored[selected]);
  const defaults = SECTION_DEFAULTS[selected] || EMPTY;
  const dirty = JSON.stringify(normalized(stored[selected])) !== JSON.stringify(current);
  const hasContent = Object.values(normalized(stored[selected])).some(v => typeof v === "string" && v.trim());
  const sections = useMemo(() => SITE_SECTIONS.filter(item =>
    (item.label + " " + labelsEn[item.label] + " " + item.key + " " + item.group).toLowerCase().includes(filter.toLowerCase().trim())
  ), [filter]);

  useEffect(() => {
    let live = true;setLoading(true);setLoadError(false);
    axios.get(ENDPOINT + "/content")
      .then(r => {if(live) {setStored(r.data || {}); setLoading(false);}})
      .catch(() => {if(live) {setLoadError(true);setStatus({error:true,text:tr("Nuk u lexua përmbajtja e website-it.","Could not load website content.")});setLoading(false);}});
    return () => {live = false;};
  }, [retry]);

  useEffect(()=>{
    if(!dirty)return;
    const warn=event=>{event.preventDefault();event.returnValue="";};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);

  const change = (field, value) => {
    setDrafts(prev => ({...prev,[selected]:{...current,[field]:value}}));
    setStatus(null);
  };
  const navigateSection = (key) => {
    if (busy) return;
    if (dirty) {
      if (!window.confirm(tr("Ke ndryshime të paruajtura. Vazhdo pa i ruajtur?","You have unsaved changes. Continue without saving?"))) return;
      setDrafts(prev=>{const next={...prev};delete next[selected];return next;});
    }
    setSelected(key);
    setStatus(null);
  };
  const save = async () => {
    if(loading||loadError||busy)return;
    setBusy(true); setStatus(null);
    try {
      await axios.put(ENDPOINT + "/admin/content/" + selected, current,
        {headers:{Authorization:"Bearer " + localStorage.getItem("token")}});
      setStored(prev => ({...prev,[selected]:current}));
      setDrafts(prev => {
        const copy = {...prev};
        delete copy[selected];
        return copy;
      });
      setStatus({success:true,text:tr("U ruajt me sukses. Ndryshimet janë publike në këtë mjedis.","Saved successfully. Changes are public in this environment.")});
    } catch (e) {
      setStatus({error:true,text:errorText(e,tr)});
    } finally {
      setBusy(false);
    }
  };
  const restore = () => {
    if (!window.confirm(tr("Të rikthehen tekstet dhe imazhi i parazgjedhur për këtë seksion? Ruajtja bëhet vetëm pasi të klikosh Ruaj.","Restore the default text and image for this section? Changes are only saved after clicking Save."))) return;
    setDrafts(prev => ({...prev,[selected]:{...EMPTY}}));
    setStatus({text:tr("U përgatit rikthimi. Kliko Ruaj ndryshimet për ta konfirmuar.","Defaults are ready to restore. Click Save changes to confirm.")});
  };
  const title = current["title_" + lang] || defaults["title_" + lang] || section.label;
  const subtitle = current["subtitle_" + lang] || defaults["subtitle_" + lang] || "";

  if (authLoading) return <main className="site-editor"><p className="site-editor__status">{tr("Duke verifikuar aksesin...","Checking access...")}</p></main>;
  if (!canEdit) return <main className="site-editor"><h1>{tr("Përmbajtja e Website-it","Website content")}</h1><p role="alert">{tr("Vetëm Admin dhe Super Admin mund të ndryshojnë këtë seksion.","Only administrators and super administrators may edit this section.")}</p></main>;
  return <main className="site-editor publishing-workspace">
    <PublishingHeader eyebrow={tr("Faqja / CMS", "Website / CMS")} title={tr("Përmbajtja e Website-it","Website content")} description={tr("Zgjidh faqen dhe gjuhën, redakto tekstin ose fotografinë dhe kontrollo pamjen paraprake para ruajtjes.","Choose a page and language, edit its text or image and review the preview before saving.")} to={section.url} linkLabel={tr("Shiko faqen","View page")} />
    <div className="site-editor__layout">
      <nav className="site-editor__nav" aria-label={tr("Seksionet e website-it","Website sections")}>
        <label className="site-editor__hint" htmlFor="site-editor-search">{tr("Kërko një seksion","Find a section")}</label>
        <input id="site-editor-search" value={filter} onChange={e=>setFilter(e.target.value)}
          placeholder={tr("p.sh. Mentorët, Forumet...","e.g. Mentors, Forums...")} />
        {["Kreu","Faqet"].map(group => {
          const items = sections.filter(item=>item.group===group);
          if (!items.length) return null;
          return <div key={group}>
            <div className="site-editor__nav-section">{group==="Kreu"?tr("Faqja kryesore","Homepage"):tr("Faqet e platformës","Platform pages")}</div>
            {items.map(item => <button key={item.key} type="button"
              className="site-editor__item" aria-current={selected===item.key?"true":undefined}
              onClick={()=>navigateSection(item.key)}>
              <span>{sectionLabel(item)}</span>
              {stored[item.key] && <span className="site-editor__modified-dot" aria-label={tr("I personalizuar","Customized")} title={tr("I personalizuar","Customized")} />}
            </button>)}
          </div>;
        })}
        {!sections.length && <p className="site-editor__hint">{tr("Nuk u gjet asnjë seksion.","No matching sections.")}</p>}
      </nav>

      <div className="site-editor__workspace">
        <section className="site-editor__panel" aria-label={tr("Redaktimi i seksionit","Section editor")}>
          <div className="site-editor__top">
            <div><h2>{sectionLabel(section)}</h2><div className="site-editor__meta">{tr("Seksioni:", "Section:")} {section.key} · <Link to={section.url} target="_blank" rel="noopener noreferrer">{tr("Shiko faqen","View page")}</Link></div></div>
            <div className="site-editor__language" aria-label={tr("Gjuha e redaktimit","Content editing language")}>
              <button type="button" aria-pressed={lang==="sq"} onClick={()=>setLang("sq")}>SQ</button>
              <button type="button" aria-pressed={lang==="en"} onClick={()=>setLang("en")}>EN</button>
            </div>
          </div>
          {loading?<p className="site-editor__status">{tr("Duke ngarkuar...","Loading...")}</p>:loadError?<div role="alert"><p>{tr("Përmbajtja nuk u ngarkua. Provo përsëri para redaktimit.","Content could not load. Retry before editing.")}</p><button onClick={()=>setRetry(n=>n+1)}>{tr("Provo përsëri","Retry")}</button></div>:
          <form onSubmit={e=>{e.preventDefault();save();}}>
            <div className="publishing-cms-columns"><fieldset disabled={busy} className="site-editor__fields publishing-cms-fields">
              <label>
                {tr("Titulli","Title")} ({lang.toUpperCase()})
                <input maxLength={250} value={current["title_"+lang]}
                  onChange={e=>change("title_"+lang,e.target.value)}
                  placeholder={defaults["title_"+lang] || tr("Titulli","Title")} />
                <span className="site-editor__hint">{tr("Lëre bosh për tekstin e parazgjedhur.","Leave empty to use the default text.")}</span>
              </label>
              <label>
                {tr("Përshkrimi","Description")} ({lang.toUpperCase()})
                <textarea rows={4} maxLength={2500} value={current["subtitle_"+lang]}
                  onChange={e=>change("subtitle_"+lang,e.target.value)}
                  placeholder={defaults["subtitle_"+lang] || tr("Përshkrimi","Description")} />
                <span className="site-editor__hint">{selected.startsWith("home_founder_")
                  ?tr("Rreshti i parë është biografia; çdo rresht tjetër shfaqet si arritje në listë.","The first line is the biography; each additional line appears as an achievement.")
                  :tr("Mbështeten lidhje si [Lexo më shumë](/explore) dhe **bold**.","Links such as [Read more](/explore) and **bold** are supported.")}</span>
              </label>
              {section.image && <>
                <div className="site-editor__media">
                  <label>{tr("Lidhja e fotografisë (HTTPS)","Image URL (HTTPS)")}<input type="url" placeholder="https://..." value={current.image_url}
                      onChange={e=>change("image_url",e.target.value)}/>
                  </label>
                  <div className="site-editor__media-preview">
                    {current.image_url ? <img src={current.image_url} alt={tr("Pamje e fotografisë","Image preview")} /> :
                      <span>{tr("Pa foto të personalizuar","No custom image")}</span>}
                  </div>
                </div>
                {current.image_url && <button className="site-editor__secondary" type="button"
                  onClick={()=>change("image_url","")}>{tr("Hiq fotografinë","Remove image")}</button>}
              </>}
              {section.link && <label>{tr("Lidhja e butonit","Button link")}<input value={current.button_url} placeholder="/explore" maxLength={500}
                  onChange={e=>change("button_url",e.target.value)} />
                <span className="site-editor__hint">{tr("Vetëm lidhje të brendshme që fillojnë me /.","Only internal links starting with /.")}</span>
              </label>}
            </fieldset>
            <aside className="site-editor__preview">
              <span className="site-editor__preview-label">{tr("Pamja paraprake","Preview")} · {lang.toUpperCase()}</span>
              <h3><RichInlineText text={title} /></h3>
              {subtitle && <p><RichInlineText text={subtitle} /></p>}
            </aside></div>
            <div className="site-editor__actions">
              <button className="site-editor__save" type="submit" disabled={busy || !dirty}>
                {busy?tr("Duke ruajtur...","Saving..."):tr("Ruaj ndryshimet","Save changes")}
              </button>
              <button type="button" className="site-editor__secondary" disabled={busy}
                onClick={restore}>{tr("Rikthe parazgjedhjet","Restore defaults")}</button>
              {hasContent && <span className="site-editor__hint">{tr("Ky seksion ka ndryshime të ruajtura.","This section has saved customizations.")}</span>}
            </div>
          </form>}
          {status && <p className="site-editor__status" role={status.error?"alert":"status"}
            data-success={status.success?"true":undefined}>{status.text}</p>}
        </section>
      </div>
    </div>
  </main>;
}
