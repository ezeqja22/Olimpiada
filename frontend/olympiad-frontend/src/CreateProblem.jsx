/* eslint-disable react-hooks/exhaustive-deps */
// src/CreateProblem.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import MathEditor from "./MathEditor";
import VisualMathEditor from "./components/VisualMathEditor";
import "./MathEditor.css";
import "./ProblemWorkspace.css";
import MathRenderer from "./MathRenderer";
import Layout from "./components/Layout";
import Card from "./components/Card";
import { useToast } from "./components/ToastProvider";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "./designSystem";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const secondaryColor = colors.secondary || colors.primary;

function CreateProblem() {
  const [showPreview, setShowPreview] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    level: "",
    year: "",
  });

  const [tags, setTags] = useState([""]);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [mathEditorTarget, setMathEditorTarget] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftId,setSavedDraftId]=useState(()=>new URLSearchParams(location.search).get("draft"));
  const savedSnapshot=useRef(null);
  const allowLeave=useRef(false);
  const [cursorIndex, setCursorIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const imageInputRef = useRef(null);

  const { showToast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const subjectParam = urlParams.get("subject");
    const draftId = urlParams.get("draft");

    if (subjectParam) {
      setFormData((prev) => ({
        ...prev,
        subject: ["Mathematics","Physics","Chemistry","Biology","Computer Science","Other"].find(s=>s.toLowerCase().replace(/\s+/g,"-")===subjectParam.toLowerCase().replace(/\s+/g,"-"))||subjectParam,
      }));
    }

    if (draftId) {
      loadDraft(draftId);
    }
  }, [location]);

  const snapshot = JSON.stringify({formData,tags});
  useEffect(()=>{if(savedSnapshot.current===null)savedSnapshot.current=snapshot;},[snapshot]);
  useEffect(()=>{
    const dirty=()=>!allowLeave.current&&(snapshot!==savedSnapshot.current||images.length>0);
    const before=e=>{if(dirty()){e.preventDefault();e.returnValue=""}};
    const link=e=>{const a=e.target.closest?.('a[href]');if(!a||a.target==='_blank'||e.ctrlKey||e.metaKey||!dirty())return;if(!window.confirm('You have unsaved changes. Leave this page?')){e.preventDefault();e.stopPropagation();}};
    window.addEventListener('beforeunload',before);document.addEventListener('click',link,true);
    return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('click',link,true)};
  },[snapshot,images]);
  const loadDraft = async (draftId) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        showToast("Please log in to load draft", "error");
        return;
      }

      const response = await axios.get(`${API_URL}/auth/drafts/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const draft = response.data;
      setSavedDraftId(draft.id);
      savedSnapshot.current=JSON.stringify({formData:{title:draft.title||"",description:draft.description||"",subject:draft.subject||"",level:draft.level||"",year:draft.year?String(draft.year):""},tags:draft.tags?.split(",").map(t=>t.trim()).filter(Boolean)||[""]});

      setFormData({
        title: draft.title || "",
        description: draft.description || "",
        subject: draft.subject || "",
        level: draft.level || "",
        year: draft.year ? draft.year.toString() : "",
      });

      if (draft.tags) {
        const draftTags = draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);

        setTags(draftTags.length > 0 ? draftTags : [""]);
      }

      showToast(
        "Draft loaded successfully! You can now finish and publish your problem.",
        "success",
      );
    } catch (error) {
      console.error("Error loading draft:", error);
      showToast(
        error.response?.data?.detail || "Failed to load draft",
        "error",
      );
    }
  };

  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get("from");

    if (from?.startsWith("/") && !from.startsWith("//") && !from.includes("\\")) {
      return from;
    }

    const subject = searchParams.get("subject");

    if (subject) {
      return `/subject/${encodeURIComponent(subject.toLowerCase().replace(/\s+/g,"-"))}`;
    }

    return "/feed";
  };

  const handleInputFocus = (e) => {
    e.currentTarget.style.borderColor = colors.primary;
    e.currentTarget.style.backgroundColor = "white";
    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary}20`;
  };

  const handleInputBlur = (e) => {
    e.currentTarget.style.borderColor = colors.gray[300];
    e.currentTarget.style.backgroundColor = colors.gray[50];
    e.currentTarget.style.boxShadow = "none";
  };

  const handleMathButtonEnter = (e) => {
    e.currentTarget.style.backgroundColor = `${colors.primary}10`;
    e.currentTarget.style.borderColor = colors.primary;
    e.currentTarget.style.color = colors.primary;
  };

  const handleMathButtonLeave = (e) => {
    e.currentTarget.style.backgroundColor = colors.gray[50];
    e.currentTarget.style.borderColor = colors.gray[300];
    e.currentTarget.style.color = colors.primary;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openMathEditor = (target) => {
    let ref = null;

    if (target === "title") ref = titleRef.current;
    if (target === "description") ref = descriptionRef.current;

    if (ref) {
      setCursorIndex({
        start: ref.selectionStart,
        end: ref.selectionEnd,
      });
    }

    setMathEditorTarget(target);
    setShowMathEditor(true);
  };

  const handleMathInsert = (mathContent) => {
    if (mathEditorTarget && cursorIndex) {
      const text = formData[mathEditorTarget];

      const newText =
        text.slice(0, cursorIndex.start) +
        mathContent +
        text.slice(cursorIndex.end);

      setFormData({
        ...formData,
        [mathEditorTarget]: newText,
      });
    }

    closeMathEditor();
  };

  const closeMathEditor = () => {
    setShowMathEditor(false);
    setMathEditorTarget(null);
    setCursorIndex(null);
  };

  const handleTagChange = (index, value) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  const addTag = () => {
    if (tags.length < 5) {
      setTags([...tags, ""]);
    } else {
      showToast("Maximum 5 tags allowed", "error");
    }
  };

  const removeTag = (index) => {
    if (tags.length > 1) {
      setTags(tags.filter((_, i) => i !== index));
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    if (images.length + files.length > 10) {
      showToast(
        "Maximum 10 images allowed. Please select fewer images.",
        "error",
      );
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        showToast(`${file.name} is not an image file`, "error");
        return false;
      }

      return true;
    });

    setImages([...images, ...validFiles]);

    if (event.target) {
      event.target.value = "";
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (savingDraft) return;
    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.subject
    ) {
      showToast(
        "Please fill in at least title, description, and subject to save as draft",
        "error",
      );
      return;
    }

    setSavingDraft(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        showToast("Please log in to save a draft", "error");
        return;
      }

      const draftData = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        level: formData.level || "Any Level",
        year: formData.year ? parseInt(formData.year) : null,
        tags: tags.filter((tag) => tag.trim()).join(", "),
      };

      const response = await axios({method:savedDraftId?"put":"post",url:`${API_URL}/auth/drafts${savedDraftId?"/"+savedDraftId:""}`,data:draftData,
        headers: { Authorization: `Bearer ${token}` },
      });

      setSavedDraftId(response.data.id);
      savedSnapshot.current=snapshot;
      showToast(images.length ? "Text draft saved. Selected images remain here for publishing; drafts do not store image files. Keep this page open or attach them again when reopening." : "Draft saved successfully!", images.length?"warning":"success");
    } catch (error) {
      console.error("Error saving draft:", error);
      showToast(
        error.response?.data?.detail || "Failed to save draft",
        "error",
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validTags = tags.filter((tag) => tag.trim() !== "");

      if (validTags.length > 5) {
        showToast("Maximum 5 tags allowed", "error");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");

      if (!token) {
        showToast("Please log in to create a problem", "error");
        setLoading(false);
        return;
      }

      const requestData = {
        ...formData,
        level: formData.level || "Any Level",
        tags: validTags.join(", "),
        year: formData.year ? parseInt(formData.year) : null,
      };

      const response = await axios.post(
        `${API_URL}/auth/problems/`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let imageUploadFailed = false;

      if (images.length > 0) {
        setUploadingImages(true);

        try {
          for (const file of images) {
            const imageFormData = new FormData();
            imageFormData.append("file", file);

            await axios.post(
              `${API_URL}/auth/problems/${response.data.id}/images`,
              imageFormData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data",
                },
              },
            );
          }
        } catch (error) {
          console.error("Error uploading images:", error);
          console.error("Error response:", error.response?.data);
          console.error("Error status:", error.response?.status);
          imageUploadFailed = true;
        } finally {
          setUploadingImages(false);
        }
      }

      const urlParams = new URLSearchParams(location.search);
      const draftId = savedDraftId;

      if (draftId) {
        try {
          await axios.delete(`${API_URL}/auth/drafts/${draftId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (error) {
          console.error("Error deleting draft after publishing:", error);
        }
      }

      if (imageUploadFailed) {
        showToast(
          "Problem created successfully, but some images failed to upload. You can add them later by editing the problem.",
          "error",
        );
      } else {
        showToast("Problem created successfully!", "success");
      }

      allowLeave.current=true;
      navigate(getRedirectPath());
    } catch (error) {
      showToast(
        "Error creating problem: " +
          (error.response?.data?.detail || error.message),
        "error",
      );
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  return <Layout showHomeButton={true}>
    <div className="problem-workspace">
      <header className="problem-workspace-heading"><div><span>PROBLEM WORKSPACE</span><h1>{savedDraftId?'Continue your draft':'Create New Problem'}</h1><p>Write the statement, add formulas and choose where it belongs.</p></div><div className="problem-workspace-actions"><button type="button" onClick={handleSaveDraft} disabled={savingDraft}>{savingDraft?'Saving...':'Save as Draft'}</button><button type="submit" form="problem-workspace-form" disabled={loading||uploadingImages}>{uploadingImages?'Uploading Images...':loading?'Creating...':'Create Problem'}</button></div></header>
      <form id="problem-workspace-form" className="problem-workspace-grid" onSubmit={handleSubmit}>
       <section className="problem-workspace-writing" aria-label="Problem statement"><div className="problem-workspace-section-label"><span>01 / Statement</span><button type="button" aria-pressed={showPreview} onClick={()=>setShowPreview(!showPreview)}>{showPreview?'Back to writing':'Preview mathematics'}</button></div>
        <label htmlFor="problem-title">Title <span aria-hidden="true">*</span></label><div className="problem-workspace-title"><input ref={titleRef} id="problem-title" name="title" value={formData.title} onChange={handleChange} required placeholder="Give your problem a clear title"/><button type="button" onClick={()=>openMathEditor('title')} title="Insert LaTeX formula">∑ Formula</button></div>
        <div className="problem-workspace-canvas"><label>Description <span aria-hidden="true">*</span></label><div hidden={showPreview}><VisualMathEditor value={formData.description} onChange={description=>setFormData(prev=>({...prev,description}))} placeholder="Shkruaj problemin dhe shto formulat vizualisht..." minHeight={340}/></div>{showPreview&&<div className="problem-workspace-preview"><MathRenderer text={formData.description||'Your statement preview will appear here.'}/></div>}</div>
        <div className="problem-workspace-attachments"><div><h2>Figures & images</h2><p>Add diagrams that help explain the problem. Up to 10 images.</p></div><label className="problem-workspace-upload">+ Add images<input ref={imageInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload}/></label></div>
        {images.length>0&&<div className="problem-workspace-images">{images.map((file,index)=><figure key={`${file.name}-${index}`}><DraftImage file={file}/><figcaption>{file.name}</figcaption><button type="button" onClick={()=>removeImage(index)} aria-label={'Remove image '+(index+1)}>Remove</button></figure>)}</div>}
       </section>
       <aside className="problem-workspace-details"><span className="problem-workspace-section-label">02 / Details</span><h2>Help others find it</h2>
        <label htmlFor="problem-subject">Subject *</label><select id="problem-subject" name="subject" value={formData.subject} onChange={handleChange} required><option value="">Select Subject</option>{['Mathematics','Physics','Chemistry','Biology','Computer Science','Other'].map(value=><option key={value}>{value}</option>)}</select>
        <label htmlFor="problem-level">Level</label><input id="problem-level" name="level" value={formData.level} onChange={handleChange} placeholder="e.g. IMO, National..."/>
        <label htmlFor="problem-year">Year</label><input id="problem-year" name="year" type="number" value={formData.year} onChange={handleChange} placeholder="e.g. 2024" min="1900" max="2099"/>
        <fieldset><legend>Tags (Optional)</legend>{tags.map((tag,index)=><div className="problem-workspace-tag" key={index}><input aria-label={'Tag '+(index+1)} value={tag} onChange={e=>handleTagChange(index,e.target.value)} placeholder="Add tag..."/>{tags.length>1&&<button type="button" onClick={()=>removeTag(index)} aria-label={'Remove tag '+(index+1)}>×</button>}</div>)}{tags.length<5&&<button type="button" onClick={addTag}>+ Add Tag</button>}</fieldset>
        <p className="problem-workspace-note">Drafts stay private. Publishing makes the problem available to the community.</p><button className="problem-workspace-cancel" type="button" onClick={()=>navigate(-1)}>Cancel</button>
       </aside>
      </form>
    </div>
    <MathEditor isOpen={showMathEditor} onClose={closeMathEditor} onInsert={handleMathInsert}/>
  </Layout>;
}
function DraftImage({file}) {
 const [url,setUrl]=useState('');
 useEffect(()=>{const value=URL.createObjectURL(file);setUrl(value);return()=>URL.revokeObjectURL(value)},[file]);
 return <img src={url||undefined} alt={file.name}/>;
}

const inputStyle = {
  flex: 1,
  padding: "12px 16px",
  border: `1px solid ${colors.gray[300]}`,
  borderRadius: borderRadius.md,
  fontSize: "16px",
  outline: "none",
  backgroundColor: colors.gray[50],
  transition: "all 0.2s ease",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: spacing.xs,
  fontWeight: "700",
  fontSize: "15px",
  color: colors.dark,
};

const fieldGroupStyle = {
  display: "flex",
  flexDirection: "column",
};

const mathButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  padding: "9px 14px",
  backgroundColor: colors.gray[50],
  color: colors.primary,
  border: `1px solid ${colors.gray[300]}`,
  borderRadius: borderRadius.md,
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "700",
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
  boxSizing: "border-box",
};

const tagContainerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
  padding: spacing.md,
  border: `1px solid ${colors.gray[300]}`,
  borderRadius: borderRadius.md,
  backgroundColor: colors.gray[50],
  minHeight: "58px",
  alignItems: "center",
};

const tagInputStyle = {
  padding: "8px 34px 8px 12px",
  border: `1px solid ${colors.gray[300]}`,
  borderRadius: "999px",
  fontSize: "14px",
  width: "135px",
  outline: "none",
  backgroundColor: "white",
  boxSizing: "border-box",
};

const removeTagButtonStyle = {
  position: "absolute",
  right: "8px",
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "none",
  color: colors.gray[500],
  cursor: "pointer",
  fontSize: "18px",
  fontWeight: "bold",
  lineHeight: 1,
};

const addTagButtonStyle = {
  padding: "8px 16px",
  backgroundColor: "white",
  border: `1px solid ${colors.gray[300]}`,
  borderRadius: "999px",
  color: colors.dark,
  fontSize: "14px",
  cursor: "pointer",
  fontWeight: "700",
  transition: "all 0.2s ease",
};

const dropzoneStyle = {
  border: `2px dashed ${colors.gray[300]}`,
  borderRadius: borderRadius.lg,
  padding: "32px",
  textAlign: "center",
  backgroundColor: colors.gray[50],
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  transition: "all 0.2s ease",
};

const previewGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.md,
  marginTop: spacing.md,
};

const imagePreviewStyle = {
  position: "relative",
  width: "96px",
  height: "96px",
  borderRadius: borderRadius.md,
  overflow: "hidden",
  border: `1px solid ${colors.gray[200]}`,
  boxShadow: shadows.sm,
};

const removeImageButtonStyle = {
  position: "absolute",
  top: "5px",
  right: "5px",
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  backgroundColor: "rgba(0,0,0,0.7)",
  color: "white",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "15px",
  fontWeight: "700",
  lineHeight: 1,
};

const actionContainerStyle = {
  display: "flex",
  gap: spacing.md,
  marginTop: spacing.lg,
  borderTop: `1px solid ${colors.gray[200]}`,
  paddingTop: spacing.xl,
};

const primaryButtonStyle = {
  flex: 1,
  padding: "16px",
  background: `linear-gradient(135deg, ${colors.primary}, ${secondaryColor})`,
  color: "white",
  border: "none",
  borderRadius: borderRadius.md,
  fontSize: "16px",
  fontWeight: "800",
  boxShadow: shadows.md,
  transition: "all 0.2s ease",
};

const cancelButtonStyle = {
  padding: "16px 24px",
  backgroundColor: "transparent",
  color: colors.gray[600],
  border: "none",
  borderRadius: borderRadius.md,
  fontSize: "16px",
  fontWeight: "700",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const codeStyle = {
  backgroundColor: colors.gray[100],
  padding: "2px 6px",
  borderRadius: borderRadius.sm,
  color: colors.primary,
  fontWeight: "700",
};

export default CreateProblem;
