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

function errorText(error) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(item => item.msg || "Gabim").join("; ");
  return "Operacioni dështoi. Kontrollo lidhjen me API-në.";
}

export default function AdminSiteEditor() {
  const { currentUser, authLoading } = useAuth();
  const canEdit = !!(currentUser?.is_superuser || ["admin","super_admin"].includes(currentUser?.role));
  const [stored, setStored] = useState({});
  const [drafts, setDrafts] = useState({});
  const [selected, setSelected] = useState(SITE_SECTIONS[0].key);
  const [lang, setLang] = useState("sq");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const section = SITE_SECTIONS.find(item => item.key === selected) || SITE_SECTIONS[0];
  const current = normalized(drafts[selected] || stored[selected]);
  const defaults = SECTION_DEFAULTS[selected] || EMPTY;
  const dirty = JSON.stringify(normalized(stored[selected])) !== JSON.stringify(current);
  const hasContent = Object.values(normalized(stored[selected])).some(v => typeof v === "string" && v.trim());
  const sections = useMemo(() => SITE_SECTIONS.filter(item =>
    (item.label + " " + item.key + " " + item.group).toLowerCase().includes(filter.toLowerCase().trim())
  ), [filter]);

  useEffect(() => {
    let live = true;
    axios.get(ENDPOINT + "/content")
      .then(r => {if(live) {setStored(r.data || {}); setLoading(false);}})
      .catch(() => {if(live) {setStatus({error:true,text:"Nuk u lexua përmbajtja e website-it."});setLoading(false);}});
    return () => {live = false;};
  }, []);

  const change = (field, value) => {
    setDrafts(prev => ({...prev,[selected]:{...current,[field]:value}}));
    setStatus(null);
  };
  const navigateSection = (key) => {
    if (busy) return;
    if (dirty) {
      if (!window.confirm("Ke ndryshime të paruajtura. Vazhdo pa i ruajtur?")) return;
      setDrafts(prev=>{const next={...prev};delete next[selected];return next;});
    }
    setSelected(key);
    setStatus(null);
  };
  const save = async () => {
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
      setStatus({success:true,text:"U ruajt me sukses. Ndryshimet janë publike në këtë mjedis."});
    } catch (e) {
      setStatus({error:true,text:errorText(e)});
    } finally {
      setBusy(false);
    }
  };
  const restore = () => {
    if (!window.confirm("Të rikthehen tekstet dhe imazhi i parazgjedhur për këtë seksion? Ruajtja bëhet vetëm pasi të klikosh Ruaj.")) return;
    setDrafts(prev => ({...prev,[selected]:{...EMPTY}}));
    setStatus({text:"U përgatit rikthimi. Kliko Ruaj ndryshimet për ta konfirmuar."});
  };
  const title = current["title_" + lang] || defaults["title_" + lang] || section.label;
  const subtitle = current["subtitle_" + lang] || defaults["subtitle_" + lang] || "";

  if (authLoading) return <main className="site-editor"><p className="site-editor__status">Duke verifikuar aksesin...</p></main>;
  if (!canEdit) return <main className="site-editor"><h1>Përmbajtja e Website-it</h1><p role="alert">Vetëm Admin dhe Super Admin mund të ndryshojnë këtë seksion.</p></main>;
  return <main className="site-editor">
    <h1 className="site-editor__title">Përmbajtja e Website-it</h1>
    <p className="site-editor__lede">
      Ndrysho tekstet në shqip dhe anglisht, fotografitë dhe lidhjet e seksioneve publike.
      Zgjidh një seksion, kontrollo pamjen paraprake dhe ruaj. Për problema, materiale, FAQ dhe
      forume përdor menutë e tyre ekzistuese.
    </p>
    <div className="site-editor__layout">
      <nav className="site-editor__nav" aria-label="Seksionet e website-it">
        <label className="site-editor__hint" htmlFor="site-editor-search">Kërko një seksion</label>
        <input id="site-editor-search" value={filter} onChange={e=>setFilter(e.target.value)}
          placeholder="p.sh. Mentorët, Forumet..." />
        {["Kreu","Faqet"].map(group => {
          const items = sections.filter(item=>item.group===group);
          if (!items.length) return null;
          return <div key={group}>
            <div className="site-editor__nav-section">{group==="Kreu"?"Faqja kryesore":"Faqet e platformës"}</div>
            {items.map(item => <button key={item.key} type="button"
              className="site-editor__item" aria-current={selected===item.key?"true":undefined}
              onClick={()=>navigateSection(item.key)}>
              <span>{item.label}</span>
              {stored[item.key] && <span className="site-editor__modified-dot" aria-label="I personalizuar" title="I personalizuar" />}
            </button>)}
          </div>;
        })}
        {!sections.length && <p className="site-editor__hint">Nuk u gjet asnjë seksion.</p>}
      </nav>

      <div className="site-editor__workspace">
        <section className="site-editor__panel" aria-label="Redaktimi i seksionit">
          <div className="site-editor__top">
            <div><h2>{section.label}</h2><div className="site-editor__meta">Seksioni: {section.key} · <Link to={section.url} target="_blank" rel="noopener noreferrer">Shiko faqen</Link></div></div>
            <div className="site-editor__language" aria-label="Gjuha e redaktimit">
              <button type="button" aria-pressed={lang==="sq"} onClick={()=>setLang("sq")}>SQ</button>
              <button type="button" aria-pressed={lang==="en"} onClick={()=>setLang("en")}>EN</button>
            </div>
          </div>
          {loading?<p className="site-editor__status">Duke ngarkuar...</p>:
          <form onSubmit={e=>{e.preventDefault();save();}}>
            <div className="site-editor__fields">
              <label>
                Titulli ({lang.toUpperCase()})
                <input maxLength={250} value={current["title_"+lang]}
                  onChange={e=>change("title_"+lang,e.target.value)}
                  placeholder={defaults["title_"+lang] || "Titulli"} />
                <span className="site-editor__hint">Lëre bosh për tekstin e parazgjedhur.</span>
              </label>
              <label>
                Përshkrimi ({lang.toUpperCase()})
                <textarea rows={4} maxLength={2500} value={current["subtitle_"+lang]}
                  onChange={e=>change("subtitle_"+lang,e.target.value)}
                  placeholder={defaults["subtitle_"+lang] || "Përshkrimi"} />
                <span className="site-editor__hint">{selected.startsWith("home_founder_")
                  ?"Rreshti i parë është biografia; çdo rresht tjetër shfaqet si arritje në listë."
                  :"Mbështeten lidhje si [Lexo më shumë](/explore) dhe **bold**."}</span>
              </label>
              {section.image && <>
                <div className="site-editor__media">
                  <label>
                    Lidhja e fotografisë (HTTPS)
                    <input type="url" placeholder="https://..." value={current.image_url}
                      onChange={e=>change("image_url",e.target.value)}/>
                  </label>
                  <div className="site-editor__media-preview">
                    {current.image_url ? <img src={current.image_url} alt="Pamje e fotografisë" /> :
                      <span>Pa foto të personalizuar</span>}
                  </div>
                </div>
                {current.image_url && <button className="site-editor__secondary" type="button"
                  onClick={()=>change("image_url","")}>Hiq fotografinë</button>}
              </>}
              {section.link && <label>
                Lidhja e butonit
                <input value={current.button_url} placeholder="/explore" maxLength={500}
                  onChange={e=>change("button_url",e.target.value)} />
                <span className="site-editor__hint">Vetëm lidhje të brendshme që fillojnë me /.</span>
              </label>}
            </div>
            <div className="site-editor__preview">
              <span className="site-editor__preview-label">Pamja paraprake · {lang.toUpperCase()}</span>
              <h3><RichInlineText text={title} /></h3>
              {subtitle && <p><RichInlineText text={subtitle} /></p>}
            </div>
            <div className="site-editor__actions">
              <button className="site-editor__save" type="submit" disabled={busy || !dirty}>
                {busy?"Duke ruajtur...":"Ruaj ndryshimet"}
              </button>
              <button type="button" className="site-editor__secondary" disabled={busy}
                onClick={restore}>Rikthe parazgjedhjet</button>
              {hasContent && <span className="site-editor__hint">Ky seksion ka ndryshime të ruajtura.</span>}
            </div>
          </form>}
          {status && <p className="site-editor__status" role={status.error?"alert":"status"}
            data-success={status.success?"true":undefined}>{status.text}</p>}
        </section>
      </div>
    </div>
  </main>;
}
