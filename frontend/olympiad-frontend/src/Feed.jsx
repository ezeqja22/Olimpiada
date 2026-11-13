/* eslint-disable react-hooks/exhaustive-deps */
// src/Feed.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import SearchBar from "./SearchBar";
import Layout from "./components/Layout";
import AnimatedLoader from "./components/AnimatedLoader";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import FeedBanner from "./components/feed/FeedBanner";
import FeedTabs from "./components/feed/FeedTabs";
import ProblemCard from "./components/feed/ProblemCard";
import EmptyState from "./components/feed/EmptyState";
import PaginationControls from "./components/feed/PaginationControls";
import FloatingCreateButton from "./components/feed/FloatingCreateButton";
import "./Feed.css";
import { useLanguage } from "./context/LanguageContext";
import { useToast } from "./components/ToastProvider";

function Feed() {
  const { lang } = useLanguage();
  const [loadError, setLoadError] = useState(false);
  const retryPage = useRef(1);
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
  const [currentUser, setCurrentUser] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);

  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();

  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

  const { showToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

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
    retryPage.current = page;
    setLoadError(false);
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
    } catch {
      setLoadError(true);
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
      throw error;
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
      throw error;
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
      throw error;
    }
  };

  const fetchFollowStatus = async (problemsToCheck) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setFollowStatus({});
        return;
      }

      const authorIds = [
        ...new Set(
          problemsToCheck.map((problem) => problem.author?.id).filter(Boolean),
        ),
      ];

      if (authorIds.length === 0) {
        setFollowStatus({});
        return;
      }

      const response = await axios.post(
        `${API_URL}/auth/follow/status/bulk`,
        authorIds,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setFollowStatus(response.data || {});
    } catch (error) {
      console.error("Error fetching follow status:", error);
      setFollowStatus({});
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

    const token = localStorage.getItem("token");

    if (!token) {
      showToast("Please log in to save problems.", "error");
      return;
    }

    const wasBookmarked = Boolean(bookmarkData[problemId]?.isBookmarked);
    const nextBookmarkState = !wasBookmarked;

    // Optimistic UI update
    setBookmarkData((prev) => ({
      ...prev,
      [problemId]: {
        ...(prev[problemId] || {}),
        isBookmarked: nextBookmarkState,
      },
    }));

    try {
      if (wasBookmarked) {
        await axios.delete(`${API_URL}/auth/problems/${problemId}/bookmark`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        await axios.post(
          `${API_URL}/auth/problems/${problemId}/bookmark`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    } catch (error) {
      // If frontend thought it was saved, but backend says it was already unsaved,
      // our optimistic state is already correct.
      if (wasBookmarked && error.response?.status === 404) {
        return;
      }

      // If frontend thought it was not saved, but backend says it was already saved,
      // our optimistic state is already correct.
      if (!wasBookmarked && error.response?.status === 400) {
        return;
      }

      // Roll back UI if it was a real error
      setBookmarkData((prev) => ({
        ...prev,
        [problemId]: {
          ...(prev[problemId] || {}),
          isBookmarked: wasBookmarked,
        },
      }));

      console.error("Error toggling bookmark:", error);
      console.error("Error details:", error.response?.data);

      showToast(
        `Error updating bookmark: ${
          error.response?.data?.detail || error.message
        }`,
        "error",
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
      showToast("Error voting on problem", "error");
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
        showToast("Please log in to follow users", "error");
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
        showToast("Please log in to follow users", "error");
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
      <div className="feed-page">
        <FeedBanner shownCount={problems.length} activeTab={activeTab} />

        <div className="feed-search-shell">
          <SearchBar placeholder="Search problems, users, tags, levels..." />
        </div>

        <FeedTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          problemsCount={problems.length}
        />

        {refreshing && problems.length > 0 && (
          <div className="feed-refreshing-pill">Updating feed...</div>
        )}

        {loadError && <div className="ol-status" role="alert">
          <p>{lang === 'sq' ? 'Problemet nuk u ngarkuan. Provo përsëri.' : 'Could not load problems. Please try again.'}</p>
          <button className="p1-btn" disabled={refreshing} onClick={() => loadFeedPage(retryPage.current, activeTab)}>{lang === 'sq' ? 'Provo përsëri' : 'Retry'}</button>
        </div>}
        {problems.length === 0 ? (loadError ? null :
          <EmptyState emptyState={emptyState} />
        ) : (
          <div
            className={`feed-list ${refreshing ? "feed-list-refreshing" : ""}`}
            aria-busy={refreshing}
          >
            {problems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                activeTab={activeTab}
                currentUser={currentUser}
                voteData={voteData}
                bookmarkData={bookmarkData}
                followStatus={followStatus}
                onVote={handleVote}
                onBookmark={handleBookmark}
                onFollow={handleFollowUser}
                onUnfollow={handleUnfollowUser}
              />
            ))}
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalProblems={totalProblems}
          refreshing={refreshing}
          onPageChange={(page) => loadFeedPage(page, activeTab)}
        />

        <FloatingCreateButton />
      </div>
    </Layout>
  );
}

export default Feed;
