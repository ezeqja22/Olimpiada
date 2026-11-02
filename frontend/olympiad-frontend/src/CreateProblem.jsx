/* eslint-disable react-hooks/exhaustive-deps */
// src/CreateProblem.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import MathEditor from "./MathEditor";
import VisualMathEditor from "./components/VisualMathEditor";
import "./MathEditor.css";
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
        subject: subjectParam,
      }));
    }

    if (draftId) {
      loadDraft(draftId);
    }
  }, [location]);

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

    if (from) {
      return from;
    }

    const subject = searchParams.get("subject");

    if (subject) {
      return `/subject/${encodeURIComponent(subject)}`;
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

      await axios.post(`${API_URL}/auth/drafts`, draftData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Draft saved successfully!", "success");
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
      const draftId = urlParams.get("draft");

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

  return (
    <Layout showHomeButton={true}>
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: isMobile ? spacing.md : "0",
        }}
      >
        <div style={{ marginBottom: spacing.xl, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "999px",
              backgroundColor: `${colors.primary}10`,
              color: colors.primary,
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: spacing.md,
            }}
          >
            <span style={{ fontSize: "16px" }}>✦</span>
            Share with the community
          </div>

          <h1
            style={{
              fontSize: isMobile
                ? typography.fontSize["2xl"]
                : typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.primary,
              marginBottom: spacing.xs,
            }}
          >
            Create New Problem
          </h1>

          <p
            style={{
              color: colors.gray[600],
              fontSize: isMobile ? "0.95rem" : "1.1rem",
              margin: 0,
            }}
          >
            Add a science or olympiad problem with formulas, tags, and images.
          </p>
        </div>

        <Card
          style={{
            padding: isMobile ? spacing.lg : spacing.xl,
            position: "relative",
            borderRadius: borderRadius.lg,
            boxShadow: shadows.md,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "5px",
              background: `linear-gradient(90deg, ${colors.primary}, ${secondaryColor})`,
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: spacing.lg,
            }}
          >
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              style={{
                padding: "10px 18px",
                backgroundColor: "white",
                color: colors.primary,
                border: `1.5px solid ${colors.primary}`,
                borderRadius: borderRadius.md,
                fontSize: "14px",
                fontWeight: "700",
                cursor: savingDraft ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                opacity: savingDraft ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!savingDraft) {
                  e.currentTarget.style.backgroundColor = colors.primary;
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!savingDraft) {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.color = colors.primary;
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {savingDraft ? "Saving..." : "Save as Draft"}
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: spacing.xl,
            }}
          >
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Title <span style={{ color: colors.danger }}>*</span>
              </label>

              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: spacing.sm,
                }}
              >
                <input
                  ref={titleRef}
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  required
                  placeholder="Enter a descriptive title..."
                  style={inputStyle}
                />

                <button
                  type="button"
                  onClick={() => openMathEditor("title")}
                  style={{
                    ...mathButtonStyle,
                    width: isMobile ? "100%" : "auto",
                  }}
                  title="Insert LaTeX formula"
                  onMouseEnter={handleMathButtonEnter}
                  onMouseLeave={handleMathButtonLeave}
                >
                  <span style={{ fontSize: "16px", fontWeight: "800" }}>∑</span>
                  <span>Formula</span>
                </button>
              </div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Description <span style={{ color: colors.danger }}>*</span>
              </label>

              <div style={{ position: "relative" }}>
                <VisualMathEditor
                  value={formData.description}
                  onChange={(description) => setFormData((prev) => ({...prev, description}))}
                  placeholder="Shkruaj problemin dhe shto formulat vizualisht..."
                  minHeight={180}
                />


              </div>

              <p
                style={{
                  fontSize: "13px",
                  color: colors.gray[500],
                  marginTop: "8px",
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                Përdor panelin e editorit për të vendosur formula, pa shkruar LaTeX.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                gap: spacing.lg,
              }}
            >
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>
                  Subject <span style={{ color: colors.danger }}>*</span>
                </label>

                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  required
                  style={{
                    ...inputStyle,
                    width: "100%",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select Subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Level</label>

                <input
                  type="text"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="e.g. IMO, National..."
                  style={{
                    ...inputStyle,
                    width: "100%",
                  }}
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Year</label>

                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="e.g. 2024"
                  min="1900"
                  max="2099"
                  style={{
                    ...inputStyle,
                    width: "100%",
                  }}
                />
              </div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Tags (Optional)</label>

              <div style={tagContainerStyle}>
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      placeholder="Add tag..."
                      style={tagInputStyle}
                    />

                    {tags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        style={removeTagButtonStyle}
                        title="Remove tag"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {tags.length < 5 && (
                  <button
                    type="button"
                    onClick={addTag}
                    style={addTagButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.gray[100];
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.color = colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.borderColor = colors.gray[300];
                      e.currentTarget.style.color = colors.dark;
                    }}
                  >
                    + Add Tag
                  </button>
                )}
              </div>

              <p
                style={{
                  fontSize: "12px",
                  color: colors.gray[500],
                  marginTop: "6px",
                  marginBottom: 0,
                }}
              >
                Add up to 5 tags to help others find your problem.
              </p>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Images (Optional)</label>

              <div
                style={dropzoneStyle}
                onClick={() => imageInputRef.current?.click()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.backgroundColor = `${colors.primary}08`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.gray[300];
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                }}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />

                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: `${colors.primary}12`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: spacing.sm,
                  }}
                >
                  <span
                    style={{
                      width: "18px",
                      height: "18px",
                      borderLeft: `3px solid ${colors.primary}`,
                      borderTop: `3px solid ${colors.primary}`,
                      transform: "rotate(45deg)",
                      marginTop: "8px",
                    }}
                  />
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: colors.gray[700],
                    fontWeight: "700",
                  }}
                >
                  Click to upload images
                </p>

                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "12px",
                    color: colors.gray[500],
                  }}
                >
                  Max 10 images. JPG, PNG, WEBP supported.
                </p>
              </div>

              {images.length > 0 && (
                <div style={previewGridStyle}>
                  {images.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      style={imagePreviewStyle}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        style={removeImageButtonStyle}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={actionContainerStyle}>
              <button
                type="submit"
                disabled={loading || uploadingImages}
                style={{
                  ...primaryButtonStyle,
                  cursor:
                    loading || uploadingImages ? "not-allowed" : "pointer",
                  opacity: loading || uploadingImages ? 0.75 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading && !uploadingImages) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = shadows.lg || shadows.md;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = shadows.md;
                }}
              >
                {uploadingImages
                  ? "Uploading Images..."
                  : loading
                    ? "Creating..."
                    : "Create Problem"}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                style={cancelButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.dark;
                  e.currentTarget.style.backgroundColor = colors.gray[100];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.gray[600];
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>

      <MathEditor
        isOpen={showMathEditor}
        onClose={closeMathEditor}
        onInsert={handleMathInsert}
      />
    </Layout>
  );
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
