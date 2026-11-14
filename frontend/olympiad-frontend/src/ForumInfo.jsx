/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "./designSystem";
import { getUserInitial, getDisplayName } from "./utils";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { useToast } from "./components/ToastProvider";
import { useConfirm } from "./components/ConfirmProvider";
import "./forumModern.css";
import "./ForumOverview.css";
import MathRenderer from "./MathRenderer";

// Helper function to render math content
const renderMathContent = (text) => {
  if (!text) return "";

  const latexPattern =
    /\\[a-zA-Z]+|\\[^a-zA-Z]|\$\$|\\\(|\\\)|\\\[|\\\]|\^|\_|\{|\}|\[|\]|∫|∑|∏|√|α|β|γ|δ|ε|ζ|η|θ|ι|κ|λ|μ|ν|ξ|ο|π|ρ|σ|τ|υ|φ|χ|ψ|ω|∞|±|∓|×|÷|≤|≥|≠|≈|≡|∈|∉|⊂|⊃|∪|∩|∅|∇|∂|∆|Ω|Φ|Ψ|Λ|Σ|Π|Θ|Ξ|Γ|Δ/;
  if (!latexPattern.test(text)) {
    return text;
  }

  try {
    return <InlineMath math={text} />;
  } catch (error) {
    return text;
  }
};

const ForumInfo = () => {
  const { forumId } = useParams();
  const navigate = useNavigate();
  const [forum, setForum] = useState(null);
  const [problems, setProblems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("members"); // 'members', 'problems'
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  useEffect(() => {
    fetchCurrentUser();
    fetchForum();
    fetchProblems();
    fetchMembers();
  }, [forumId]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchForum = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view forum");
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forumId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setForum(response.data);
    } catch (error) {
      console.error("Error fetching forum:", error);
      if (error.response?.status === 403) {
        setError("Access denied to this forum");
      } else if (error.response?.status === 404) {
        setError("Forum not found");
      } else {
        setError(
          `Failed to load forum: ${error.response?.data?.detail || error.message}`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forumId}/problems`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setProblems(response.data);
    } catch (error) {
      console.error("Error fetching problems:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forumId}/members`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMembers(response.data);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const handleLeaveForum = async () => {
    const confirmed = await confirm({
      title: "Leave forum?",
      message: "Are you sure you want to leave this forum?",
      confirmText: "Leave",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forumId}/leave`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      navigate("/forums");
    } catch (error) {
      console.error("Error leaving forum:", error);
      showToast("Failed to leave forum", "error");
    }
  };

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="profile"
          message="Loading forum info..."
          size="large"
        />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showHomeButton={true}>
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <h2 style={{ color: colors.error }}>{error}</h2>
          <Button
            onClick={() => navigate("/forums")}
            style={{ marginTop: spacing.md }}
          >
            Back to Forums
          </Button>
        </div>
      </Layout>
    );
  }

  if (!forum) return null;

  return (
    <Layout showHomeButton={true}>
      <div className="community-overview">
        <BackButton fallbackPath="/forums" />
        <header className="community-overview-heading"><div><span>{forum.subject} · {forum.is_private?"Private forum":"Public forum"}</span><h1>{forum.title}</h1><p>{forum.description}</p></div><Link to={`/forum/${forumId}?view=discussion`} className="community-overview-open">Open Chat →</Link></header>
        <div className="community-overview-layout">
          <aside className="community-overview-summary"><h2>Community details</h2><dl><dt>Members</dt><dd>{forum.member_count}/{forum.max_members}</dd><dt>Access</dt><dd>{forum.is_private?"Private":"Public"}</dd></dl><Link to={`/forum/${forumId}`}>Forum workspace →</Link><button type="button" onClick={handleLeaveForum}>Leave Forum</button></aside>
          <section className="community-overview-content"><div className="community-overview-tabs" role="group" aria-label="Forum information"><button type="button" aria-pressed={activeTab==='members'} onClick={()=>setActiveTab('members')}>Members ({members.length})</button><button type="button" aria-pressed={activeTab==='problems'} onClick={()=>setActiveTab('problems')}>Problems ({problems.length})</button></div>
            {activeTab==='members'?<div className="community-overview-members">{members.map(member=><article key={member.id}><div className="community-overview-avatar" aria-hidden="true">{getUserInitial(member.user?.username||'?')}</div><div><h3>{getDisplayName(member.user?.username||'Unknown')}</h3><p>Joined {new Date(member.joined_at).toLocaleDateString()}</p></div><span>{member.role}</span></article>)}</div>:<div className="community-overview-problems">{problems.length===0?<p>No problems have been shared in this forum yet.</p>:problems.map(problem=><article key={problem.id}><div><span>{problem.subject}</span><time dateTime={problem.posted_at}>{new Date(problem.posted_at).toLocaleDateString()}</time></div><h3><Link to={`/forum-problem/${problem.id}?from=forum&forumId=${forumId}`}><MathRenderer text={problem.title}/></Link></h3><MathRenderer text={problem.description}/></article>)}</div>}
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default ForumInfo;
