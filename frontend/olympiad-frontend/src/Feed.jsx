/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
// src/Feed.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import SearchBar from "./SearchBar";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import FollowButton from "./components/FollowButton";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { getUserInitial, getDisplayName } from "./utils";
import { useFeatureSettings } from "./hooks/useFeatureSettings";

// Helper function to render math content
const renderMathContent = (text) => {
  if (!text) return "";

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const content = part.slice(2, -2);
      return (
        <div
          key={index}
          style={{
            textAlign: "left",
            margin: "10px 0",
            overflowX: "auto",
          }}
        >
          <BlockMath math={content} />
        </div>
      );
    } else if (part.startsWith("$") && part.endsWith("$")) {
      const content = part.slice(1, -1);
      return <InlineMath key={index} math={content} />;
    }

    return <span key={index}>{part}</span>;
  });
};

function Feed() {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");

    return ["all", "following", "trending"].includes(tab) ? tab : "all";
  };

  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [voteData, setVoteData] = useState({});
  const [followStatus, setFollowStatus] = useState({});
  const [bookmarkData, setBookmarkData] = useState({});
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);

  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();

  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    loadFeedPage(1, activeTab);
  }, [activeTab]);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get("tab");

    if (
      tabParam &&
      ["all", "following", "trending"].includes(tabParam) &&
      tabParam !== activeTab
    ) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;

    setActiveTab(tab);
    navigate(`/feed?tab=${tab}`, { replace: true });
  };

  const loadFeedPage = async (page = 1, tab = activeTab) => {
    const isInitialLoad = !hasLoadedOnce.current && problems.length === 0;

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      if (tab === "all") {
        await fetchProblems(page);
      } else if (tab === "following") {
        await fetchFollowingProblems(page);
      } else if (tab === "trending") {
        await fetchTrendingProblems(page);
      }

      hasLoadedOnce.current = true;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const hydrateProblemMetadata = (problemList) => {
    const problemIds = problemList.map((problem) => problem.id);

    if (problemIds.length === 0) {
      setVoteData({});
      setBookmarkData({});
      setFollowStatus({});
      return;
    }

    Promise.allSettled([
      fetchVoteData(problemIds),
      fetchBookmarkData(problemIds),
      fetchFollowStatus(problemList),
    ]);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");

    setProblems([]);
    setVoteData({});
    setFollowStatus({});

    navigate("/homepage", { replace: true });
  };

  const fetchProblems = async (page = 1) => {
    try {
      const response = await axios.get(
        `${API_URL}/auth/problems/?page=${page}&limit=10`,
      );

      const allProblems = response.data.problems || response.data;

      const standaloneProblems = allProblems.filter(
        (problem) =>
          problem.forum_id === null || problem.forum_id === undefined,
      );

      setProblems(standaloneProblems);
      setCurrentPage(page);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(
        response.data.total_problems ||
          response.data.total ||
          standaloneProblems.length,
      );

      hydrateProblemMetadata(standaloneProblems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      setProblems([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalProblems(0);
    }
  };

  const fetchFollowingProblems = async (page = 1) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/auth/feed/following?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const allProblems = Array.isArray(response.data.problems)
        ? response.data.problems
        : Array.isArray(response.data)
          ? response.data
          : [];

      const filteredProblems = allProblems.filter((problem) => {
        if (problem.forum_id === null || problem.forum_id === undefined) {
          return true;
        }

        return problem.user_is_forum_member === true;
      });

      setProblems(filteredProblems);
      setCurrentPage(page);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(
        response.data.total_problems ||
          response.data.total ||
          filteredProblems.length,
      );

      hydrateProblemMetadata(filteredProblems);
    } catch (error) {
      console.error("Error fetching following problems:", error);
      setProblems([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalProblems(0);
      hydrateProblemMetadata([]);
    }
  };

  const fetchTrendingProblems = async (page = 1) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/auth/problems/trending?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const allProblems = response.data.problems || [];

      const standaloneProblems = allProblems.filter(
        (problem) =>
          problem.forum_id === null || problem.forum_id === undefined,
      );

      setProblems(standaloneProblems);
      setCurrentPage(page);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(
        response.data.total_problems ||
          response.data.total ||
          standaloneProblems.length,
      );

      hydrateProblemMetadata(standaloneProblems);
    } catch (error) {
      console.error("Error fetching trending problems:", error);
      setProblems([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalProblems(0);
      hydrateProblemMetadata([]);
    }
  };

  const fetchFollowStatus = async (problems) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const followPromises = problems.map(async (problem) => {
        if (!problem.author) return { authorId: null, isFollowing: false };

        try {
          const response = await axios.get(
            `${API_URL}/auth/follow/status/${problem.author.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          return {
            authorId: problem.author.id,
            isFollowing: response.data.is_following,
          };
        } catch (error) {
          return { authorId: problem.author.id, isFollowing: false };
        }
      });

      const results = await Promise.all(followPromises);
      const followStatusMap = {};

      results.forEach((result) => {
        followStatusMap[result.authorId] = result.isFollowing;
      });

      setFollowStatus(followStatusMap);
    } catch (error) {
      console.error("Error fetching follow status:", error);
    }
  };

  const fetchVoteData = async (problemIds) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/auth/problems/vote-status-bulk`,
        problemIds,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setVoteData(response.data || {});
    } catch (error) {
      console.error("Error fetching vote data:", error);
    }
  };

  const fetchBookmarkData = async (problemIds) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/auth/problems/bookmark-status`,
        problemIds,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setBookmarkData(response.data);
    } catch (error) {
      console.error("Error fetching bookmark data:", error);

      const bookmarkDataMap = {};
      problemIds.forEach((problemId) => {
        bookmarkDataMap[problemId] = { isBookmarked: false };
      });

      setBookmarkData(bookmarkDataMap);
    }
  };

  const handleBookmark = async (problemId) => {
    if (!checkFeatureEnabled("bookmarks_enabled")) {
      showFeatureDisabledAlert("Bookmarks");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const isCurrentlyBookmarked = bookmarkData[problemId]?.isBookmarked;

      if (isCurrentlyBookmarked) {
        try {
          await axios.delete(`${API_URL}/auth/problems/${problemId}/bookmark`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          setBookmarkData((prev) => ({
            ...prev,
            [problemId]: { isBookmarked: false },
          }));
        } catch (deleteError) {
          if (deleteError.response?.status === 404) {
            await axios.post(
              `${API_URL}/auth/problems/${problemId}/bookmark`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            setBookmarkData((prev) => ({
              ...prev,
              [problemId]: { isBookmarked: true },
            }));
          } else {
            throw deleteError;
          }
        }
      } else {
        try {
          await axios.post(
            `${API_URL}/auth/problems/${problemId}/bookmark`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          setBookmarkData((prev) => ({
            ...prev,
            [problemId]: { isBookmarked: true },
          }));
        } catch (postError) {
          if (postError.response?.status === 400) {
            await axios.delete(
              `${API_URL}/auth/problems/${problemId}/bookmark`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            setBookmarkData((prev) => ({
              ...prev,
              [problemId]: { isBookmarked: false },
            }));
          } else {
            throw postError;
          }
        }
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      console.error("Error details:", error.response?.data);
      alert(
        `Error updating bookmark: ${
          error.response?.data?.detail || error.message
        }`,
      );
    }
  };

  const handleVote = async (problemId, voteType) => {
    if (!checkFeatureEnabled("voting_enabled")) {
      showFeatureDisabledAlert("Voting");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/auth/problems/${problemId}/vote`,
        { vote_type: voteType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setVoteData((prev) => ({
        ...prev,
        [problemId]: response.data,
      }));
    } catch (error) {
      console.error("Error voting:", error);
      alert("Error voting on problem");
    }
  };

  const handleFollow = async (authorId, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (!checkFeatureEnabled("following_enabled")) {
      showFeatureDisabledAlert("Following");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to follow users");
        return;
      }

      const isFollowing = followStatus[authorId];

      if (isFollowing) {
        await axios.delete(`${API_URL}/auth/follow/${authorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setFollowStatus((prev) => ({ ...prev, [authorId]: false }));
      } else {
        await axios.post(
          `${API_URL}/auth/follow/${authorId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        setFollowStatus((prev) => ({ ...prev, [authorId]: true }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const handleFollowUser = async (authorId) => {
    if (!checkFeatureEnabled("following_enabled")) {
      showFeatureDisabledAlert("Following");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to follow users");
        return;
      }

      await axios.post(
        `${API_URL}/auth/follow/${authorId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setFollowStatus((prev) => ({ ...prev, [authorId]: true }));
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleUnfollowUser = async (authorId) => {
    if (!checkFeatureEnabled("following_enabled")) {
      showFeatureDisabledAlert("Following");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to follow users");
        return;
      }

      await axios.delete(`${API_URL}/auth/follow/${authorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFollowStatus((prev) => ({ ...prev, [authorId]: false }));
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/auth/users/search?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setSearchResults(response.data.users);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;

    setSearchQuery(query);
    searchUsers(query);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const getEmptyStateContent = () => {
    if (activeTab === "following") {
      return {
        title: "You're not following anyone yet",
        description:
          "Follow other users to see their problems here. Switch to All Problems to discover people.",
        buttonText: null,
      };
    }

    if (activeTab === "trending") {
      return {
        title: "No trending problems yet",
        description:
          "Problems with more comments and engagement will appear here.",
        buttonText: "Create a Problem",
      };
    }

    return {
      title: "No problems yet",
      description: "Be the first to create a science problem.",
      buttonText: "Create First Problem",
    };
  };

  const emptyState = getEmptyStateContent();

  if (loading && problems.length === 0) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="problems"
          message="Loading problems..."
          size="large"
        />
      </Layout>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <style>
        {`
          .feed-page {
            width: 100%;
            max-width: 1120px;
            margin: 0 auto;
            padding: 8px 0 120px;
            box-sizing: border-box;
          }

          .feed-mini-banner {
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 18px;
            padding: 22px 24px;
            border-radius: 24px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            background:
              radial-gradient(circle at top right, rgba(26, 77, 58, 0.10), transparent 34%),
              linear-gradient(135deg, #ffffff 0%, #f8fafc 72%, #eef7f2 100%);
            box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05);
          }

          .feed-mini-banner-content {
            position: relative;
            z-index: 1;
            min-width: 0;
          }

          .feed-mini-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            color: #1a4d3a;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .feed-mini-kicker-dot {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: #1a4d3a;
            box-shadow: 0 0 0 4px rgba(26, 77, 58, 0.10);
          }

          .feed-mini-title {
            margin: 0;
            color: #0f172a;
            font-size: 27px;
            line-height: 1.15;
            font-weight: 950;
            letter-spacing: -0.035em;
          }

          .feed-mini-subtitle {
            margin: 7px 0 0;
            max-width: 680px;
            color: #64748b;
            font-size: 14px;
            line-height: 1.65;
            font-weight: 550;
          }

          .feed-mini-stats {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .feed-mini-stat {
            min-width: 88px;
            padding: 12px 14px;
            border-radius: 18px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            background: rgba(255, 255, 255, 0.78);
            text-align: center;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
          }

          .feed-mini-stat-value {
            display: block;
            color: #1a4d3a;
            font-size: 18px;
            font-weight: 950;
            line-height: 1;
          }

          .feed-mini-stat-label {
            display: block;
            margin-top: 5px;
            color: #94a3b8;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .feed-hero {
            position: relative;
            overflow: hidden;
            background:
              radial-gradient(circle at top right, rgba(26, 77, 58, 0.14), transparent 32%),
              linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eef7f2 100%);
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 28px;
            padding: 34px 34px;
            margin-bottom: 22px;
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
          }

          .feed-hero::after {
            content: "";
            position: absolute;
            width: 220px;
            height: 220px;
            border-radius: 999px;
            right: -90px;
            bottom: -110px;
            background: rgba(26, 77, 58, 0.08);
            filter: blur(6px);
          }

          .feed-kicker {
            width: fit-content;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 13px;
            border-radius: 999px;
            color: #1a4d3a;
            background: rgba(26, 77, 58, 0.08);
            border: 1px solid rgba(26, 77, 58, 0.12);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 14px;
          }

          .feed-title {
            color: #1a4d3a;
            font-size: 42px;
            line-height: 1.05;
            font-weight: 900;
            letter-spacing: -0.04em;
            margin: 0 0 12px;
          }

          .feed-subtitle {
            color: #64748b;
            font-size: 15px;
            line-height: 1.7;
            max-width: 690px;
            margin: 0;
            font-weight: 500;
          }

          .feed-search-shell {
            margin-bottom: 18px;
            background: rgba(255,255,255,0.72);
            border: 1px solid rgba(226,232,240,0.95);
            border-radius: 22px;
            padding: 12px;
            box-shadow: 0 12px 30px rgba(15,23,42,0.04);
            backdrop-filter: blur(12px);
          }

          .feed-tabs-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 22px;
            padding: 9px;
            background: rgba(255,255,255,0.84);
            border: 1px solid rgba(226,232,240,0.95);
            border-radius: 22px;
            box-shadow: 0 14px 40px rgba(15,23,42,0.05);
            backdrop-filter: blur(12px);
          }

          .feed-tabs {
            display: flex;
            flex: 1;
            gap: 7px;
            background: #f1f5f9;
            border-radius: 17px;
            padding: 5px;
          }

          .feed-tab-button {
            flex: 1;
            border: none;
            border-radius: 13px;
            padding: 11px 12px;
            cursor: pointer;
            background: transparent;
            color: #64748b;
            font-size: 13px;
            font-weight: 800;
            transition: all 0.22s ease;
          }

          .feed-tab-button:hover {
            color: #1a4d3a;
            background: rgba(255,255,255,0.7);
          }

          .feed-tab-button.active {
            background: #1a4d3a;
            color: white;
            box-shadow: 0 10px 20px rgba(26,77,58,0.18);
          }

          .feed-count {
            min-width: fit-content;
            padding: 0 12px;
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
          }

          .feed-count strong {
            color: #1a4d3a;
          }

          .problem-card {
            position: relative;
            overflow: hidden;
            margin-bottom: 18px;
            cursor: pointer;
            border-radius: 26px !important;
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          }

          .problem-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 22px 55px rgba(26,77,58,0.10) !important;
          }

          .problem-card::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: radial-gradient(circle at top right, rgba(26,77,58,0.08), transparent 28%);
            opacity: 0;
            transition: opacity 0.25s ease;
          }

          .problem-card:hover::before {
            opacity: 1;
          }

          .problem-author-row {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 18px;
          }

          .problem-author-main {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .problem-avatar {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            background-color: #1a4d3a;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: 900;
            background-size: cover;
            background-position: center;
            box-shadow: 0 12px 25px rgba(26,77,58,0.18);
            border: 2px solid white;
            outline: 1px solid #e2e8f0;
            flex-shrink: 0;
          }

          .problem-author-name {
            font-weight: 900;
            font-size: 14px;
            color: #1a4d3a;
            cursor: pointer;
            text-decoration: none;
            transition: color 0.2s ease;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 220px;
          }

          .problem-author-name:hover {
            text-decoration: underline;
          }

          .problem-date {
            font-size: 12px;
            color: #94a3b8;
            font-weight: 700;
            margin-top: 3px;
          }

          .problem-title {
            position: relative;
            z-index: 1;
            margin: 0 0 12px;
            color: #0f172a;
            font-size: 22px;
            line-height: 1.32;
            font-weight: 900;
            letter-spacing: -0.02em;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
            pointer-events: none;
          }

          .problem-card:hover .problem-title {
            color: #1a4d3a;
          }

          .problem-description {
            position: relative;
            z-index: 1;
            color: #475569;
            line-height: 1.7;
            white-space: pre-wrap;
            pointer-events: none;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
            font-size: 14px;
            margin-bottom: 18px;
          }

          .problem-footer {
            position: relative;
            z-index: 1;
            display: flex;
            gap: 16px;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            padding-top: 17px;
            border-top: 1px solid #f1f5f9;
          }

          .problem-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .problem-tag {
            padding: 6px 11px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            pointer-events: none;
            border: 1px solid transparent;
          }

          .tag-subject {
            background: #e0e7ff;
            color: #3730a3;
            border-color: #c7d2fe;
          }

          .tag-level {
            background: #fef3c7;
            color: #92400e;
            border-color: #fde68a;
          }

          .tag-year {
            background: #dcfce7;
            color: #166534;
            border-color: #bbf7d0;
          }

          .problem-actions {
            display: flex;
            align-items: center;
            gap: 9px;
            flex-wrap: wrap;
          }

          .action-button,
          .comment-pill,
          .bookmark-button {
            height: 40px;
            border-radius: 14px;
            padding: 0 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .action-button:hover,
          .bookmark-button:hover {
            background: white;
            border-color: rgba(26,77,58,0.35);
            color: #1a4d3a;
            box-shadow: 0 8px 18px rgba(15,23,42,0.06);
            transform: translateY(-1px);
          }

          .action-button.active-like {
            background: rgba(26,77,58,0.10);
            border-color: rgba(26,77,58,0.35);
            color: #1a4d3a;
          }

          .action-button.active-dislike {
            background: rgba(118,75,162,0.10);
            border-color: rgba(118,75,162,0.35);
            color: rgb(118,75,162);
          }

          .action-icon {
            height: 17px;
            width: 17px;
            object-fit: contain;
            pointer-events: none;
          }

          .bookmark-button.saved {
            background: #1a4d3a;
            border-color: #1a4d3a;
            color: white;
            box-shadow: 0 12px 24px rgba(26,77,58,0.18);
          }

          .feed-refreshing-pill {
            width: fit-content;
            margin: -10px 0 16px auto;
            padding: 8px 13px;
            border-radius: 999px;
            background: rgba(26, 77, 58, 0.08);
            color: #1a4d3a;
            border: 1px solid rgba(26, 77, 58, 0.14);
            font-size: 12px;
            font-weight: 850;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
          }

          .feed-list-refreshing {
            opacity: 0.78;
            transition: opacity 0.2s ease;
          }

          .empty-state {
            text-align: center;
            margin-top: 28px;
            padding: 58px 24px;
            background:
              radial-gradient(circle at top, rgba(26,77,58,0.08), transparent 34%),
              white;
            border: 1px dashed #cbd5e1;
            border-radius: 28px;
            box-shadow: 0 18px 45px rgba(15,23,42,0.05);
          }

          .empty-icon {
            width: 58px;
            height: 58px;
            border-radius: 20px;
            margin: 0 auto 16px;
            background: rgba(26,77,58,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a4d3a;
            font-size: 26px;
            font-weight: 900;
          }

          .empty-state h3 {
            margin: 0 0 8px;
            color: #0f172a;
            font-size: 22px;
          }

          .empty-state p {
            margin: 0 auto 22px;
            color: #64748b;
            max-width: 480px;
            line-height: 1.6;
          }

          .empty-create-button {
            padding: 12px 20px;
            background: #1a4d3a;
            color: white;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            font-weight: 900;
            box-shadow: 0 14px 28px rgba(26,77,58,0.20);
            transition: all 0.2s ease;
          }

          .empty-create-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 34px rgba(26,77,58,0.25);
          }

          .pagination-shell {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 14px;
            margin-top: 28px;
            padding-bottom: 42px;
            flex-wrap: wrap;
          }

          .pagination-text {
            padding: 10px 16px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 999px;
            font-size: 14px;
            color: #64748b;
            font-weight: 800;
            box-shadow: 0 8px 22px rgba(15,23,42,0.04);
          }

          .fab-link {
            text-decoration: none;
          }

.create-fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 1000;
  height: 62px;
  width: 62px;
  background: #1a4d3a;
  color: #ffffff;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18px 40px rgba(26,77,58,0.30);
  transition: width 0.45s cubic-bezier(0.34,1.56,0.64,1),
    background 0.2s ease,
    box-shadow 0.2s ease;
  overflow: hidden;
  white-space: nowrap;
}

.create-fab::before {
  content: "+";
  color: #ffffff;
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -52%);
  transition: all 0.3s ease;
}

.create-fab:hover {
  width: 230px;
  background: #163f31;
  justify-content: flex-start;
  padding-left: 22px;
  box-shadow: 0 22px 50px rgba(26,77,58,0.36);
}

.create-fab:hover::before {
  left: 28px;
  transform: translateY(-52%) rotate(90deg);
}

.fab-plus {
  display: none;
}

.fab-text {
  margin-left: 42px;
  font-size: 14px;
  font-weight: 900;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.22s ease 0.08s;
}

.create-fab:hover .fab-text {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 768px) {
  .create-fab {
    bottom: 22px;
    right: 20px;
    height: 58px;
    width: 58px;
  }

  .create-fab:hover {
    width: 205px;
  }
}

            .fab-plus {
              width: 58px;
              min-width: 58px;
              height: 58px;
            }
          }
        `}
      </style>

      <div className="feed-page">
        {/* Minimal Feed Banner */}
        <section className="feed-mini-banner">
          <div className="feed-mini-banner-content">
            <div className="feed-mini-kicker">
              <span className="feed-mini-kicker-dot" />
              <span>Science Practice Hub</span>
            </div>

            <h1 className="feed-mini-title">Science Problems Feed</h1>

            <p className="feed-mini-subtitle">
              Explore olympiad-style science problems, follow strong creators,
              save useful questions, and discuss solutions with the community.
            </p>
          </div>

          <div className="feed-mini-stats">
            <div className="feed-mini-stat">
              <span className="feed-mini-stat-value">{problems.length}</span>
              <span className="feed-mini-stat-label">Shown</span>
            </div>

            <div className="feed-mini-stat">
              <span className="feed-mini-stat-value">{activeTab}</span>
              <span className="feed-mini-stat-label">Feed</span>
            </div>
          </div>
        </section>

        {/* Search */}
        <div className="feed-search-shell">
          <SearchBar placeholder="Search problems, users, tags, levels..." />
        </div>

        {/* Tabs */}
        <section className="feed-tabs-card">
          <div className="feed-tabs">
            <button
              onClick={() => handleTabChange("all")}
              className={`feed-tab-button ${activeTab === "all" ? "active" : ""}`}
            >
              All Problems
            </button>

            <button
              onClick={() => handleTabChange("following")}
              className={`feed-tab-button ${
                activeTab === "following" ? "active" : ""
              }`}
            >
              Following
            </button>

            <button
              onClick={() => handleTabChange("trending")}
              className={`feed-tab-button ${
                activeTab === "trending" ? "active" : ""
              }`}
            >
              Trending
            </button>
          </div>

          <div className="feed-count">
            <strong>{problems.length}</strong>{" "}
            {problems.length === 1 ? "problem" : "problems"} shown
          </div>
        </section>

        {refreshing && problems.length > 0 && (
          <div className="feed-refreshing-pill">Updating feed...</div>
        )}

        {problems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">Σ</div>

            <h3>{emptyState.title}</h3>

            <p>{emptyState.description}</p>

            {emptyState.buttonText && (
              <Link to="/create-problem?from=/feed">
                <button className="empty-create-button">
                  {emptyState.buttonText}
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className={refreshing ? "feed-list-refreshing" : ""}>
            {problems.map((problem) => (
              <Card
                key={problem.id}
                hover={true}
                className="problem-card"
                style={{
                  marginBottom: spacing.lg,
                  cursor: "pointer",
                  border: "1px solid rgba(226,232,240,0.95)",
                  boxShadow: "0 14px 36px rgba(15,23,42,0.05)",
                  background: "rgba(255,255,255,0.96)",
                }}
                onClick={() =>
                  navigate(`/problem/${problem.id}?from=feed&tab=${activeTab}`)
                }
              >
                {problem.author ? (
                  <div className="problem-author-row">
                    <div className="problem-author-main">
                      <div
                        className="problem-avatar"
                        style={{
                          backgroundImage: problem.author.profile_picture
                            ? `url(${problem.author.profile_picture})`
                            : "none",
                        }}
                      >
                        {!problem.author.profile_picture &&
                          getUserInitial(problem.author.username)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          className="problem-author-name"
                          onClick={(e) => {
                            e.stopPropagation();

                            if (
                              currentUser &&
                              problem.author.id === currentUser.id
                            ) {
                              navigate("/profile");
                            } else {
                              navigate(`/user/${problem.author.username}`);
                            }
                          }}
                        >
                          {getDisplayName(problem.author.username)}
                        </div>

                        <div className="problem-date">
                          {new Date(problem.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {currentUser && problem.author.id !== currentUser.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ flexShrink: 0 }}
                      >
                        <FollowButton
                          isFollowing={followStatus[problem.author.id]}
                          onFollow={() => handleFollowUser(problem.author.id)}
                          onUnfollow={() =>
                            handleUnfollowUser(problem.author.id)
                          }
                          size="sm"
                          style={{ marginLeft: "auto" }}
                          isDeletedUser={problem.author.username.startsWith(
                            "__deleted_user_",
                          )}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="problem-author-row">
                    <div className="problem-author-main">
                      <div
                        className="problem-avatar"
                        style={{
                          backgroundColor: "#64748b",
                          boxShadow: "0 12px 25px rgba(100,116,139,0.18)",
                        }}
                      >
                        ?
                      </div>

                      <div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: "14px",
                            color: "#334155",
                          }}
                        >
                          Unknown Author
                        </div>

                        <div className="problem-date">
                          {new Date(problem.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="problem-title">
                  {renderMathContent(problem.title)}
                </h3>

                <div className="problem-description">
                  {renderMathContent(problem.description)}
                </div>

                <div className="problem-footer">
                  <div className="problem-tags">
                    {problem.subject && (
                      <span className="problem-tag tag-subject">
                        {problem.subject}
                      </span>
                    )}

                    {problem.level && problem.level.trim() && (
                      <span className="problem-tag tag-level">
                        {problem.level}
                      </span>
                    )}

                    {problem.year && (
                      <span className="problem-tag tag-year">
                        Year {problem.year}
                      </span>
                    )}
                  </div>

                  <div className="problem-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(problem.id, "like");
                      }}
                      className={`action-button ${
                        voteData[problem.id]?.user_vote === "like"
                          ? "active-like"
                          : ""
                      }`}
                    >
                      <img
                        src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795079/Like_Icon_hf3gef.svg"
                        alt="Like"
                        className="action-icon"
                      />
                      {voteData[problem.id]?.like_count || 0}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(problem.id, "dislike");
                      }}
                      className={`action-button ${
                        voteData[problem.id]?.user_vote === "dislike"
                          ? "active-dislike"
                          : ""
                      }`}
                    >
                      <img
                        src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795077/Dislike_icon_vdy4ss.svg"
                        alt="Dislike"
                        className="action-icon"
                      />
                      {voteData[problem.id]?.dislike_count || 0}
                    </button>

                    <div className="comment-pill">
                      <img
                        src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg"
                        alt="Comments"
                        className="action-icon"
                      />
                      <span>{problem.comment_count || 0}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookmark(problem.id);
                      }}
                      className={`bookmark-button ${
                        bookmarkData[problem.id]?.isBookmarked ? "saved" : ""
                      }`}
                    >
                      <img
                        src={
                          bookmarkData[problem.id]?.isBookmarked
                            ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797449/Save_FULL_Icon_Green_fdrxbj.svg"
                            : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797443/Save_UNFULL_Icon_Green_wvn6qk.svg"
                        }
                        alt="Bookmark"
                        className="action-icon"
                      />

                      <span>
                        {bookmarkData[problem.id]?.isBookmarked
                          ? "Saved"
                          : "Save"}
                      </span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-shell">
            <Button
              onClick={() => loadFeedPage(currentPage - 1, activeTab)}
              disabled={currentPage === 1 || refreshing}
              variant={currentPage === 1 || refreshing ? "ghost" : "primary"}
              size="md"
            >
              ← Previous
            </Button>

            <span className="pagination-text">
              Page {currentPage} of {totalPages} · {totalProblems} total
            </span>

            <Button
              onClick={() => loadFeedPage(currentPage + 1, activeTab)}
              disabled={currentPage === totalPages || refreshing}
              variant={
                currentPage === totalPages || refreshing ? "ghost" : "primary"
              }
              size="md"
            >
              Next →
            </Button>
          </div>
        )}

        {/* Floating Create Problem Button */}
        <Link to="/create-problem?from=/feed" className="fab-link">
          <div className="create-fab" title="Create New Problem">
            <span className="fab-plus">+</span>
            <span className="fab-text">Create Problem</span>
          </div>
        </Link>
      </div>
    </Layout>
  );
}

export default Feed;
