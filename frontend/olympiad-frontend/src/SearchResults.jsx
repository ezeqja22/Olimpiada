/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import SearchBar from "./SearchBar";
import Layout from "./components/Layout";
import BackButton from "./components/BackButton";
import FollowButton from "./components/FollowButton";
import { getUserInitial, getDisplayName } from "./utils";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const renderMathContent = (text) => {
  if (!text) return "";

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const content = part.slice(2, -2);
      return (
        <div key={index} style={{ textAlign: "left", margin: "8px 0" }}>
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

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "all";
  const subjects = searchParams.get("subjects") || "";
  const level = searchParams.get("level") || "";
  const year = searchParams.get("year") || "";
  const tags = searchParams.get("tags") || "";

  const [searchResults, setSearchResults] = useState({
    users: [],
    problems: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [voteData, setVoteData] = useState({});
  const [bookmarkData, setBookmarkData] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (category === "users") {
      setActiveTab("users");
    } else if (category === "problems") {
      setActiveTab("problems");
    } else {
      setActiveTab("all");
    }
  }, [category]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, subjects, level, year, tags]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchSearchResults();
  }, [
    query,
    currentPage,
    activeTab,
    subjects,
    level,
    year,
    tags,
    location.search,
  ]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchSearchResults = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const urlParams = new URLSearchParams(location.search);

      const hasAdvancedParams =
        urlParams.get("subjects") ||
        urlParams.get("level") ||
        urlParams.get("year") ||
        urlParams.get("tags");

      let endpoint;

      if (hasAdvancedParams) {
        const params = new URLSearchParams();

        if (query && query.trim()) params.append("q", query.trim());
        if (urlParams.get("category")) {
          params.append("category", urlParams.get("category"));
        }
        if (urlParams.get("subjects")) {
          params.append("subjects", urlParams.get("subjects"));
        }
        if (urlParams.get("level")) {
          params.append("level", urlParams.get("level"));
        }
        if (urlParams.get("year")) {
          params.append("year", urlParams.get("year"));
        }
        if (urlParams.get("tags")) {
          params.append("tags", urlParams.get("tags"));
        }

        params.append("page", currentPage);
        params.append("limit", "10");

        endpoint = `${API_BASE}/auth/search/advanced?${params.toString()}`;
      } else {
        endpoint = `${API_BASE}/auth/search/combined?q=${encodeURIComponent(
          query,
        )}`;
      }

      const response = await axios.get(endpoint, {
        headers: getAuthHeaders(),
      });

      if (hasAdvancedParams) {
        setSearchResults({
          users: response.data.users || [],
          problems: response.data.problems || [],
        });
        setTotalPages(response.data.total_pages || 1);
        setTotalResults(response.data.total_problems || 0);

        if (response.data.problems && response.data.problems.length > 0) {
          await fetchVoteData(response.data.problems);
          await fetchBookmarkData(response.data.problems);
        }
      } else {
        const users = response.data.users || [];
        const problems = response.data.problems || [];

        setSearchResults({ users, problems });
        setTotalPages(1);
        setTotalResults(users.length + problems.length);

        if (problems.length > 0) {
          await fetchVoteData(problems);
          await fetchBookmarkData(problems);
        }
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      setErrorMessage(
        error.response?.data?.detail ||
          "Something went wrong while loading search results.",
      );
      setSearchResults({ users: [], problems: [] });
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoteData = async (problemsList) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        const defaultVoteData = {};
        problemsList.forEach((problem) => {
          defaultVoteData[problem.id] = {
            like_count: 0,
            dislike_count: 0,
            user_vote: null,
          };
        });
        setVoteData(defaultVoteData);
        return;
      }

      let currentUserId = currentUser?.id || null;

      if (!currentUserId) {
        try {
          const userResponse = await axios.get(`${API_BASE}/auth/me`, {
            headers: getAuthHeaders(),
          });
          currentUserId = userResponse.data.id;
        } catch (error) {
          console.error("Error fetching current user for vote data:", error);
        }
      }

      const votePromises = problemsList.map(async (problem) => {
        const problemId = problem.id;

        try {
          const response = await axios.get(
            `${API_BASE}/auth/problems/${problemId}/votes`,
            {
              headers: getAuthHeaders(),
            },
          );

          let likeCount = 0;
          let dislikeCount = 0;
          let userVote = null;

          if (Array.isArray(response.data)) {
            response.data.forEach((vote) => {
              if (vote.vote_type === "like") {
                likeCount += 1;

                if (vote.user_id === currentUserId) {
                  userVote = "like";
                }
              }

              if (vote.vote_type === "dislike") {
                dislikeCount += 1;

                if (vote.user_id === currentUserId) {
                  userVote = "dislike";
                }
              }
            });
          }

          return {
            problemId,
            voteData: {
              like_count: likeCount,
              dislike_count: dislikeCount,
              user_vote: userVote,
            },
          };
        } catch (error) {
          console.error(
            `Error fetching vote data for problem ${problemId}:`,
            error,
          );

          return {
            problemId,
            voteData: {
              like_count: 0,
              dislike_count: 0,
              user_vote: null,
            },
          };
        }
      });

      const voteResults = await Promise.all(votePromises);
      const voteDataMap = {};

      voteResults.forEach(({ problemId, voteData }) => {
        voteDataMap[problemId] = voteData;
      });

      setVoteData(voteDataMap);
    } catch (error) {
      console.error("Error fetching vote data:", error);
    }
  };

  const fetchBookmarkData = async (problemsList) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        const defaultBookmarkData = {};
        problemsList.forEach((problem) => {
          defaultBookmarkData[problem.id] = false;
        });
        setBookmarkData(defaultBookmarkData);
        return;
      }

      const problemIds = problemsList.map((problem) => problem.id);
      let response;

      try {
        response = await axios.post(
          `${API_BASE}/auth/problems/bookmark-status`,
          { problem_ids: problemIds },
          {
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
          },
        );
      } catch (firstError) {
        response = await axios.post(
          `${API_BASE}/auth/problems/bookmark-status`,
          problemIds,
          {
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const convertedData = {};

      Object.keys(response.data).forEach((problemId) => {
        convertedData[problemId] = response.data[problemId].isBookmarked;
      });

      setBookmarkData(convertedData);
    } catch (error) {
      console.error("Error fetching bookmark data:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      await axios.post(
        `${API_BASE}/auth/follow/${userId}`,
        {},
        {
          headers: getAuthHeaders(),
        },
      );

      fetchSearchResults();
    } catch (error) {
      console.error("Error following user:", error);
      alert("Error following user");
    }
  };

  const handleUnfollowUser = async (userId) => {
    try {
      await axios.delete(`${API_BASE}/auth/follow/${userId}`, {
        headers: getAuthHeaders(),
      });

      fetchSearchResults();
    } catch (error) {
      console.error("Error unfollowing user:", error);
      alert("Error unfollowing user");
    }
  };

  const handleBookmark = async (problemId) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to bookmark problems");
        return;
      }

      const isCurrentlyBookmarked = bookmarkData[problemId];

      if (isCurrentlyBookmarked) {
        await axios.delete(`${API_BASE}/auth/problems/${problemId}/bookmark`, {
          headers: getAuthHeaders(),
        });

        setBookmarkData((prev) => ({
          ...prev,
          [problemId]: false,
        }));
      } else {
        await axios.post(
          `${API_BASE}/auth/problems/${problemId}/bookmark`,
          {},
          {
            headers: getAuthHeaders(),
          },
        );

        setBookmarkData((prev) => ({
          ...prev,
          [problemId]: true,
        }));
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      alert(
        `Error updating bookmark: ${
          error.response?.data?.detail || error.message
        }`,
      );
    }
  };

  const handleVote = async (problemId, voteType) => {
    try {
      const response = await axios.post(
        `${API_BASE}/auth/problems/${problemId}/vote`,
        { vote_type: voteType },
        {
          headers: getAuthHeaders(),
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

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const users = searchResults.users || [];
  const problems = searchResults.problems || [];

  const displayedTotal = totalResults || users.length + problems.length;

  const filterChips = [
    subjects && {
      label: "Subjects",
      value: subjects
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean)
        .join(", "),
    },
    level && {
      label: "Level",
      value: level,
    },
    year && {
      label: "Year",
      value: year,
    },
    tags && {
      label: "Tags",
      value: tags,
    },
  ].filter(Boolean);

  const hasFilters = filterChips.length > 0;

  const tabItems = [
    {
      key: "all",
      label: "All Results",
      count: users.length + problems.length,
    },
    {
      key: "users",
      label: "Users",
      count: users.length,
    },
    {
      key: "problems",
      label: "Problems",
      count: problems.length,
    },
  ];

  const hasVisibleResults =
    (activeTab === "all" && (users.length > 0 || problems.length > 0)) ||
    (activeTab === "users" && users.length > 0) ||
    (activeTab === "problems" && problems.length > 0);

  const pageTitle = query?.trim()
    ? `Search results for “${query}”`
    : hasFilters
      ? "Advanced search results"
      : "Search results";

  const styles = `
    .sr-page {
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;
      padding: 18px 16px 56px;
      box-sizing: border-box;
    }

    .sr-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .sr-hero {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 30px;
      background:
        radial-gradient(circle at top right, rgba(26, 77, 58, 0.15), transparent 34%),
        linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
      padding: 34px;
      margin-bottom: 22px;
    }

    .sr-hero::before {
      content: "";
      position: absolute;
      width: 230px;
      height: 230px;
      right: -90px;
      bottom: -120px;
      border-radius: 999px;
      background: rgba(26, 77, 58, 0.08);
      pointer-events: none;
    }

    .sr-kicker {
      width: fit-content;
      padding: 7px 11px;
      border-radius: 999px;
      background: rgba(26, 77, 58, 0.08);
      border: 1px solid rgba(26, 77, 58, 0.12);
      color: #1a4d3a;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .sr-title {
      margin: 0;
      color: #0f172a;
      font-size: clamp(30px, 4vw, 48px);
      line-height: 1.02;
      font-weight: 950;
      letter-spacing: -0.055em;
      max-width: 820px;
    }

    .sr-subtitle {
      margin: 14px 0 0;
      color: #64748b;
      font-size: 16px;
      line-height: 1.65;
      max-width: 720px;
      font-weight: 500;
    }

    .sr-count-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 22px;
    }

    .sr-stat-pill,
    .sr-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 13px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 800;
      border: 1px solid #e2e8f0;
      background: rgba(255, 255, 255, 0.76);
      color: #475569;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
    }

    .sr-stat-pill strong {
      color: #1a4d3a;
    }

    .sr-filter-chip span {
      color: #1a4d3a;
      font-weight: 900;
    }

    .sr-search-panel {
      border: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 24px;
      background: #ffffff;
      padding: 20px;
      margin-bottom: 22px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.07);
    }

    .sr-search-helper {
      margin: 10px 0 0;
      color: #64748b;
      font-size: 14px;
      font-weight: 500;
    }

    .sr-tabs-wrap {
      position: sticky;
      top: 0;
      z-index: 5;
      padding: 8px 0 18px;
      background: linear-gradient(to bottom, rgba(248, 250, 252, 0.96), rgba(248, 250, 252, 0));
      backdrop-filter: blur(8px);
    }

    .sr-tabs {
      display: flex;
      gap: 8px;
      padding: 7px;
      border-radius: 18px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
      overflow-x: auto;
    }

    .sr-tab {
      border: none;
      border-radius: 13px;
      padding: 12px 16px;
      cursor: pointer;
      background: transparent;
      color: #64748b;
      font-size: 14px;
      font-weight: 900;
      white-space: nowrap;
      transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }

    .sr-tab:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .sr-tab.active {
      background: #1a4d3a;
      color: #ffffff;
      box-shadow: 0 10px 22px rgba(26, 77, 58, 0.22);
    }

    .sr-tab-count {
      margin-left: 7px;
      opacity: 0.82;
    }

    .sr-section {
      margin-top: 22px;
    }

    .sr-section-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
    }

    .sr-section-title {
      margin: 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 950;
      letter-spacing: -0.035em;
    }

    .sr-section-note {
      margin: 5px 0 0;
      color: #64748b;
      font-size: 14px;
      font-weight: 500;
    }

    .sr-users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
      gap: 16px;
    }

    .sr-user-card,
    .sr-problem-card {
      position: relative;
      border: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 24px;
      background: #ffffff;
      box-shadow: 0 14px 38px rgba(15, 23, 42, 0.07);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
      overflow: hidden;
    }

    .sr-user-card:hover,
    .sr-problem-card:hover {
      transform: translateY(-3px);
      border-color: rgba(26, 77, 58, 0.25);
      box-shadow: 0 22px 55px rgba(15, 23, 42, 0.12);
    }

    .sr-user-card {
      padding: 18px;
    }

    .sr-user-top {
      display: flex;
      align-items: center;
      gap: 14px;
    }

.sr-avatar {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background-color: #1a4d3a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 950;
  background-size: cover;
  background-position: center;
  box-shadow: 0 12px 25px rgba(26, 77, 58, 0.18);
  border: 2px solid white;
  outline: 1px solid #e2e8f0;
  overflow: hidden;
}

.sr-avatar.small {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  font-size: 16px;
}

    .sr-user-info {
      flex: 1;
      min-width: 0;
    }

    .sr-user-name,
    .sr-problem-title {
      margin: 0;
      color: #0f172a;
      font-weight: 950;
      letter-spacing: -0.025em;
    }

    .sr-user-name {
      font-size: 17px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sr-user-meta,
    .sr-problem-meta {
      margin: 5px 0 0;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
    }

    .sr-user-bio {
      margin: 14px 0 0;
      color: #475569;
      font-size: 14px;
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sr-follow-wrap {
      flex: 0 0 auto;
    }

    .sr-problems-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sr-problem-card {
      padding: 20px;
    }

    .sr-problem-main {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .sr-problem-content {
      flex: 1;
      min-width: 0;
    }

    .sr-problem-title {
      font-size: 19px;
      line-height: 1.35;
    }

    .sr-problem-description {
      margin: 14px 0 0;
      color: #475569;
      font-size: 14px;
      line-height: 1.65;
      max-height: 72px;
      overflow: hidden;
      white-space: pre-wrap;
    }

    .sr-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .sr-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 11px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 900;
      border: 1px solid transparent;
    }

    .sr-badge.subject {
      background: rgba(26, 77, 58, 0.08);
      color: #1a4d3a;
      border-color: rgba(26, 77, 58, 0.12);
    }

    .sr-badge.level {
      background: #fff7ed;
      color: #9a3412;
      border-color: #fed7aa;
    }

    .sr-badge.year {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .sr-badge.tag {
      background: #f5f3ff;
      color: #6d28d9;
      border-color: #ddd6fe;
    }

    .sr-actions-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }

    .sr-vote-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .sr-action-btn,
    .sr-comment-pill {
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 999px;
      padding: 0 11px;
      font-size: 13px;
      font-weight: 900;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      color: #475569;
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    }

    .sr-action-btn {
      cursor: pointer;
    }

    .sr-action-btn:hover {
      transform: translateY(-1px);
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .sr-action-btn.active-like {
      background: rgba(26, 77, 58, 0.09);
      border-color: rgba(26, 77, 58, 0.28);
      color: #1a4d3a;
    }

    .sr-action-btn.active-dislike {
      background: rgba(109, 40, 217, 0.08);
      border-color: rgba(109, 40, 217, 0.22);
      color: #6d28d9;
    }

    .sr-action-icon {
      width: 14px;
      height: 14px;
      object-fit: contain;
    }

    .sr-bookmark-btn {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }

    .sr-bookmark-btn:hover {
      background: rgba(26, 77, 58, 0.06);
      transform: translateY(-1px);
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
    }

    .sr-bookmark-btn img {
      width: 17px;
      height: 17px;
      object-fit: contain;
    }

    .sr-empty,
    .sr-error {
      text-align: center;
      border: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 28px;
      background:
        radial-gradient(circle at top, rgba(26, 77, 58, 0.08), transparent 34%),
        #ffffff;
      padding: 52px 22px;
      margin-top: 24px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.07);
    }

    .sr-empty-icon {
      width: 62px;
      height: 62px;
      margin: 0 auto 16px;
      border-radius: 999px;
      background: rgba(26, 77, 58, 0.08);
      color: #1a4d3a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 950;
    }

    .sr-empty h3,
    .sr-error h3 {
      margin: 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 950;
      letter-spacing: -0.03em;
    }

    .sr-empty p,
    .sr-error p {
      margin: 8px auto 0;
      color: #64748b;
      max-width: 480px;
      line-height: 1.6;
      font-weight: 500;
    }

    .sr-loading {
      min-height: 55vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sr-loading-card {
      width: min(420px, 100%);
      border-radius: 28px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
      padding: 34px;
      text-align: center;
    }

    .sr-loader {
      width: 46px;
      height: 46px;
      border-radius: 999px;
      border: 4px solid #e2e8f0;
      border-top-color: #1a4d3a;
      margin: 0 auto 18px;
      animation: srSpin 0.9s linear infinite;
    }

    @keyframes srSpin {
      to {
        transform: rotate(360deg);
      }
    }

    .sr-loading-card h2 {
      margin: 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 950;
      letter-spacing: -0.03em;
    }

    .sr-loading-card p {
      margin: 8px 0 0;
      color: #64748b;
      font-weight: 500;
    }

    .sr-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 34px;
      flex-wrap: wrap;
    }

    .sr-page-btn {
      border: none;
      border-radius: 999px;
      padding: 11px 17px;
      background: #1a4d3a;
      color: #ffffff;
      cursor: pointer;
      font-weight: 950;
      box-shadow: 0 12px 24px rgba(26, 77, 58, 0.20);
      transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
    }

    .sr-page-btn:hover:not(:disabled) {
      background: #163f31;
      transform: translateY(-1px);
    }

    .sr-page-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    .sr-page-indicator {
      color: #475569;
      font-size: 14px;
      font-weight: 900;
      padding: 10px 14px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }

    @media (max-width: 768px) {
      .sr-page {
        padding: 12px 12px 44px;
      }

      .sr-hero {
        padding: 24px 20px;
        border-radius: 24px;
      }

      .sr-search-panel {
        padding: 16px;
        border-radius: 22px;
      }

      .sr-tabs-wrap {
        position: static;
      }

      .sr-tabs {
        padding: 6px;
      }

      .sr-tab {
        flex: 1;
        padding: 11px 12px;
        font-size: 13px;
      }

      .sr-section-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .sr-users-grid {
        grid-template-columns: 1fr;
      }

      .sr-problem-main {
        gap: 12px;
      }

      .sr-problem-card,
      .sr-user-card {
        border-radius: 22px;
        padding: 16px;
      }

      .sr-actions-row {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `;

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <style>{styles}</style>

        <div className="sr-page">
          <div className="sr-loading">
            <div className="sr-loading-card">
              <div className="sr-loader" />
              <h2>Searching...</h2>
              <p>Finding the most relevant users and problems.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <style>{styles}</style>

      <div className="sr-page">
        <div className="sr-top-row">
          <BackButton fallbackPath="/feed" />
        </div>

        <section className="sr-hero">
          <div className="sr-kicker">Search</div>

          <h1 className="sr-title">{pageTitle}</h1>

          <p className="sr-subtitle">
            Browse matching problems and users. Refine the search with keywords,
            subjects, years, levels, or tags.
          </p>

          <div className="sr-count-row">
            <div className="sr-stat-pill">
              <strong>{displayedTotal}</strong>
              result{displayedTotal !== 1 ? "s" : ""} found
            </div>

            {filterChips.map((chip) => (
              <div
                className="sr-filter-chip"
                key={`${chip.label}-${chip.value}`}
              >
                {chip.label}: <span>{chip.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sr-search-panel">
          <SearchBar
            placeholder="Search users and problems..."
            initialQuery={query}
            showAdvanced={true}
          />

          <p className="sr-search-helper">
            Modify your search or use advanced filters for a more precise
            result.
          </p>
        </section>

        <div className="sr-tabs-wrap">
          <div className="sr-tabs">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`sr-tab ${activeTab === tab.key ? "active" : ""}`}
              >
                {tab.label}
                <span className="sr-tab-count">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <section className="sr-error">
            <h3>Could not load results</h3>
            <p>{errorMessage}</p>
          </section>
        )}

        {!errorMessage &&
          (activeTab === "all" || activeTab === "users") &&
          users.length > 0 && (
            <section className="sr-section">
              <div className="sr-section-header">
                <div>
                  <h2 className="sr-section-title">Users</h2>
                  <p className="sr-section-note">
                    People matching your search.
                  </p>
                </div>
              </div>

              <div className="sr-users-grid">
                {users.map((user) => {
                  const isCurrentUser =
                    currentUser && currentUser.id === user.id;
                  const isDeletedUser =
                    user.username?.startsWith("__deleted_user_");

                  return (
                    <article
                      key={user.id}
                      className="sr-user-card"
                      onClick={() => {
                        if (isCurrentUser) {
                          navigate("/profile");
                        } else {
                          navigate(`/user/${user.username}`);
                        }
                      }}
                    >
                      <div className="sr-user-top">
                        <div
                          className="sr-avatar"
                          style={{
                            backgroundImage: user.profile_picture
                              ? `url(${user.profile_picture})`
                              : "none",
                          }}
                        >
                          {!user.profile_picture &&
                            getUserInitial(user.username)}
                        </div>

                        <div className="sr-user-info">
                          <h3 className="sr-user-name">
                            {getDisplayName(user.username)}
                          </h3>

                          <p className="sr-user-meta">
                            {user.follower_count} follower
                            {user.follower_count !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {currentUser && currentUser.id !== user.id && (
                          <div
                            className="sr-follow-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FollowButton
                              isFollowing={user.is_following}
                              onFollow={() => handleFollowUser(user.id)}
                              onUnfollow={() => handleUnfollowUser(user.id)}
                              size="sm"
                              isDeletedUser={isDeletedUser}
                            />
                          </div>
                        )}
                      </div>

                      {user.bio && <p className="sr-user-bio">{user.bio}</p>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

        {!errorMessage &&
          (activeTab === "all" || activeTab === "problems") &&
          problems.length > 0 && (
            <section className="sr-section">
              <div className="sr-section-header">
                <div>
                  <h2 className="sr-section-title">Problems</h2>
                  <p className="sr-section-note">
                    Olympiad problems matching your filters.
                  </p>
                </div>
              </div>

              <div className="sr-problems-list">
                {problems.map((problem) => {
                  const author = problem.author || {};
                  const authorUsername = author.username || "Unknown user";

                  return (
                    <article
                      key={problem.id}
                      className="sr-problem-card"
                      onClick={() =>
                        navigate(
                          `/problem/${
                            problem.id
                          }?from=search&q=${encodeURIComponent(
                            query,
                          )}&searchTab=${activeTab}`,
                        )
                      }
                    >
                      <div className="sr-problem-main">
                        <div
                          className="sr-avatar small"
                          style={{
                            backgroundImage: author.profile_picture
                              ? `url(${author.profile_picture})`
                              : "none",
                          }}
                        >
                          {!author.profile_picture &&
                            getUserInitial(authorUsername)}
                        </div>

                        <div className="sr-problem-content">
                          <h3 className="sr-problem-title">
                            {renderMathContent(problem.title)}
                          </h3>

                          <p className="sr-problem-meta">
                            by {getDisplayName(authorUsername)} •{" "}
                            {problem.created_at
                              ? new Date(
                                  problem.created_at,
                                ).toLocaleDateString()
                              : "Unknown date"}
                          </p>

                          {problem.description && (
                            <div className="sr-problem-description">
                              {renderMathContent(problem.description)}
                            </div>
                          )}

                          <div className="sr-badges">
                            {problem.subject && (
                              <span className="sr-badge subject">
                                {problem.subject}
                              </span>
                            )}

                            {problem.level && (
                              <span className="sr-badge level">
                                {problem.level}
                              </span>
                            )}

                            {problem.year && (
                              <span className="sr-badge year">
                                Year: {problem.year}
                              </span>
                            )}

                            {problem.tags &&
                              problem.tags.trim() &&
                              problem.tags.split(",").map((tag, index) => {
                                const trimmedTag = tag.trim();

                                if (!trimmedTag) return null;

                                return (
                                  <span
                                    key={`${problem.id}-${trimmedTag}-${index}`}
                                    className="sr-badge tag"
                                  >
                                    {trimmedTag}
                                  </span>
                                );
                              })}
                          </div>

                          <div className="sr-actions-row">
                            <div className="sr-vote-group">
                              <button
                                type="button"
                                className={`sr-action-btn ${
                                  voteData[problem.id]?.user_vote === "like"
                                    ? "active-like"
                                    : ""
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(problem.id, "like");
                                }}
                              >
                                <img
                                  src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795079/Like_Icon_hf3gef.svg"
                                  alt=""
                                  className="sr-action-icon"
                                />
                                {voteData[problem.id]?.like_count || 0}
                              </button>

                              <button
                                type="button"
                                className={`sr-action-btn ${
                                  voteData[problem.id]?.user_vote === "dislike"
                                    ? "active-dislike"
                                    : ""
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(problem.id, "dislike");
                                }}
                              >
                                <img
                                  src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795077/Dislike_icon_vdy4ss.svg"
                                  alt=""
                                  className="sr-action-icon"
                                />
                                {voteData[problem.id]?.dislike_count || 0}
                              </button>

                              <span className="sr-comment-pill">
                                <img
                                  src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg"
                                  alt=""
                                  className="sr-action-icon"
                                />
                                {problem.comment_count || 0} comments
                              </span>
                            </div>

                            <button
                              type="button"
                              className="sr-bookmark-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookmark(problem.id);
                              }}
                              aria-label="Bookmark problem"
                            >
                              <img
                                src={
                                  bookmarkData[problem.id]
                                    ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797449/Save_FULL_Icon_Green_fdrxbj.svg"
                                    : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797443/Save_UNFULL_Icon_Green_wvn6qk.svg"
                                }
                                alt=""
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

        {!errorMessage && !hasVisibleResults && (
          <section className="sr-empty">
            <div className="sr-empty-icon">?</div>

            <h3>No results found</h3>

            <p>
              No users or problems matched this search. Try a different keyword
              or remove one of the advanced filters.
            </p>
          </section>
        )}

        {!errorMessage && totalPages > 1 && (
          <div className="sr-pagination">
            <button
              type="button"
              className="sr-page-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span className="sr-page-indicator">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="sr-page-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SearchResults;
