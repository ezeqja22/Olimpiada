/* Clean minimal ProblemDetail page replacement - V3 */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import MathEditor from "./MathEditor";
import "./MathEditor.css";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import Layout from "./components/Layout";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import ImageUpload from "./components/ImageUpload";
import { getUserInitial, getDisplayName } from "./utils";
import ReportModal from "./ReportModal";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import { useAuth } from "./context/AuthContext";
import CommentComposer from "./components/problem-detail/CommentComposer";
import CommentThread from "./components/problem-detail/CommentThread";
import { useToast } from "./ToastProvider";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const ui = {
  primary: "#1a4d3a",
  primaryDark: "#103829",
  primarySoft: "#edf7f2",
  primaryBorder: "#cae8d7",
  purple: "rgb(118, 75, 162)",
  purpleDark: "rgb(91, 57, 128)",
  purpleSoft: "#f5effa",
  purpleBorder: "#e7d8f2",
  text: "#17202a",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  card: "#ffffff",
  page: "#f7faf8",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  shadowSm: "0 1px 2px rgba(15, 23, 42, 0.04)",
  shadowMd: "0 6px 18px rgba(15, 23, 42, 0.05)",
  shadowLg: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

const renderMathContent = (text) => {
  if (!text) return "";

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const content = part.slice(2, -2);
      return (
        <div key={index} style={{ textAlign: "left", margin: "12px 0" }}>
          <BlockMath math={content} />
        </div>
      );
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      const content = part.slice(1, -1);
      return <InlineMath key={index} math={content} />;
    }

    return <span key={index}>{part}</span>;
  });
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Unknown date";

  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
};

const isEdited = (createdAt, updatedAt) => {
  if (!createdAt || !updatedAt) return false;
  return new Date(updatedAt).getTime() > new Date(createdAt).getTime();
};

const buttonBase = {
  border: "none",
  cursor: "pointer",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontWeight: 850,
  transition: "all 0.2s ease",
  fontFamily: "inherit",
};

const ModernButton = ({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "soft",
  style = {},
}) => {
  const variants = {
    soft: {
      backgroundColor: "#f8fafc",
      color: ui.text,
      border: `1px solid ${ui.border}`,
      boxShadow: "none",
    },
    green: {
      backgroundColor: ui.primary,
      color: "white",
      border: `1px solid ${ui.primary}`,
      boxShadow: "0 2px 6px rgba(26, 77, 58, 0.14)",
    },
    purple: {
      backgroundColor: ui.purple,
      color: "white",
      border: `1px solid ${ui.purple}`,
      boxShadow: "0 2px 6px rgba(118, 75, 162, 0.14)",
    },
    danger: {
      backgroundColor: ui.danger,
      color: "white",
      border: `1px solid ${ui.danger}`,
      boxShadow: "0 2px 6px rgba(220, 38, 38, 0.12)",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonBase,
        padding: "10px 15px",
        fontSize: "13px",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(event) => {
        if (disabled) return;
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
};

const UserAvatar = ({ user, size = 42, onClick }) => {
  const hasImage = !!user?.profile_picture;

  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ui.primary,
        backgroundImage: hasImage ? `url(${user.profile_picture})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
        fontSize: `${Math.max(11, size * 0.38)}px`,
        fontWeight: 950,
        cursor: onClick ? "pointer" : "default",
        border: "3px solid white",
        outline: `1px solid ${ui.border}`,
        boxShadow: "0 1px 3px rgba(26, 77, 58, 0.10)",
      }}
    >
      {!hasImage && getUserInitial(user?.username || "U")}
    </div>
  );
};

const Pill = ({ children, bg, color, borderColor }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "7px 12px",
      borderRadius: "999px",
      backgroundColor: bg,
      color,
      border: borderColor ? `1px solid ${borderColor}` : "none",
      fontSize: "12px",
      fontWeight: 900,
      boxShadow: ui.shadowSm,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const MiniAction = ({ children, onClick, tone = "default" }) => {
  const tones = {
    default: { color: ui.muted, bg: "transparent" },
    green: { color: ui.primary, bg: ui.primarySoft },
    purple: { color: ui.purple, bg: ui.purpleSoft },
    danger: { color: ui.danger, bg: "transparent" },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        backgroundColor: tones[tone].bg,
        color: tones[tone].color,
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 850,
        padding: "8px 10px",
        borderRadius: "999px",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
};

function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentImages, setCommentImages] = useState([]);
  const [imageResetKey, setImageResetKey] = useState(0);
  const [voteStatus, setVoteStatus] = useState({
    user_vote: null,
    like_count: 0,
    dislike_count: 0,
  });
  const [voteLoading, setVoteLoading] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyImages, setReplyImages] = useState([]);
  const [editingProblem, setEditingProblem] = useState(false);
  const [editProblemData, setEditProblemData] = useState({
    title: "",
    description: "",
    subject: "",
    level: "",
    year: "",
  });
  const [editTags, setEditTags] = useState([""]);
  const [problemImages, setProblemImages] = useState([]);
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [mathEditorTarget, setMathEditorTarget] = useState(null);
  const [cursorIndex, setCursorIndex] = useState(null);
  const [showCommentMathEditor, setShowCommentMathEditor] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImages, setModalImages] = useState([]);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const editTitleRef = useRef(null);
  const editDescriptionRef = useRef(null);
  const editCommentRef = useRef(null);
  const { showToast } = useToast();

  const getSmartFallbackPath = () => {
    const urlParams = new URLSearchParams(location.search);
    const from = urlParams.get("from");
    const tab = urlParams.get("tab");
    const subject = urlParams.get("subject");
    const searchQuery = urlParams.get("q");
    const searchTab = urlParams.get("searchTab");

    if (from === "feed" && tab) return `/feed?tab=${tab}`;
    if (from === "/profile") return "/profile";

    if (from === "search" && searchQuery) {
      let searchPath = `/search?q=${encodeURIComponent(searchQuery)}`;
      if (searchTab) searchPath += `&tab=${searchTab}`;
      return searchPath;
    }

    if (from === "subject" && subject) {
      return `/subject/${encodeURIComponent(subject)}`;
    }

    if (from === "forum" && urlParams.get("forumId")) {
      return `/forum/${urlParams.get("forumId")}`;
    }

    if (from === "user" && urlParams.get("username")) {
      return `/user/${encodeURIComponent(urlParams.get("username"))}`;
    }

    return "/feed";
  };

  const openAuthorProfile = (author) => {
    if (!author?.username) return;

    if (currentUser && author.id === currentUser.id) {
      navigate("/profile");
    } else {
      navigate(`/user/${author.username}`);
    }
  };

  const sortComments = (commentList) => {
    return [...commentList].sort((a, b) => {
      if (a.is_solution && !b.is_solution) return -1;
      if (!a.is_solution && b.is_solution) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  const removeCommentFromTree = (commentList, commentId) => {
    return commentList
      .filter((comment) => comment.id !== commentId)
      .map((comment) => ({
        ...comment,
        replies: comment.replies
          ? removeCommentFromTree(comment.replies, commentId)
          : [],
      }));
  };

  const updateCommentInTree = (commentList, commentId, updater) => {
    return commentList.map((comment) => {
      if (comment.id === commentId) return updater(comment);

      return {
        ...comment,
        replies: comment.replies
          ? updateCommentInTree(comment.replies, commentId, updater)
          : [],
      };
    });
  };

  const fetchProblem = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/auth/problems/id/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProblem(response.data);

      try {
        await axios.post(
          `${API_URL}/auth/problems/${id}/view`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        // View count error is non-critical.
      }

      try {
        const imagesResponse = await axios.get(
          `${API_URL}/auth/problems/${id}/images`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setProblemImages(imagesResponse.data.images || []);
      } catch {
        setProblemImages([]);
      }
    } catch (error) {
      console.error("Error fetching problem:", error);

      if (error.response?.status === 403) {
        showToast(
          "Access denied: You are not a member of this forum.",
          "error",
        );
        navigate("/forums");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/auth/problems/${id}/comments`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setComments(sortComments(response.data || []));
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const fetchVoteStatus = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/auth/problems/${id}/vote-status`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setVoteStatus(response.data);
    } catch (error) {
      console.error("Error fetching vote status:", error);
    }
  };

  const handleVote = async (voteType) => {
    if (!checkFeatureEnabled("voting_enabled")) {
      showFeatureDisabledAlert("Voting");
      return;
    }

    setVoteLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/auth/problems/${id}/vote`,
        { vote_type: voteType },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setVoteStatus(response.data);
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setVoteLoading(false);
    }
  };

  const uploadCommentImages = async (images) => {
    if (!images || images.length === 0) return [];

    const token = localStorage.getItem("token");

    const uploadPromises = images.map(async (imageData) => {
      const formData = new FormData();
      formData.append("file", imageData.file);

      const uploadResponse = await axios.post(
        `${API_URL}/auth/problems/${id}/comment-images`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      return uploadResponse.data.url;
    });

    return await Promise.all(uploadPromises);
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();

    if (!newComment.trim() && commentImages.length === 0) return;

    if (!checkFeatureEnabled("comments_enabled")) {
      showFeatureDisabledAlert("Comments");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const imageUrls = await uploadCommentImages(commentImages);

      await axios.post(
        `${API_URL}/auth/problems/${id}/comments`,
        { text: newComment, images: imageUrls },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await fetchComments();
      setNewComment("");
      setCommentImages([]);
      setImageResetKey((previous) => previous + 1);
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast(`Error adding comment: ${error.message}`, "error");
    }
  };

  const handleSubmitReply = async (parentCommentId) => {
    if (!replyText.trim() && replyImages.length === 0) return;

    if (!checkFeatureEnabled("comments_enabled")) {
      showFeatureDisabledAlert("Comments");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const imageUrls = await uploadCommentImages(replyImages);

      await axios.post(
        `${API_URL}/auth/problems/${id}/comments`,
        {
          text: replyText,
          parent_comment_id: parentCommentId,
          images: imageUrls,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await fetchComments();
      setReplyText("");
      setReplyImages([]);
      setReplyingTo(null);
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.text || "");
  };

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) return;

    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `${API_URL}/auth/problems/${id}/comments/${commentId}`,
        { text: editText },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setComments((previous) =>
        updateCommentInTree(previous, commentId, (comment) => ({
          ...comment,
          ...response.data,
          replies: comment.replies || [],
        })),
      );

      setEditingComment(null);
      setEditText("");
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText("");
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${API_URL}/auth/problems/${id}/comments/${commentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setComments((previous) => removeCommentFromTree(previous, commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleReportComment = (comment) => {
    setReportTarget({
      type: "comment",
      id: comment.id,
      user: comment.author,
    });
    setShowReportModal(true);
  };

  const handleMarkAsSolution = async (commentId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `${API_URL}/auth/problems/${id}/comments/${commentId}/solution`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setComments((previous) => {
        const updated = updateCommentInTree(previous, commentId, (comment) => ({
          ...comment,
          is_solution: response.data.is_solution,
        }));

        return sortComments(updated);
      });
    } catch (error) {
      console.error("Error marking comment as solution:", error);
    }
  };

  const handleEditProblem = () => {
    if (!problem) return;

    setEditingProblem(true);
    setEditProblemData({
      title: problem.title || "",
      description: problem.description || "",
      subject: problem.subject || "",
      level: problem.level || "Any Level",
      year: problem.year || "",
    });

    const existingTags = problem.tags
      ? problem.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [""];

    setEditTags(existingTags.length > 0 ? existingTags : [""]);
  };

  const handleEditTagChange = (index, value) => {
    setEditTags((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const addEditTag = () => {
    if (editTags.length >= 5) {
      showToast("Maximum 5 tags allowed", "error");
      return;
    }

    setEditTags((previous) => [...previous, ""]);
  };

  const removeEditTag = (index) => {
    if (editTags.length <= 1) return;
    setEditTags((previous) => previous.filter((_, i) => i !== index));
  };

  const handleSaveProblem = async () => {
    if (!editProblemData.title.trim() || !editProblemData.description.trim()) {
      return;
    }

    try {
      const validTags = editTags.filter((tag) => tag.trim() !== "");

      if (validTags.length > 5) {
        showToast("Maximum 5 tags allowed", "error");
        return;
      }

      const token = localStorage.getItem("token");

      const requestData = {
        ...editProblemData,
        tags: validTags.join(", "),
        year: editProblemData.year ? parseInt(editProblemData.year, 10) : null,
      };

      const response = await axios.put(
        `${API_URL}/auth/problems/${id}`,
        requestData,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setProblem((previous) => ({
        ...previous,
        ...response.data,
        author: previous.author,
        created_at: previous.created_at,
      }));

      setEditingProblem(false);
    } catch (error) {
      console.error("Error updating problem:", error);
      showToast(
        `Error updating problem: ${
          error.response?.data?.detail || error.message
        }`,
        "error",
      );
    }
  };

  const handleCancelProblemEdit = () => {
    setEditingProblem(false);
    setEditProblemData({
      title: "",
      description: "",
      subject: "",
      level: "",
      year: "",
    });
    setEditTags([""]);
  };

  const handleDeleteProblem = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this problem? This will also delete all comments and votes.",
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${API_URL}/auth/problems/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate(getSmartFallbackPath());
    } catch (error) {
      console.error("Error deleting problem:", error);
      showToast("Error deleting problem. Please try again.", "error");
    }
  };

  const handleDeleteProblemImage = async (image) => {
    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${API_URL}/auth/problems/${id}/images/${encodeURIComponent(image)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await fetchProblem();
    } catch (error) {
      console.error("Error deleting image:", error);
      showToast(
        `Error deleting image: ${error.response?.data?.detail || error.message}`,
        "error",
      );
    }
  };

  const handleUploadProblemImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (problemImages.length + files.length > 10) {
      showToast(
        "Maximum 10 images allowed. Please select fewer images.",
        "error",
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          showToast(`${file.name} is not an image file`, "error");
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        await axios.post(`${API_URL}/auth/problems/${id}/images`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      event.target.value = "";
      await fetchProblem();
    } catch (error) {
      console.error("Error uploading images:", error);
      showToast(
        `Error uploading images: ${error.response?.data?.detail || error.message}`,
        "error",
      );
    }
  };

  const openMathEditor = (target) => {
    let ref = null;
    if (target === "title") ref = editTitleRef.current;
    if (target === "description") ref = editDescriptionRef.current;

    if (ref) {
      setCursorIndex({
        start: ref.selectionStart,
        end: ref.selectionEnd,
      });
    }

    setMathEditorTarget(target);
    setShowMathEditor(true);
  };

  const closeMathEditor = () => {
    setShowMathEditor(false);
    setMathEditorTarget(null);
    setCursorIndex(null);
  };

  const handleMathInsert = (mathContent) => {
    if (mathEditorTarget && cursorIndex) {
      const text = editProblemData[mathEditorTarget] || "";
      const newText =
        text.slice(0, cursorIndex.start) +
        mathContent +
        text.slice(cursorIndex.end);

      setEditProblemData((previous) => ({
        ...previous,
        [mathEditorTarget]: newText,
      }));
    }

    closeMathEditor();
  };

  const openCommentMathEditor = () => {
    setShowCommentMathEditor(true);
  };

  const closeCommentMathEditor = () => {
    setShowCommentMathEditor(false);
  };

  const handleCommentMathInsert = (mathContent) => {
    const target = editCommentRef.current;

    if (target) {
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newText =
        newComment.substring(0, start) +
        mathContent +
        newComment.substring(end);

      setNewComment(newText);

      setTimeout(() => {
        const newPosition = start + mathContent.length;
        target.setSelectionRange(newPosition, newPosition);
        target.focus();
      }, 0);
    }

    setShowCommentMathEditor(false);
  };

  const openImageModal = (index, images) => {
    setCurrentImageIndex(index);
    setModalImages(images || []);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((previous) => (previous + 1) % modalImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (previous) => (previous - 1 + modalImages.length) % modalImages.length,
    );
  };

  useEffect(() => {
    fetchProblem();
    fetchComments();
    fetchVoteStatus();
  }, [id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchComments();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!showImageModal) return;

      if (event.key === "Escape") closeImageModal();
      if (event.key === "ArrowLeft" && modalImages.length > 1) prevImage();
      if (event.key === "ArrowRight" && modalImages.length > 1) nextImage();
    };

    if (showImageModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showImageModal, modalImages.length]);

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="problems"
          message="Loading problem..."
          size="large"
        />
      </Layout>
    );
  }

  if (!problem) {
    return (
      <Layout showHomeButton={true}>
        <div
          style={{
            minHeight: "55vh",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            color: ui.text,
          }}
        >
          <div
            style={{
              backgroundColor: ui.card,
              border: `1px solid ${ui.border}`,
              borderRadius: "16px",
              padding: "38px",
              boxShadow: ui.shadowMd,
            }}
          >
            <h2 style={{ margin: "0 0 10px" }}>Problem not found</h2>
            <p style={{ margin: 0, color: ui.muted }}>
              This problem may have been deleted or does not exist.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const canManageProblem =
    currentUser &&
    (currentUser.id === problem.author_id ||
      currentUser.role === "admin" ||
      currentUser.role === "moderator");

  const commentImageUrls = commentImages.map(
    (image) => image.cloudinaryUrl || image.preview,
  );

  return (
    <Layout showHomeButton={true}>
      <div
        style={{
          background:
            "radial-gradient(circle at top left, rgba(26,77,58,0.12), transparent 32%), radial-gradient(circle at top right, rgba(118,75,162,0.13), transparent 28%)",
          borderRadius: "18px",
          padding: isMobile ? "14px" : "14px",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <BackButton fallbackPath={getSmartFallbackPath()} />
        </div>

        {editingProblem ? (
          <section
            style={{
              backgroundColor: ui.card,
              border: `1px solid ${ui.border}`,
              borderRadius: "18px",
              padding: isMobile ? "18px" : "18px",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "14px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    color: ui.text,
                    fontSize: isMobile ? "25px" : "18px",
                    fontWeight: 950,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Edit Problem
                </h1>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: ui.muted,
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Update the statement, metadata, tags, and images.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <ModernButton onClick={handleCancelProblemEdit}>
                  Cancel
                </ModernButton>
                <ModernButton onClick={handleSaveProblem} variant="green">
                  Save Problem
                </ModernButton>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <input
                ref={editTitleRef}
                type="text"
                value={editProblemData.title}
                onChange={(event) =>
                  setEditProblemData((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                placeholder="Problem title"
                style={{
                  flex: 1,
                  padding: "15px 16px",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "18px",
                  fontSize: isMobile ? "14px" : "27px",
                  fontWeight: 950,
                  outline: "none",
                  fontFamily: "inherit",
                  color: ui.text,
                  backgroundColor: "#f8fafc",
                }}
              />

              <ModernButton
                onClick={() => openMathEditor("title")}
                variant="purple"
              >
                Symbols
              </ModernButton>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <input
                type="text"
                value={editProblemData.subject}
                onChange={(event) =>
                  setEditProblemData((previous) => ({
                    ...previous,
                    subject: event.target.value,
                  }))
                }
                placeholder="Subject"
                style={{
                  padding: "12px 14px",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "16px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />

              <input
                type="text"
                value={editProblemData.level}
                onChange={(event) =>
                  setEditProblemData((previous) => ({
                    ...previous,
                    level: event.target.value,
                  }))
                }
                placeholder="Level"
                style={{
                  padding: "12px 14px",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "16px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />

              <input
                type="number"
                value={editProblemData.year}
                onChange={(event) =>
                  setEditProblemData((previous) => ({
                    ...previous,
                    year: event.target.value,
                  }))
                }
                placeholder="Year"
                min="1900"
                max="2030"
                style={{
                  padding: "12px 14px",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "16px",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: `1px solid ${ui.border}`,
                borderRadius: "14px",
                padding: "15px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  color: ui.muted,
                  fontSize: "13px",
                  fontWeight: 900,
                  marginBottom: "10px",
                }}
              >
                Tags ({editTags.length}/5)
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                {editTags.map((tag, index) => (
                  <div key={index} style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={tag}
                      onChange={(event) =>
                        handleEditTagChange(index, event.target.value)
                      }
                      placeholder={`Tag ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        border: `1px solid ${ui.border}`,
                        borderRadius: "14px",
                        outline: "none",
                      }}
                    />

                    {editTags.length > 1 && (
                      <ModernButton
                        onClick={() => removeEditTag(index)}
                        style={{
                          backgroundColor: ui.dangerSoft,
                          color: "#991b1b",
                          border: "1px solid #fecaca",
                        }}
                      >
                        Remove
                      </ModernButton>
                    )}
                  </div>
                ))}
              </div>

              {editTags.length < 5 && (
                <ModernButton
                  onClick={addEditTag}
                  style={{
                    marginTop: "10px",
                    backgroundColor: ui.primarySoft,
                    color: ui.primary,
                    border: `1px solid ${ui.primaryBorder}`,
                  }}
                >
                  + Add Tag
                </ModernButton>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <textarea
                ref={editDescriptionRef}
                value={editProblemData.description}
                onChange={(event) =>
                  setEditProblemData((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="Problem description"
                style={{
                  flex: 1,
                  minHeight: "190px",
                  padding: "16px",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "14px",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  lineHeight: 1.65,
                  backgroundColor: "#f8fafc",
                }}
              />

              <ModernButton
                onClick={() => openMathEditor("description")}
                variant="green"
                style={{ alignSelf: isMobile ? "stretch" : "flex-start" }}
              >
                Symbols
              </ModernButton>
            </div>

            <div
              style={{
                border: `1px solid ${ui.border}`,
                borderRadius: "14px",
                padding: "18px",
                backgroundColor: "#fbfdfc",
              }}
            >
              <h3
                style={{
                  margin: "0 0 14px",
                  color: ui.text,
                  fontSize: "18px",
                  fontWeight: 950,
                }}
              >
                Problem Images ({problemImages.length}/10)
              </h3>

              {problemImages.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(auto-fill, minmax(125px, 1fr))"
                      : "repeat(auto-fill, minmax(155px, 190px))",
                    gap: "14px",
                    marginBottom: "16px",
                  }}
                >
                  {problemImages.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      style={{
                        position: "relative",
                        height: "125px",
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: `1px solid ${ui.border}`,
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <img
                        src={image}
                        alt={`Problem image ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleDeleteProblemImage(image)}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          border: "none",
                          backgroundColor: "rgba(220, 38, 38, 0.92)",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "17px",
                          fontWeight: 950,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {problemImages.length < 10 ? (
                <>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadProblemImages}
                    style={{ display: "none" }}
                    id="edit-problem-images"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("edit-problem-images")?.click()
                    }
                    style={{
                      width: isMobile ? "100%" : "205px",
                      height: "120px",
                      border: `2px dashed rgba(26,77,58,0.38)`,
                      borderRadius: "14px",
                      backgroundColor: ui.primarySoft,
                      color: ui.primary,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 950,
                      gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
                    <span>Add Image</span>
                    <small style={{ color: ui.muted }}>
                      {10 - problemImages.length} remaining
                    </small>
                  </button>
                </>
              ) : (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    backgroundColor: "#f8fafc",
                    color: ui.muted,
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  Maximum 10 images reached.
                </div>
              )}
            </div>
          </section>
        ) : (
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              backgroundColor: ui.card,
              border: `1px solid ${ui.border}`,
              borderRadius: "18px",
              boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                height: "3px",
                background: `linear-gradient(90deg, ${ui.primary}, ${ui.purple})`,
              }}
            />

            <div style={{ padding: isMobile ? "18px" : "18px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "14px",
                  alignItems: "flex-start",
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {problem.author && (
                    <button
                      type="button"
                      onClick={() => openAuthorProfile(problem.author)}
                      style={{
                        border: `1px solid ${ui.border}`,
                        backgroundColor: "#f8fafc",
                        borderRadius: "999px",
                        padding: "8px 14px 8px 8px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "11px",
                        cursor: "pointer",
                        marginBottom: "14px",
                        boxShadow: ui.shadowSm,
                      }}
                    >
                      <UserAvatar user={problem.author} size={40} />

                      <span style={{ display: "grid", textAlign: "left" }}>
                        <strong
                          style={{
                            color: ui.primary,
                            fontSize: "14px",
                            fontWeight: 950,
                          }}
                        >
                          {getDisplayName(problem.author.username) ||
                            "Unknown Author"}
                        </strong>

                        <span
                          style={{
                            color: ui.muted,
                            fontSize: "12px",
                            fontWeight: 750,
                          }}
                        >
                          {formatDate(problem.created_at)}
                          {isEdited(problem.created_at, problem.updated_at)
                            ? " · Edited"
                            : ""}
                        </span>
                      </span>
                    </button>
                  )}

                  <h1
                    style={{
                      margin: "0 0 18px",
                      color: ui.text,
                      fontSize: isMobile ? "27px" : "34px",
                      lineHeight: 1.08,
                      letterSpacing: "-0.025em",
                      fontWeight: 950,
                    }}
                  >
                    {renderMathContent(problem.title)}
                  </h1>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
                    }}
                  >
                    {problem.subject && (
                      <Pill bg="#e0e7ff" color="#3730a3">
                        {problem.subject}
                      </Pill>
                    )}

                    {problem.level && problem.level.trim() && (
                      <Pill bg="#fef3c7" color="#92400e">
                        {problem.level}
                      </Pill>
                    )}

                    {problem.year && (
                      <Pill bg="#dcfce7" color="#166534">
                        Year: {problem.year}
                      </Pill>
                    )}

                    {problem.tags &&
                      problem.tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .map((tag, index) => (
                          <Pill
                            key={`${tag}-${index}`}
                            bg={ui.purple}
                            color="white"
                          >
                            {tag}
                          </Pill>
                        ))}
                  </div>
                </div>

                {canManageProblem && (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    <ModernButton
                      onClick={handleEditProblem}
                      variant="purple"
                      style={{ width: isMobile ? "100%" : "auto" }}
                    >
                      Edit Problem
                    </ModernButton>

                    <ModernButton
                      onClick={handleDeleteProblem}
                      variant="danger"
                      style={{ width: isMobile ? "100%" : "auto" }}
                    >
                      Delete Problem
                    </ModernButton>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  backgroundColor: "#ffffff",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "16px",
                  padding: isMobile ? "17px" : "14px",
                  color: ui.text,
                  lineHeight: 1.82,
                  fontSize: isMobile ? "15px" : "16px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {renderMathContent(problem.description)}
              </div>

              {problemImages && problemImages.length > 0 && (
                <div style={{ marginTop: "26px" }}>
                  <h3
                    style={{
                      margin: "0 0 14px",
                      color: ui.text,
                      fontSize: "19px",
                      fontWeight: 950,
                    }}
                  >
                    Problem Images
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(auto-fill, minmax(185px, 245px))",
                      gap: "15px",
                    }}
                  >
                    {problemImages.map((image, index) => (
                      <button
                        type="button"
                        key={`${image}-${index}`}
                        onClick={() => openImageModal(index, problemImages)}
                        style={{
                          border: `1px solid ${ui.border}`,
                          borderRadius: "14px",
                          overflow: "hidden",
                          backgroundColor: "#f8fafc",
                          padding: 0,
                          cursor: "pointer",
                          minHeight: "160px",
                          boxShadow: ui.shadowSm,
                          position: "relative",
                        }}
                      >
                        <img
                          src={image}
                          alt={`Problem image ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            minHeight: "160px",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />

                        <span
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "10px",
                            backgroundColor: "rgba(15, 23, 42, 0.76)",
                            color: "white",
                            borderRadius: "999px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            fontWeight: 900,
                          }}
                        >
                          View
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section
          style={{
            backgroundColor: ui.card,
            border: `1px solid ${ui.border}`,
            borderRadius: "18px",
            padding: isMobile ? "16px" : "14px",
            boxShadow: ui.shadowMd,
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              gap: "14px",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 5px",
                  fontSize: "14px",
                  fontWeight: 950,
                  color: ui.text,
                }}
              >
                Vote on this Problem
              </h3>
              <p
                style={{
                  margin: 0,
                  color: ui.muted,
                  fontSize: "13px",
                  fontWeight: 750,
                }}
              >
                Help surface useful and well-written problems.
              </p>
            </div>

            <div
              style={{
                display: "inline-flex",
                backgroundColor: "#f8fafc",
                borderRadius: "999px",
                padding: "6px",
                border: `1px solid ${ui.border}`,
                boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
            >
              <button
                type="button"
                onClick={() => handleVote("like")}
                disabled={voteLoading}
                style={{
                  ...buttonBase,
                  padding: "10px 16px",
                  backgroundColor:
                    voteStatus.user_vote === "like"
                      ? ui.primary
                      : "transparent",
                  color: voteStatus.user_vote === "like" ? "white" : ui.muted,
                }}
              >
                Like {voteStatus.like_count || 0}
              </button>

              <button
                type="button"
                onClick={() => handleVote("dislike")}
                disabled={voteLoading}
                style={{
                  ...buttonBase,
                  padding: "10px 16px",
                  backgroundColor:
                    voteStatus.user_vote === "dislike"
                      ? ui.purple
                      : "transparent",
                  color:
                    voteStatus.user_vote === "dislike" ? "white" : ui.muted,
                }}
              >
                Dislike {voteStatus.dislike_count || 0}
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            backgroundColor: ui.card,
            border: `1px solid ${ui.border}`,
            borderRadius: "18px",
            padding: isMobile ? "14px" : "18px",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: "0 0 5px",
                  color: ui.text,
                  fontSize: isMobile ? "25px" : "18px",
                  fontWeight: 950,
                  letterSpacing: "-0.04em",
                }}
              >
                Comments
              </h2>

              <p
                style={{
                  margin: 0,
                  color: ui.muted,
                  fontSize: "14px",
                  fontWeight: 750,
                }}
              >
                {comments.length}{" "}
                {comments.length === 1 ? "comment" : "comments"}
              </p>
            </div>

            {comments.some((comment) => comment.is_solution) && (
              <Pill
                bg={ui.primarySoft}
                color={ui.primary}
                borderColor={ui.primaryBorder}
              >
                ✓ Solution found
              </Pill>
            )}
          </div>

          <CommentComposer
            onSubmit={handleSubmitComment}
            currentUser={currentUser}
            isMobile={isMobile}
            editCommentRef={editCommentRef}
            newComment={newComment}
            setNewComment={setNewComment}
            commentImages={commentImages}
            setCommentImages={setCommentImages}
            imageResetKey={imageResetKey}
            openCommentMathEditor={openCommentMathEditor}
            openImageModal={openImageModal}
            commentImageUrls={commentImageUrls}
          />

          {comments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "46px 18px",
                border: `1px dashed ${ui.border}`,
                borderRadius: "16px",
                backgroundColor: "#fbfdfc",
                color: ui.muted,
              }}
            >
              <div
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "50%",
                  backgroundColor: ui.primarySoft,
                  color: ui.primary,
                  display: "grid",
                  placeItems: "center",
                  fontSize: "16px",
                  fontWeight: 950,
                  margin: "0 auto 12px",
                }}
              >
                ?
              </div>

              <h3
                style={{ margin: "0 0 6px", color: ui.text, fontWeight: 950 }}
              >
                No comments yet
              </h3>
              <p style={{ margin: 0, fontWeight: 750 }}>
                Start the discussion with a solution idea or question.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  currentUser={currentUser}
                  problem={problem}
                  onOpenAuthor={openAuthorProfile}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
                  onMarkAsSolution={handleMarkAsSolution}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  replyImages={replyImages}
                  setReplyImages={setReplyImages}
                  onSubmitReply={handleSubmitReply}
                  onReportComment={handleReportComment}
                  setCurrentImageIndex={setCurrentImageIndex}
                  setModalImages={setModalImages}
                  setShowImageModal={setShowImageModal}
                  editingCommentId={editingComment}
                  editText={editText}
                  setEditText={setEditText}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                />
              ))}
            </div>
          )}
        </section>

        <MathEditor
          isOpen={showMathEditor}
          onClose={closeMathEditor}
          onInsert={(symbol) => handleMathInsert(symbol)}
          initialValue=""
        />

        <MathEditor
          isOpen={showCommentMathEditor}
          onClose={closeCommentMathEditor}
          onInsert={handleCommentMathInsert}
          initialValue=""
        />

        {showImageModal && modalImages.length > 0 && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(2, 6, 23, 0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              cursor: "pointer",
              padding: isMobile ? "18px" : "18px",
            }}
            onClick={closeImageModal}
          >
            <button
              type="button"
              onClick={closeImageModal}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "50%",
                width: "46px",
                height: "46px",
                fontSize: "14px",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                zIndex: 10000,
              }}
            >
              ✕
            </button>

            {modalImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    prevImage();
                  }}
                  style={{
                    position: "absolute",
                    left: isMobile ? "12px" : "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "50%",
                    width: isMobile ? "42px" : "54px",
                    height: isMobile ? "42px" : "54px",
                    fontSize: "18px",
                    cursor: "pointer",
                    zIndex: 10000,
                  }}
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    nextImage();
                  }}
                  style={{
                    position: "absolute",
                    right: isMobile ? "12px" : "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "50%",
                    width: isMobile ? "42px" : "54px",
                    height: isMobile ? "42px" : "54px",
                    fontSize: "18px",
                    cursor: "pointer",
                    zIndex: 10000,
                  }}
                >
                  ›
                </button>

                <div
                  style={{
                    position: "absolute",
                    bottom: "14px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(0,0,0,0.55)",
                    color: "white",
                    padding: "9px 16px",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 900,
                    zIndex: 10000,
                  }}
                >
                  {currentImageIndex + 1} / {modalImages.length}
                </div>
              </>
            )}

            <img
              src={modalImages[currentImageIndex]}
              alt={`Problem image ${currentImageIndex + 1}`}
              style={{
                maxWidth: "92vw",
                maxHeight: "88vh",
                objectFit: "contain",
                borderRadius: "18px",
                boxShadow: "0 30px 80px rgba(0,0,0,0.42)",
              }}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}

        {showReportModal && reportTarget && (
          <ReportModal
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setReportTarget(null);
            }}
            reportType={reportTarget.type}
            targetId={reportTarget.id}
            targetUser={reportTarget.user}
          />
        )}
      </div>
    </Layout>
  );
}

export default ProblemDetail;
