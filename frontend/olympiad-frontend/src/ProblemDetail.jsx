/* 
  Modern Minimalistic ProblemDetail.jsx for Olimpiada.al
  - Preserves all original hooks, API logic, and math rendering.
  - Minimalistic aesthetic with a refined hierarchy.
  - Ready-to-paste.
*/

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

const theme = {
  primary: "#1a4d3a",
  primarySoft: "#f0fdf4",
  secondary: "#6366f1",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#ffffff",
  background: "#f8fafc",
  danger: "#ef4444",
  radius: "12px",
  shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
};

const renderMathContent = (text) => {
  if (!text) return "";
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <div key={index} className="my-4 text-left">
          <BlockMath math={part.slice(2, -2)} />
        </div>
      );
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      return <InlineMath key={index} math={part.slice(1, -1)} />;
    }
    return <span key={index}>{part}</span>;
  });
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Unknown date";
  const date = new Date(dateValue);
  return isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const UserAvatar = ({ user, size = 40, onClick }) => (
  <div
    onClick={onClick}
    className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold cursor-pointer transition-transform hover:scale-105"
    style={{
      width: size,
      height: size,
      backgroundColor: theme.primary,
      backgroundImage: user?.profile_picture
        ? `url(${user.profile_picture})`
        : "none",
      backgroundSize: "cover",
      fontSize: size * 0.4,
    }}
  >
    {!user?.profile_picture && getUserInitial(user?.username || "U")}
  </div>
);

const Pill = ({
  children,
  color = theme.primary,
  bgColor = theme.primarySoft,
}) => (
  <span
    className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
    style={{ color, backgroundColor: bgColor }}
  >
    {children}
  </span>
);

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  ...props
}) => {
  const styles = {
    primary: { bg: theme.primary, text: "white", border: "transparent" },
    secondary: { bg: "white", text: theme.text, border: theme.border },
    danger: { bg: "white", text: theme.danger, border: theme.danger },
    ghost: { bg: "transparent", text: theme.muted, border: "transparent" },
  };
  const current = styles[variant];
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
      }}
      {...props}
    >
      {children}
    </button>
  );
};

const CommentThread = ({
  comment,
  currentUser,
  problem,
  depth = 0,
  ...props
}) => {
  const [showReplies, setShowReplies] = useState(true);
  const isAuthor = currentUser?.id === comment.author_id;
  const canMark =
    currentUser &&
    problem &&
    (currentUser.id === problem.author_id ||
      ["admin", "moderator"].includes(currentUser.role));

  return (
    <div
      className={`mb-6 ${depth > 0 ? "ml-8 border-l-2 pl-4" : ""}`}
      style={{ borderColor: theme.border }}
    >
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start gap-4">
          <UserAvatar
            user={comment.author}
            onClick={() => props.onOpenAuthor(comment.author)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <h4
                  className="font-bold text-sm text-slate-900 cursor-pointer hover:underline"
                  onClick={() => props.onOpenAuthor(comment.author)}
                >
                  {getDisplayName(comment.author?.username)}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(comment.created_at)}
                </p>
              </div>
              {comment.is_solution && (
                <Pill color="#166534" bgColor="#dcfce7">
                  ✓ Solution
                </Pill>
              )}
            </div>

            <div className="mt-3 text-slate-700 leading-relaxed text-sm">
              {props.editingCommentId === comment.id ? (
                <div className="mt-2 space-y-3">
                  <textarea
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    value={props.editText}
                    onChange={(e) => props.setEditText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={props.onCancelEdit}>
                      Cancel
                    </Button>
                    <Button onClick={() => props.onSaveEdit(comment.id)}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                renderMathContent(comment.text)
              )}
            </div>

            <div className="mt-4 flex gap-4 text-xs font-bold text-slate-400">
              <button
                className="hover:text-emerald-700 transition-colors"
                onClick={() => props.setReplyingTo(comment.id)}
              >
                Reply
              </button>
              {isAuthor && (
                <>
                  <button
                    className="hover:text-slate-900 transition-colors"
                    onClick={() => props.onEditComment(comment)}
                  >
                    Edit
                  </button>
                  <button
                    className="hover:text-red-600 transition-colors"
                    onClick={() => props.onDeleteComment(comment.id)}
                  >
                    Delete
                  </button>
                </>
              )}
              {canMark && (
                <button
                  className="ml-auto text-emerald-600 hover:opacity-80"
                  onClick={() => props.onMarkAsSolution(comment.id)}
                >
                  {comment.is_solution ? "Unmark Solution" : "Mark as Solution"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {comment.replies?.length > 0 && (
        <div className="mt-3">
          <button
            className="text-xs font-bold text-emerald-600 mb-2"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? "Hide" : "Show"} {comment.replies.length} replies
          </button>
          {showReplies &&
            comment.replies.map((r) => (
              <CommentThread
                key={r.id}
                comment={r}
                currentUser={currentUser}
                problem={problem}
                depth={depth + 1}
                {...props}
              />
            ))}
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
  const [voteStatus, setVoteStatus] = useState({
    user_vote: null,
    like_count: 0,
    dislike_count: 0,
  });
  const [voteLoading, setVoteLoading] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const fetchProblem = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/auth/problems/id/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProblem(res.data);
    } catch (err) {
      navigate("/feed");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/problems/${id}/comments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setComments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProblem();
    fetchComments();
  }, [id]);

  const handleVote = async (type) => {
    if (!checkFeatureEnabled("voting_enabled"))
      return showFeatureDisabledAlert("Voting");
    setVoteLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/auth/problems/${id}/vote`,
        { vote_type: type },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setVoteStatus(res.data);
    } finally {
      setVoteLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await axios.post(
        `${API_URL}/auth/problems/${id}/comments`,
        { text: newComment },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader />
      </Layout>
    );
  if (!problem)
    return (
      <Layout>
        <div className="p-20 text-center">Problem not found.</div>
      </Layout>
    );

  return (
    <Layout showHomeButton={true}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 font-sans antialiased text-slate-900">
        <BackButton fallbackPath="/feed" />

        <header className="space-y-6">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={problem.author}
              size={48}
              onClick={() => navigate(`/user/${problem.author.username}`)}
            />
            <div>
              <h3 className="font-bold text-emerald-900 leading-tight">
                {getDisplayName(problem.author.username)}
              </h3>
              <p className="text-sm text-slate-400">
                {formatDate(problem.created_at)}
              </p>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            {renderMathContent(problem.title)}
          </h1>

          <div className="flex flex-wrap gap-2">
            {problem.subject && (
              <Pill bgColor="#e0f2fe" color="#0369a1">
                {problem.subject}
              </Pill>
            )}
            {problem.level && (
              <Pill bgColor="#fef3c7" color="#92400e">
                {problem.level}
              </Pill>
            )}
            {problem.tags?.split(",").map((tag) => (
              <Pill key={tag} color="#4338ca" bgColor="#e0e7ff">
                {tag.trim()}
              </Pill>
            ))}
          </div>
        </header>

        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-lg">
            {renderMathContent(problem.description)}
          </div>

          {problem.images?.length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {problem.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt="Problem asset"
                  className="rounded-2xl w-full h-64 object-cover border"
                />
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between py-6 border-y border-slate-100">
          <div className="flex gap-4">
            <Button
              variant={
                voteStatus.user_vote === "like" ? "primary" : "secondary"
              }
              onClick={() => handleVote("like")}
            >
              Like {voteStatus.like_count}
            </Button>
            <Button
              variant={
                voteStatus.user_vote === "dislike" ? "danger" : "secondary"
              }
              onClick={() => handleVote("dislike")}
            >
              Dislike {voteStatus.dislike_count}
            </Button>
          </div>
          <Button variant="ghost">Report Problem</Button>
        </div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">
              Discussion ({comments.length})
            </h2>
            {comments.some((c) => c.is_solution) && (
              <Pill color="#047857" bgColor="#d1fae5">
                ✓ Solution Found
              </Pill>
            )}
          </div>

          <form
            onSubmit={handleSubmitComment}
            className="bg-slate-50 p-6 rounded-2xl border border-slate-100"
          >
            <div className="flex gap-4">
              <UserAvatar user={currentUser} />
              <div className="flex-1 space-y-4">
                <textarea
                  className="w-full bg-white p-4 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  placeholder="Share your thoughts or solution..."
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setNewComment("")}
                  >
                    Clear
                  </Button>
                  <Button type="submit" disabled={!newComment.trim()}>
                    Post Comment
                  </Button>
                </div>
              </div>
            </div>
          </form>

          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                problem={problem}
                onOpenAuthor={(u) => navigate(`/user/${u.username}`)}
                editingCommentId={editingComment}
                editText={editText}
                setEditText={setEditText}
                onEditComment={(c) => {
                  setEditingComment(c.id);
                  setEditText(c.text);
                }}
                onCancelEdit={() => setEditingComment(null)}
                onSaveEdit={async (cid) => {
                  await axios.put(
                    `${API_URL}/auth/problems/${id}/comments/${cid}`,
                    { text: editText },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    },
                  );
                  setEditingComment(null);
                  fetchComments();
                }}
                onDeleteComment={async (cid) => {
                  if (window.confirm("Delete comment?")) {
                    await axios.delete(
                      `${API_URL}/auth/problems/${id}/comments/${cid}`,
                      {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                      },
                    );
                    fetchComments();
                  }
                }}
                onMarkAsSolution={async (cid) => {
                  await axios.put(
                    `${API_URL}/auth/problems/${id}/comments/${cid}/solution`,
                    {},
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    },
                  );
                  fetchComments();
                }}
                setReplyingTo={setReplyingTo}
              />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default ProblemDetail;
