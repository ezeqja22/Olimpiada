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
  shadowSm: "0 8px 18px rgba(15, 23, 42, 0.06)",
  shadowMd: "0 18px 42px rgba(15, 23, 42, 0.08)",
  shadowLg: "0 28px 70px rgba(15, 23, 42, 0.10)",
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
      boxShadow: "0 14px 26px rgba(26, 77, 58, 0.20)",
    },
    purple: {
      backgroundColor: ui.purple,
      color: "white",
      border: `1px solid ${ui.purple}`,
      boxShadow: "0 14px 26px rgba(118, 75, 162, 0.20)",
    },
    danger: {
      backgroundColor: ui.danger,
      color: "white",
      border: `1px solid ${ui.danger}`,
      boxShadow: "0 14px 26px rgba(220, 38, 38, 0.18)",
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
        boxShadow: "0 12px 28px rgba(26, 77, 58, 0.18)",
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

const CommentThread = ({
  comment,
  currentUser,
  problem,
  onOpenAuthor,
  onEditComment,
  onDeleteComment,
  onMarkAsSolution,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  replyImages,
  setReplyImages,
  onSubmitReply,
  onReportComment,
  setCurrentImageIndex,
  setModalImages,
  setShowImageModal,
  editingCommentId,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit,
  depth = 0,
}) => {
  const maxDepth = 3;
  const [showReplies, setShowReplies] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const isNested = depth > 0;
  const canEdit = currentUser && currentUser.id === comment.author_id;
  const canMarkSolution =
    currentUser &&
    problem &&
    (currentUser.id === problem.author_id ||
      currentUser.role === "admin" ||
      currentUser.role === "moderator");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openCommentImage = (index) => {
    setModalImages(comment.images || []);
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  return (
    <div
      style={{
        position: "relative",
        marginLeft: isNested ? (isMobile ? "12px" : "36px") : 0,
        paddingLeft: isNested ? (isMobile ? "12px" : "22px") : 0,
        marginBottom: "16px",
      }}
    >
      {isNested && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "4px",
            bottom: "4px",
            width: "3px",
            borderRadius: "999px",
            background:
              "linear-gradient(180deg, rgba(26,77,58,0.35), rgba(118,75,162,0.18))",
          }}
        />
      )}

      <article
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: comment.is_solution ? "#f0fdf4" : ui.card,
          border: comment.is_solution
            ? `2px solid ${ui.primary}`
            : `1px solid ${ui.border}`,
          borderRadius: isNested ? "22px" : "28px",
          boxShadow: comment.is_solution
            ? "0 24px 56px rgba(26, 77, 58, 0.16)"
            : "0 18px 42px rgba(15, 23, 42, 0.07)",
        }}
      >
        <div
          style={{
            height: "5px",
            background: comment.is_solution
              ? `linear-gradient(90deg, ${ui.primary}, #22c55e)`
              : `linear-gradient(90deg, ${ui.primary}, ${ui.purple})`,
            opacity: comment.is_solution ? 1 : 0.65,
          }}
        />

        <div style={{ padding: isMobile ? "15px" : "19px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "13px",
            }}
          >
            <UserAvatar
              user={comment.author}
              size={isMobile ? 36 : 44}
              onClick={() => onOpenAuthor(comment.author)}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "14px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => onOpenAuthor(comment.author)}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      padding: 0,
                      margin: 0,
                      color: ui.primary,
                      fontSize: isMobile ? "14px" : "15px",
                      fontWeight: 950,
                      letterSpacing: "-0.01em",
                      cursor: "pointer",
                    }}
                  >
                    {getDisplayName(comment.author?.username) || "Unknown User"}
                  </button>

                  <div
                    style={{
                      marginTop: "3px",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                      color: ui.muted,
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    <span>{formatDate(comment.created_at)}</span>

                    {isEdited(comment.created_at, comment.updated_at) && (
                      <span>Edited</span>
                    )}

                    {isNested && (
                      <span
                        style={{
                          backgroundColor: ui.purpleSoft,
                          color: ui.purple,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 900,
                        }}
                      >
                        Reply
                      </span>
                    )}
                  </div>
                </div>

                {comment.is_solution && (
                  <Pill bg={ui.primary} color="white">
                    ✓ Accepted Solution
                  </Pill>
                )}
              </div>

              {editingCommentId === comment.id ? (
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: `1px solid ${ui.border}`,
                    borderRadius: "18px",
                    padding: "12px",
                    marginTop: "12px",
                  }}
                >
                  <textarea
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    autoFocus
                    style={{
                      width: "100%",
                      minHeight: "105px",
                      padding: "13px 14px",
                      borderRadius: "16px",
                      border: `1px solid ${ui.primary}`,
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      backgroundColor: "white",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      marginTop: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <ModernButton onClick={onCancelEdit}>Cancel</ModernButton>
                    <ModernButton
                      onClick={() => onSaveEdit(comment.id)}
                      variant="green"
                    >
                      Save Changes
                    </ModernButton>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: ui.text,
                    lineHeight: 1.75,
                    fontSize: isMobile ? "14px" : "15px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    marginTop: "10px",
                  }}
                >
                  {renderMathContent(comment.text)}
                </div>
              )}

              {comment.images && comment.images.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(auto-fill, minmax(92px, 1fr))"
                      : "repeat(auto-fill, minmax(118px, 145px))",
                    gap: "10px",
                    marginTop: "15px",
                  }}
                >
                  {comment.images.map((imageUrl, index) => (
                    <button
                      type="button"
                      key={`${imageUrl}-${index}`}
                      onClick={() => openCommentImage(index)}
                      style={{
                        border: `1px solid ${ui.border}`,
                        borderRadius: "18px",
                        padding: 0,
                        overflow: "hidden",
                        height: isMobile ? "92px" : "112px",
                        backgroundColor: "#f8fafc",
                        cursor: "pointer",
                        boxShadow: ui.shadowSm,
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={`Comment image ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "13px",
                  borderTop: `1px solid ${ui.border}`,
                  display: "flex",
                  gap: "6px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <MiniAction
                  tone={replyingTo === comment.id ? "green" : "default"}
                  onClick={() =>
                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                  }
                >
                  Reply
                </MiniAction>

                <MiniAction
                  tone="danger"
                  onClick={() => onReportComment(comment)}
                >
                  Report
                </MiniAction>

                {canEdit && (
                  <>
                    <MiniAction onClick={() => onEditComment(comment)}>
                      Edit
                    </MiniAction>
                    <MiniAction
                      tone="danger"
                      onClick={() => onDeleteComment(comment.id)}
                    >
                      Delete
                    </MiniAction>
                  </>
                )}

                {canMarkSolution && (
                  <button
                    type="button"
                    onClick={() => onMarkAsSolution(comment.id)}
                    style={{
                      ...buttonBase,
                      marginLeft: isMobile ? 0 : "auto",
                      padding: "8px 12px",
                      fontSize: "12px",
                      backgroundColor: comment.is_solution
                        ? ui.dangerSoft
                        : ui.primary,
                      color: comment.is_solution ? "#991b1b" : "white",
                      border: comment.is_solution
                        ? "1px solid #fecaca"
                        : `1px solid ${ui.primary}`,
                    }}
                  >
                    {comment.is_solution ? "Unmark Solution" : "Mark Solution"}
                  </button>
                )}
              </div>

              {replyingTo === comment.id && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    borderRadius: "20px",
                    border: `1px solid ${ui.border}`,
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write a reply..."
                    style={{
                      width: "100%",
                      minHeight: "82px",
                      padding: "12px 14px",
                      borderRadius: "16px",
                      border: `1px solid ${ui.border}`,
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      lineHeight: 1.55,
                      backgroundColor: "white",
                    }}
                  />

                  <div style={{ marginTop: "10px" }}>
                    <ImageUpload
                      images={replyImages}
                      onImagesChange={setReplyImages}
                      maxImages={5}
                      variant="compact"
                      showHelper={false}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      marginTop: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <ModernButton
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                        setReplyImages([]);
                      }}
                    >
                      Cancel
                    </ModernButton>

                    <ModernButton
                      onClick={() => onSubmitReply(comment.id)}
                      disabled={!replyText.trim() && replyImages.length === 0}
                      variant="purple"
                    >
                      Send Reply
                    </ModernButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
        <div style={{ marginTop: "10px" }}>
          <button
            type="button"
            onClick={() => setShowReplies((previous) => !previous)}
            style={{
              marginLeft: isNested ? 0 : isMobile ? "47px" : "58px",
              border: `1px solid ${ui.border}`,
              backgroundColor: showReplies ? ui.primarySoft : "#f8fafc",
              color: showReplies ? ui.primary : ui.muted,
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {showReplies ? "Hide" : "Show"} {comment.replies.length}{" "}
            {comment.replies.length === 1 ? "reply" : "replies"}
          </button>

          {showReplies && (
            <div style={{ marginTop: "10px" }}>
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  problem={problem}
                  onOpenAuthor={onOpenAuthor}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onMarkAsSolution={onMarkAsSolution}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  replyImages={replyImages}
                  setReplyImages={setReplyImages}
                  onSubmitReply={onSubmitReply}
                  onReportComment={onReportComment}
                  setCurrentImageIndex={setCurrentImageIndex}
                  setModalImages={setModalImages}
                  setShowImageModal={setShowImageModal}
                  editingCommentId={editingCommentId}
                  editText={editText}
                  setEditText={setEditText}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
        alert("Access denied: You are not a member of this forum.");
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
      alert(`Error adding comment: ${error.message}`);
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
      alert("Maximum 5 tags allowed");
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
        alert("Maximum 5 tags allowed");
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
      alert(
        `Error updating problem: ${
          error.response?.data?.detail || error.message
        }`,
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
      alert("Error deleting problem. Please try again.");
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
      alert(
        `Error deleting image: ${error.response?.data?.detail || error.message}`,
      );
    }
  };

  const handleUploadProblemImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (problemImages.length + files.length > 10) {
      alert("Maximum 10 images allowed. Please select fewer images.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          alert(`${file.name} is not an image file`);
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
      alert(
        `Error uploading images: ${error.response?.data?.detail || error.message}`,
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
              borderRadius: "28px",
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
          borderRadius: "34px",
          padding: isMobile ? "14px" : "24px",
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
              borderRadius: "32px",
              padding: isMobile ? "18px" : "30px",
              boxShadow: ui.shadowLg,
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "22px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    color: ui.text,
                    fontSize: isMobile ? "25px" : "34px",
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
                  fontSize: isMobile ? "20px" : "27px",
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
                borderRadius: "22px",
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
                  borderRadius: "22px",
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
                borderRadius: "24px",
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
                        borderRadius: "20px",
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
                          width: "30px",
                          height: "30px",
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
                      borderRadius: "22px",
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
                    <span style={{ fontSize: "34px", lineHeight: 1 }}>+</span>
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
              borderRadius: "34px",
              boxShadow: ui.shadowLg,
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                height: "8px",
                background: `linear-gradient(90deg, ${ui.primary}, ${ui.purple})`,
              }}
            />

            <div style={{ padding: isMobile ? "18px" : "32px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "20px",
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
                        marginBottom: "20px",
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
                      fontSize: isMobile ? "31px" : "48px",
                      lineHeight: 1.08,
                      letterSpacing: "-0.055em",
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
                      marginBottom: "22px",
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
                  background:
                    "linear-gradient(180deg, rgba(248,250,252,0.92), rgba(255,255,255,1))",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "28px",
                  padding: isMobile ? "17px" : "24px",
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
                          borderRadius: "24px",
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
            borderRadius: "30px",
            padding: isMobile ? "16px" : "22px",
            boxShadow: ui.shadowMd,
            marginBottom: "22px",
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
                  fontSize: "20px",
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
            borderRadius: "34px",
            padding: isMobile ? "17px" : "26px",
            boxShadow: ui.shadowLg,
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
                  fontSize: isMobile ? "25px" : "32px",
                  fontWeight: 950,
                  letterSpacing: "-0.04em",
                }}
              >
                Discussion
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

          <form onSubmit={handleSubmitComment}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "auto 1fr auto",
                gap: "12px",
                alignItems: "stretch",
                backgroundColor: "#f8fafc",
                border: `1px solid ${
                  isTextareaFocused ? "rgba(26,77,58,0.42)" : ui.border
                }`,
                borderRadius: "28px",
                padding: "13px",
                boxShadow: isTextareaFocused
                  ? "0 18px 38px rgba(26, 77, 58, 0.10)"
                  : "0 12px 28px rgba(15, 23, 42, 0.05)",
                transition: "all 0.2s ease",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "row" : "column",
                  alignItems: isMobile ? "center" : "stretch",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => currentUser && navigate("/profile")}
                  style={{
                    border: `1px solid ${ui.border}`,
                    backgroundColor: "white",
                    borderRadius: "20px",
                    padding: "9px",
                    cursor: currentUser ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    boxShadow: ui.shadowSm,
                  }}
                >
                  <UserAvatar
                    user={currentUser || { username: "User" }}
                    size={38}
                  />

                  <span
                    style={{
                      display: isMobile ? "inline" : "none",
                      color: ui.primary,
                      fontWeight: 900,
                      fontSize: "13px",
                      maxWidth: "130px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentUser?.username || "User"}
                  </span>
                </button>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    justifyContent: isMobile ? "flex-start" : "center",
                  }}
                >
                  <ModernButton
                    onClick={openCommentMathEditor}
                    style={{
                      padding: "8px 10px",
                      fontSize: "12px",
                      backgroundColor: "white",
                    }}
                  >
                    Symbols
                  </ModernButton>

                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: "999px",
                      padding: "2px 6px",
                      border: `1px solid ${ui.border}`,
                    }}
                  >
                    <ImageUpload
                      images={commentImages}
                      onImagesChange={setCommentImages}
                      maxImages={5}
                      resetTrigger={imageResetKey}
                      variant="compact"
                      showHelper={false}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  backgroundColor: "white",
                  border: `1px solid ${ui.border}`,
                  borderRadius: "22px",
                  overflow: "hidden",
                }}
              >
                <textarea
                  ref={editCommentRef}
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  onFocus={() => setIsTextareaFocused(true)}
                  onBlur={() => setIsTextareaFocused(false)}
                  placeholder="Write a solution idea, question, or comment..."
                  style={{
                    width: "100%",
                    minHeight: isMobile ? "120px" : "135px",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontSize: isMobile ? "16px" : "15px",
                    lineHeight: 1.65,
                    padding: "16px",
                    paddingBottom: commentImages.length > 0 ? "78px" : "16px",
                    backgroundColor: "transparent",
                    color: ui.text,
                  }}
                />

                {commentImages.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: "14px",
                      right: "14px",
                      bottom: "12px",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {commentImages.map((image, index) => (
                      <button
                        type="button"
                        key={image.id || index}
                        onClick={() => openImageModal(index, commentImageUrls)}
                        style={{
                          position: "relative",
                          width: "62px",
                          height: "46px",
                          borderRadius: "14px",
                          overflow: "hidden",
                          border: `1px solid ${ui.border}`,
                          padding: 0,
                          cursor: "pointer",
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        <img
                          src={image.preview}
                          alt={image.name || `Comment image ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />

                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            setCommentImages((previous) =>
                              previous.filter((img) => img.id !== image.id),
                            );
                          }}
                          style={{
                            position: "absolute",
                            top: "-5px",
                            right: "-5px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            backgroundColor: ui.danger,
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 950,
                            display: "grid",
                            placeItems: "center",
                            border: "2px solid white",
                          }}
                        >
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!newComment.trim() && commentImages.length === 0}
                style={{
                  ...buttonBase,
                  minWidth: isMobile ? "100%" : "112px",
                  minHeight: isMobile ? "48px" : "100%",
                  padding: "12px 18px",
                  backgroundColor: ui.purple,
                  color: "white",
                  boxShadow: "0 14px 26px rgba(118, 75, 162, 0.20)",
                  opacity:
                    !newComment.trim() && commentImages.length === 0 ? 0.55 : 1,
                  cursor:
                    !newComment.trim() && commentImages.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Send →
              </button>
            </div>
          </form>

          {comments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "46px 18px",
                border: `1px dashed ${ui.border}`,
                borderRadius: "28px",
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
                  fontSize: "28px",
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
              padding: isMobile ? "18px" : "32px",
            }}
            onClick={closeImageModal}
          >
            <button
              type="button"
              onClick={closeImageModal}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "50%",
                width: "46px",
                height: "46px",
                fontSize: "20px",
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
                    left: isMobile ? "12px" : "28px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "50%",
                    width: isMobile ? "42px" : "54px",
                    height: isMobile ? "42px" : "54px",
                    fontSize: "30px",
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
                    right: isMobile ? "12px" : "28px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(255,255,255,0.14)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "50%",
                    width: isMobile ? "42px" : "54px",
                    height: isMobile ? "42px" : "54px",
                    fontSize: "30px",
                    cursor: "pointer",
                    zIndex: 10000,
                  }}
                >
                  ›
                </button>

                <div
                  style={{
                    position: "absolute",
                    bottom: "22px",
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
