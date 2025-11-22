// src/CreateProblem.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import MathEditor from "./MathEditor";
import "./MathEditor.css";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius, shadows } from "./designSystem";

function CreateProblem() {
  const location = useLocation();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    level: "",
    year: ""
  });
  const [tags, setTags] = useState([""]); // Array of tag strings

  // Pre-fill subject from URL parameter if coming from SubjectPage
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const subjectParam = urlParams.get('subject');
    const draftId = urlParams.get('draft');

    if (subjectParam) {
      setFormData(prev => ({
        ...prev,
        subject: subjectParam
      }));
    }

    // Load draft if draft ID is provided
    if (draftId) {
      loadDraft(draftId);
    }
  }, [location]);

  const loadDraft = async (draftId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to load draft");
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/drafts/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const draft = response.data;
      setFormData({
        title: draft.title,
        description: draft.description,
        subject: draft.subject,
        level: draft.level,
        year: draft.year ? draft.year.toString() : ""
      });

      // Set tags from draft
      if (draft.tags) {
        setTags(draft.tags.split(',').map(tag => tag.trim()).filter(tag => tag));
      }

      alert("Draft loaded successfully! You can now finish and publish your problem.");
    } catch (error) {
      console.error("Error loading draft:", error);
      alert(error.response?.data?.detail || "Failed to load draft");
    }
  };
  const [images, setImages] = useState([]); // Array of uploaded image filenames
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [mathEditorTarget, setMathEditorTarget] = useState(null); // 'title' or 'description'
  const [savingDraft, setSavingDraft] = useState(false);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const [cursorIndex, setCursorIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigate = useNavigate();

  // Function to determine where to redirect after successful creation
  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get('from');

    // If there's a specific 'from' parameter, use it
    if (from) {
      return from;
    }

    // Check if we came from a specific subject page
    const subject = searchParams.get('subject');
    if (subject) {
      return `/subject/${encodeURIComponent(subject)}`;
    }

    // Default to feed if no specific referrer
    return '/feed';
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openMathEditor = (target) => {
    let ref = null;

    if (target === "title") ref = titleRef.current;
    if (target === "description") ref = descriptionRef.current;

    if (ref) {
      setCursorIndex({
        start: ref.selectionStart,
        end: ref.selectionEnd
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
        [mathEditorTarget]: newText
      });
    }

    setShowMathEditor(false);
    setMathEditorTarget(null);
    setCursorIndex(null);
  };


  const closeMathEditor = () => {
    setShowMathEditor(false);
    setMathEditorTarget(null);
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
      alert("Maximum 5 tags allowed");
    }
  };

  const removeTag = (index) => {
    if (tags.length > 1) {
      const newTags = tags.filter((_, i) => i !== index);
      setTags(newTags);
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (images.length + files.length > 10) {
      alert("Maximum 10 images allowed. Please select fewer images.");
      return;
    }

    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      return true;
    });

    // Store files for later upload
    setImages([...images, ...validFiles]);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.subject) {
      alert("Please fill in at least title, description, and subject to save as draft");
      return;
    }

    setSavingDraft(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to save a draft");
        return;
      }

      const draftData = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        level: formData.level || "Any Level",
        year: formData.year ? parseInt(formData.year) : null,
        tags: tags.filter(tag => tag.trim()).join(", ")
      };

      await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/drafts`, draftData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      alert(error.response?.data?.detail || "Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate tags
      const validTags = tags.filter(tag => tag.trim() !== "");
      if (validTags.length > 5) {
        alert("Maximum 5 tags allowed");
        setLoading(false);
        return;
      }

      // Process tags: filter out empty tags and join with commas
      const processedTags = validTags.join(", ");

      const token = localStorage.getItem("token");

      // Ensure year is a number or null
      const requestData = {
        ...formData,
        tags: processedTags,
        year: formData.year ? parseInt(formData.year) : null
      };



      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Upload images if any
      if (images.length > 0) {
        setUploadingImages(true);
        try {
          for (const file of images) {
            const formData = new FormData();
            formData.append('file', file);

            const uploadUrl = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${response.data.id}/images`;

            const uploadResponse = await axios.post(
              uploadUrl,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                }
              }
            );
          }
        } catch (error) {
          console.error("Error uploading images:", error);
          console.error("Error response:", error.response?.data);
          console.error("Error status:", error.response?.status);
          alert(`Problem created but images failed to upload: ${error.response?.data?.detail || error.message}. You can add them later by editing the problem.`);
        } finally {
          setUploadingImages(false);
        }
      }

      alert("Problem created successfully!");

      // If this was created from a draft, delete the draft
      const urlParams = new URLSearchParams(location.search);
      const draftId = urlParams.get('draft');
      if (draftId) {
        try {
          await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/drafts/${draftId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.error("Error deleting draft after publishing:", error);
          // Don't show error to user as the problem was created successfully
        }
      }

      navigate(getRedirectPath());
    } catch (error) {
      console.error("Error creating problem:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      alert("Error creating problem: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showHomeButton={true}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: spacing.xl, textAlign: "center" }}>
          <h1 style={{
            fontSize: typography.fontSize["3xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary,
            marginBottom: spacing.sm,
          }}>
            Create New Problem
          </h1>
          <p style={{ color: colors.gray[600], fontSize: "1.1rem" }}>
            Share a science problem with the community
          </p>
        </div>

        <Card style={{ padding: spacing.xl, position: "relative" }}>
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: spacing.lg
          }}>
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                color: colors.primary,
                border: `1px solid ${colors.primary}`,
                borderRadius: borderRadius.md,
                fontSize: "14px",
                fontWeight: "600",
                cursor: savingDraft ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                if (!savingDraft) {
                  e.target.style.backgroundColor = colors.primary;
                  e.target.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!savingDraft) {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = colors.primary;
                }
              }}
            >
              {savingDraft ? "Saving..." : "Save as Draft"}
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: spacing.xl }}>
            {/* Title Section */}
            <div>
              <label style={{
                display: "block",
                marginBottom: spacing.xs,
                fontWeight: "600",
                color: colors.dark,
                fontSize: "16px"
              }}>
                Title <span style={{ color: colors.danger }}>*</span>
              </label>
              <div style={{ display: "flex", gap: spacing.sm }}>
                <input
                  ref={titleRef}
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    backgroundColor: colors.gray[50]
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.primary;
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = `0 0 0 3px ${colors.primary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.gray[300];
                    e.target.style.backgroundColor = colors.gray[50];
                    e.target.style.boxShadow = "none";
                  }}
                  placeholder="Enter a descriptive title..."
                />
                <button
                  type="button"
                  onClick={() => openMathEditor('title')}
                  style={{
                    padding: `0 ${spacing.md}`,
                    backgroundColor: colors.gray[100],
                    color: colors.dark,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "18px",
                    transition: "all 0.2s ease"
                  }}
                  title="Insert Math Symbol"
                  onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[200]}
                  onMouseLeave={(e) => e.target.style.backgroundColor = colors.gray[100]}
                >
                  ∑
                </button>
              </div>
            </div>

            {/* Description Section */}
            <div>
              <label style={{
                display: "block",
                marginBottom: spacing.xs,
                fontWeight: "600",
                color: colors.dark,
                fontSize: "16px"
              }}>
                Description <span style={{ color: colors.danger }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <textarea
                  ref={descriptionRef}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="8"
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: "16px",
                    resize: "vertical",
                    outline: "none",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    backgroundColor: colors.gray[50],
                    fontFamily: "inherit",
                    lineHeight: "1.5"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.primary;
                    e.target.style.backgroundColor = "white";
                    e.target.style.boxShadow = `0 0 0 3px ${colors.primary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.gray[300];
                    e.target.style.backgroundColor = colors.gray[50];
                    e.target.style.boxShadow = "none";
                  }}
                  placeholder="Describe the problem in detail..."
                />
                <button
                  type="button"
                  onClick={() => openMathEditor('description')}
                  style={{
                    position: "absolute",
                    top: spacing.sm,
                    right: spacing.sm,
                    padding: "4px 8px",
                    backgroundColor: "white",
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.sm,
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    boxShadow: shadows.sm
                  }}
                  title="Insert Math Symbol"
                >
                  ∑ Math
                </button>
              </div>
              <p style={{ fontSize: "13px", color: colors.gray[500], marginTop: "6px" }}>
                Tip: Wrap math expressions in $...$ for inline math.
              </p>
            </div>

            {/* Grid for Subject, Level, Year */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: spacing.lg
            }}>
              {/* Subject */}
              <div>
                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                  Subject <span style={{ color: colors.danger }}>*</span>
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: "16px",
                    outline: "none",
                    backgroundColor: "white",
                    cursor: "pointer"
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

              {/* Level */}
              <div>
                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                  Level
                </label>
                <input
                  type="text"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  placeholder="e.g. IMO, National..."
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: "16px",
                    outline: "none"
                  }}
                />
              </div>

              {/* Year */}
              <div>
                <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                  Year
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="e.g. 2024"
                  min="1900"
                  max="2099"
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: "16px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Tags Section */}
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                Tags (Optional)
              </label>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: spacing.sm,
                padding: spacing.sm,
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: borderRadius.md,
                backgroundColor: "white",
                minHeight: "48px"
              }}>
                {tags.map((tag, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      placeholder="Add tag..."
                      style={{
                        padding: "6px 10px",
                        border: `1px solid ${colors.gray[300]}`,
                        borderRadius: "20px",
                        fontSize: "14px",
                        width: "120px",
                        outline: "none",
                        backgroundColor: colors.gray[50]
                      }}
                    />
                    {tags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        style={{
                          marginLeft: "-24px",
                          border: "none",
                          background: "none",
                          color: colors.gray[500],
                          cursor: "pointer",
                          fontSize: "16px",
                          fontWeight: "bold"
                        }}
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
                    style={{
                      padding: "6px 12px",
                      backgroundColor: colors.gray[100],
                      border: "none",
                      borderRadius: "20px",
                      color: colors.dark,
                      fontSize: "14px",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = colors.gray[200]}
                    onMouseLeave={(e) => e.target.style.backgroundColor = colors.gray[100]}
                  >
                    + Add Tag
                  </button>
                )}
              </div>
            </div>

            {/* Images Section */}
            <div>
              <label style={{ display: "block", marginBottom: spacing.xs, fontWeight: "600" }}>
                Images (Optional)
              </label>
              <div style={{
                border: `2px dashed ${colors.gray[300]}`,
                borderRadius: borderRadius.lg,
                padding: spacing.lg,
                textAlign: "center",
                backgroundColor: colors.gray[50],
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
                onClick={() => document.getElementById('image-upload-input').click()}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = colors.primary;
                  e.target.style.backgroundColor = `${colors.primary}05`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = colors.gray[300];
                  e.target.style.backgroundColor = colors.gray[50];
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                  id="image-upload-input"
                />
                <p style={{ margin: 0, color: colors.gray[600], fontWeight: "500" }}>
                  Click to upload images or drag and drop
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: colors.gray[500] }}>
                  Max 10 images
                </p>
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: spacing.md,
                  marginTop: spacing.md
                }}>
                  {images.map((file, index) => (
                    <div key={index} style={{
                      position: "relative",
                      width: "100px",
                      height: "100px",
                      borderRadius: borderRadius.md,
                      overflow: "hidden",
                      boxShadow: shadows.sm
                    }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "white",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: "14px"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: "flex",
              gap: spacing.md,
              marginTop: spacing.lg,
              paddingTop: spacing.lg,
              borderTop: `1px solid ${colors.gray[200]}`
            }}>
              <Button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  fontSize: "16px",
                  fontWeight: "bold",
                  boxShadow: shadows.md
                }}
              >
                {loading ? "Creating..." : "Create Problem"}
              </Button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: spacing.md,
                  backgroundColor: "transparent",
                  color: colors.gray[600],
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "color 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.color = colors.dark}
                onMouseLeave={(e) => e.target.style.color = colors.gray[600]}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>

      {/* Math Editor Modal */}
      {showMathEditor && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Insert Math Symbol</h3>
              <button onClick={closeMathEditor} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>
            <MathEditor onInsert={handleMathInsert} />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default CreateProblem;
