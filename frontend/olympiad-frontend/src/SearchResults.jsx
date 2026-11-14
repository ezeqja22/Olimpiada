/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import SearchBar from "./SearchBar";
import ProblemCard from "./components/feed/ProblemCard";
import "./SearchWorkspace.css";
import Layout from "./components/Layout";
import BackButton from "./components/BackButton";
import FollowButton from "./components/FollowButton";
import { getUserInitial, getDisplayName } from "./utils";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { useToast } from "./components/ToastProvider";

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
  const { showToast } = useToast();
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
      showToast("Error following user", "error");
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
      showToast("Error unfollowing user", "error");
    }
  };

  const handleBookmark = async (problemId) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        showToast("Please log in to bookmark problems", "error");
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
      showToast(
        "Error updating bookmark: " +
          (error.response?.data?.detail || error.message),
        "error",
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
      showToast("Error voting on problem", "error");
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

  if (loading) return <Layout showHomeButton={true}><div className="search-workspace"><p role="status">Searching…</p></div></Layout>;
  return <Layout showHomeButton={true}>
    <div className="search-workspace">
      <BackButton fallbackPath="/feed"/>
      <header className="search-workspace-heading"><span>SEARCH THE COMMUNITY</span><h1>{pageTitle}</h1><SearchBar placeholder="Search users and problems..." initialQuery={query} showAdvanced={true}/></header>
      <div className="search-workspace-layout">
        <aside className="search-workspace-filters"><h2>Results</h2><nav aria-label="Result types">{tabItems.map(tab=><button type="button" key={tab.key} onClick={()=>handleTabChange(tab.key)} aria-pressed={activeTab===tab.key}>{tab.label}<span>{tab.count}</span></button>)}</nav>{filterChips.length>0&&<div className="search-workspace-applied"><h2>Applied filters</h2>{filterChips.map(chip=><p key={`${chip.label}-${chip.value}`}><span>{chip.label}</span><strong>{chip.value}</strong></p>)}</div>}</aside>
        <section className="search-workspace-results"><div className="search-workspace-count">{displayedTotal} result{displayedTotal!==1?'s':''} found</div>
          {errorMessage&&<div role="alert"><h2>Could not load results</h2><p>{errorMessage}</p></div>}
          {!errorMessage&&(activeTab==='all'||activeTab==='users')&&users.length>0&&<section><h2 className="search-workspace-label">People</h2>{users.map(user=><article className="search-person" key={user.id}><Link className="search-person-identity" to={currentUser?.id===user.id?'/profile':`/user/${encodeURIComponent(user.username)}`}><span className="search-person-avatar">{user.profile_picture?<img src={user.profile_picture} alt="" loading="lazy"/>:getUserInitial(user.username)}</span><span><strong>{getDisplayName(user.username)}</strong><small>{user.follower_count} follower{user.follower_count!==1?'s':''}</small></span></Link>{currentUser&&currentUser.id!==user.id&&<FollowButton isFollowing={user.is_following} onFollow={()=>handleFollowUser(user.id)} onUnfollow={()=>handleUnfollowUser(user.id)} size="sm" isDeletedUser={user.username?.startsWith('__deleted_user_')}/>} {user.bio&&<p>{user.bio}</p>}</article>)}</section>}
          {!errorMessage&&(activeTab==='all'||activeTab==='problems')&&problems.length>0&&<section><h2 className="search-workspace-label">Problems</h2>{problems.map(problem=><ProblemCard key={problem.id} problem={problem} problemHref={`/problem/${problem.id}?from=search&q=${encodeURIComponent(query)}&searchTab=${activeTab}`} currentUser={currentUser} voteData={voteData} bookmarkData={{[problem.id]:{isBookmarked:!!bookmarkData[problem.id]}}} showFollow={false} onVote={handleVote} onBookmark={handleBookmark}/>)}</section>}
          {!errorMessage&&!hasVisibleResults&&<div className="search-workspace-empty"><h2>No results found</h2><p>Try another keyword or remove an advanced filter.</p></div>}
          {!errorMessage&&totalPages>1&&<nav className="search-workspace-pagination" aria-label="Search result pages"><button onClick={()=>handlePageChange(currentPage-1)} disabled={currentPage===1}>Previous</button><span>Page {currentPage} of {totalPages}</span><button onClick={()=>handlePageChange(currentPage+1)} disabled={currentPage===totalPages}>Next</button></nav>}
        </section>
      </div>
    </div>
  </Layout>;
};
export default SearchResults;
