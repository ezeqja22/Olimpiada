import React, {useEffect, useState} from "react";
import axios from "axios";
import {API, authHeaders} from "./CompetitionLibrary";
import {PublishingHeader} from "./components/PublishingWorkspace";
import "./phase1.css";
import {useLanguage} from "./context/LanguageContext";

const emptyGuide = {slug: "", name: "", acronym: "", subject: "", scope: "international", audience: "",
  importance: "", history: "", steps: "", source_url: "", local_url: "", published: false};
const emptyDocument = {title: "", author: "", subject: "", discipline: "", level: "",
  kind: "book", description: "", visible: true};
const guideFields = {name: "Emri", acronym: "Shkurtimi", slug: "Identifikuesi në adresë", subject: "Lënda",
  audience: "Kujt i drejtohet", importance: "Rëndësia", history: "Historiku",
  steps: "Rruga e pjesëmarrjes (një hap për rresht)", source_url: "Burimi", local_url: "Njoftimet për Shqipërinë"};
const documentFields = {title: "Titulli", author: "Autori", subject: "Kategoria / lënda",
  discipline: "Disiplina", level: "Niveli", description: "Përshkrimi"};
const limits = {name:250, title:250, author:250, acronym:30, slug:100, audience:180, level:30,
  source_url:500, local_url:500, importance:2500, history:2500, description:3000};

function CatalogueEditor({guides}) {
  const sq = useLanguage().lang === "sq";
  const t = (albanian, english) => sq ? albanian : english;
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const blank = guides ? emptyGuide : emptyDocument;
  const enFields = {name:"Name", acronym:"Acronym", slug:"URL identifier", subject:guides?"Subject":"Category / subject",
    audience:"Audience", importance:"Significance", history:"History", steps:"Participation steps (one per line)",
    source_url:"Source", local_url:"Albanian announcements", title:"Title", author:"Author", discipline:"Discipline", level:"Level", description:"Description"};
  const fields = Object.fromEntries(Object.entries(guides ? guideFields : documentFields).map(([key,label]) => [key,sq?label:enFields[key]]));
  const route = guides ? "/core/olympiads/admin" : "/core/library/admin";
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFeedback(previous => previous?.error ? null : previous);
    axios.get(API + route, {headers: authHeaders(), signal: controller.signal})
      .then(({data}) => setRows(data))
      .catch(() => {
        if (!controller.signal.aborted) setFeedback({error: true, text: t("Lista nuk u ngarkua.", "The list could not be loaded.")});
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [route, reload, sq]);

  function edit(row) {
    setSelected(row?.id ?? null);
    setForm(row ? Object.fromEntries(Object.entries(blank).map(([key, value]) =>
      [key, key === "steps" ? row.steps.join("\n") : row[key] ?? value])) : blank);
    setFeedback(null);
    setFile(null);
    setFileKey(value => value + 1);
  }

  function input(key, value) {
    setForm(previous => {
      const next = {...previous, [key]: value};
      if (guides && key === "acronym" && !selected && (!previous.slug || previous.slug === slugify(previous.acronym))) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const url = API + route + (selected ? "/" + selected : guides ? "" : "/upload");
    const config = {headers: authHeaders()};
    let data = {...form};
    if (guides) {
      data.steps = data.steps.split("\n").map(line => line.trim()).filter(Boolean);
      data.local_url = data.local_url || null;
    } else {
      const payload = new FormData();
      payload.append("metadata", JSON.stringify(data));
      if (file) payload.append("file", file);
      data = payload;
    }
    try {
      const result = await (selected ? axios.put(url, data, config) : axios.post(url, data, config));
      const row = result.data;
      setRows(previous => previous.some(item => item.id === row.id)
        ? previous.map(item => item.id === row.id ? row : item) : [row, ...previous]);
      edit(row);
      setFeedback({text: t("Ndryshimet u ruajtën.", "Changes saved.")});
    } catch (error) {
      const detail = error.response?.data?.detail;
      setFeedback({error: true, text: typeof detail === "string" ? detail : t("Ruajtja dështoi. Kontrollo fushat dhe provo përsëri.", "Could not save. Check the fields and try again.")});
    } finally {
      setSaving(false);
    }
  }

  const visibleField = guides ? "published" : "visible";
  return <main className="publishing-workspace">
    <PublishingHeader title={guides ? t("Olimpiadat", "Olympiads") : t("Biblioteka online", "Online library")} to={guides ? "/olympiads" : "/library"} linkLabel={t("Shiko faqen publike", "View public page")}/>
    <div className="publishing-columns">
      <section className="publishing-section">
        <h2>{selected ? t("Përditëso", "Edit") : guides ? t("Shto olimpiadë", "Add olympiad") : t("Shto dokument", "Add document")}</h2>
        <p className="p1-muted">{t("Teksti i katalogut shfaqet siç e shkruan në të dy gjuhët. Përfshi shqip dhe anglisht kur nevojitet.", "Catalogue text is displayed as entered in both languages. Include Albanian and English where needed.")}</p>
        <form className="p1-form" onSubmit={save}>
          <fieldset disabled={saving} style={{border:0, padding:0, margin:0, display:"grid", gap:14, minWidth:0}}>
            {Object.entries(fields).map(([key, label]) => {
              const many = ["description", "importance", "history", "steps"].includes(key);
              const props = {name:key, className:"p1-input", value:form[key], onChange:event => input(key, event.target.value),
                required:!["description", "local_url", "author"].includes(key), maxLength:limits[key] || 2500};
              return <label key={key}>{label}{many ? <textarea rows={key === "steps" ? 5 : 3} {...props}/>
                : <input {...props} type={key.endsWith("_url") ? "url" : "text"} pattern={key === "slug" ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined}/>}</label>;
            })}
            {guides ? <label>{t("Niveli i garës", "Competition scope")}<select className="p1-select" value={form.scope} onChange={e => input("scope",e.target.value)}>
              <option value="national">{t("Kombëtare", "National")}</option><option value="regional">{t("Rajonale", "Regional")}</option><option value="international">{t("Ndërkombëtare", "International")}</option>
            </select></label> : <>
              <label>{t("Lloji", "Kind")}<select className="p1-select" value={form.kind} onChange={e => input("kind",e.target.value)}>
                <option value="book">{t("Libër", "Book")}</option><option value="magazine">{t("Revistë", "Magazine")}</option><option value="booklet">{t("Broshurë", "Booklet")}</option><option value="training">{t("Material trajnimi", "Training material")}</option>
              </select></label>
              <label>{selected ? t("Zëvendëso PDF-në (opsionale)", "Replace PDF (optional)") : t("Skedari PDF", "PDF file")}<input key={fileKey} type="file" accept="application/pdf,.pdf" required={!selected} onChange={e => setFile(e.target.files[0] || null)}/></label>
            </>}
            <label><input type="checkbox" checked={form[visibleField]} onChange={e => input(visibleField,e.target.checked)}/> {t("Shfaqe në katalog", "Show in catalogue")}</label>
            <div className="p1-row"><button className="p1-btn" type="submit">{saving ? t("Duke ruajtur…", "Saving…") : t("Ruaj", "Save")}</button>
              {selected && <button className="p1-btn alt" type="button" onClick={() => edit(null)}>{t("Shto të re", "Add new")}</button>}</div>
          </fieldset>
        </form>
        {feedback && <p className="p1-note" role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
      </section>
      <section className="publishing-section">
        <h2>{guides ? t("Olimpiadat në katalog", "Olympiads in catalogue") : t("Dokumentet në katalog", "Documents in catalogue")}</h2>
        <button type="button" className="p1-btn alt" disabled={loading} onClick={() => setReload(n => n + 1)}>{t("Ringarko listën", "Reload list")}</button>
        {loading ? <p role="status">{t("Duke ngarkuar…", "Loading…")}</p> : !rows.length && <p>{t("Katalogu është bosh.", "The catalogue is empty.")}</p>}
        <div className="publishing-queue">{rows.map(row => <button type="button" key={row.id} disabled={saving}
          aria-pressed={row.id === selected} onClick={() => edit(row)}>
          <span><strong>{guides ? row.name : row.title}</strong><small>{row.subject} · {row[visibleField] ? t("Publik", "Public") : t("I fshehur", "Hidden")}{!guides && !row.available ? t(" · Pa PDF", " · No PDF") : ""}</small></span>
          <span>{t("Përditëso →", "Edit →")}</span>
        </button>)}</div>
      </section>
    </div>
  </main>;
}

const slugify = value => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const AdminOlympiads = () => <CatalogueEditor guides/>;
export const AdminLibrary = () => <CatalogueEditor guides={false}/>;
