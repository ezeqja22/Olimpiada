/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { colors, spacing, typography } from "./designSystem";
import { getUserInitial, getDisplayName } from "./utils";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import Layout from "./components/Layout";
import Card from "./components/Card";
import SearchBar from "./SearchBar";
import FollowButton from "./components/FollowButton";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { useToast } from "./ToastProvider";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 10;

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

function SubjectPage() {
  const { subject } = useParams();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);

  const [voteData, setVoteData] = useState({});
  const [bookmarkData, setBookmarkData] = useState({});
  const [followStatus, setFollowStatus] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const { showToast } = useToast();

  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();

  const subjectName = subject
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
    fetchProblems(1);
  }, [subject]);

  useEffect(() => {
    if (currentPage !== 1) {
      fetchProblems(currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const fetchProblems = async (page = 1) => {
    console.log(
      "🚀 fetchProblems called for subject:",
      subjectName,
      "page:",
      page,
    );

    setLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}/auth/problems/by-subject/${encodeURIComponent(
          subjectName,
        )}?page=${page}&limit=${PAGE_SIZE}`,
      );

      const fetchedProblems = response.data.problems || [];

      console.log("📋 Problems fetched:", fetchedProblems.length);

      setProblems(fetchedProblems);
      setAllProblems(fetchedProblems);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(response.data.total_problems || 0);

      await Promise.allSettled([
        fetchVoteData(fetchedProblems),
        fetchBookmarkData(fetchedProblems),
        fetchFollowStatus(fetchedProblems),
      ]);

      console.log("✅ Subject page data loaded");
    } catch (error) {
      console.error("❌ Error fetching problems:", error);
      console.error("Subject name being used:", subjectName);

      setProblems([]);
      setAllProblems([]);
      setTotalPages(1);
      setTotalProblems(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoteData = async (problemsList) => {
    console.log("🔍 fetchVoteData called with problems:", problemsList.length);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        const voteDataMap = {};

        problemsList.forEach((problem) => {
          voteDataMap[problem.id] = {
            like_count: 0,
            dislike_count: 0,
            user_vote: null,
          };
        });

        setVoteData(voteDataMap);
        return;
      }

      const problemIds = problemsList.map((problem) => problem.id);

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
      console.error("❌ Error fetching bulk vote data:", error);
    }
  };

  const fetchBookmarkData = async (problemsList) => {
    console.log(
      "🔍 fetchBookmarkData called with problems:",
      problemsList.length,
    );

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        const bookmarkDataMap = {};

        problemsList.forEach((problem) => {
          bookmarkDataMap[problem.id] = false;
        });

        setBookmarkData(bookmarkDataMap);
        return;
      }

      const problemIds = problemsList.map((problem) => problem.id);

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

      const convertedData = {};

      Object.keys(response.data || {}).forEach((problemId) => {
        convertedData[problemId] = response.data[problemId].isBookmarked;
      });

      setBookmarkData(convertedData);
    } catch (error) {
      console.error("❌ Error fetching bookmark data:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
    }
  };

  const fetchFollowStatus = async (problemsList) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const followPromises = problemsList.map(async (problem) => {
        if (!problem.author) {
          return {
            authorId: null,
            isFollowing: false,
          };
        }

        try {
          const response = await axios.get(
            `${API_URL}/auth/follow/status/${problem.author.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          return {
            authorId: problem.author.id,
            isFollowing: response.data.is_following,
          };
        } catch (error) {
          return {
            authorId: problem.author.id,
            isFollowing: false,
          };
        }
      });

      const results = await Promise.all(followPromises);
      const followStatusMap = {};

      results.forEach((result) => {
        if (result.authorId !== null) {
          followStatusMap[result.authorId] = result.isFollowing;
        }
      });

      setFollowStatus(followStatusMap);
    } catch (error) {
      console.error("Error fetching follow status:", error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) return;

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const handleVote = async (problemId, voteType) => {
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

  const handleBookmark = async (problemId) => {
    if (!checkFeatureEnabled("bookmarks_enabled")) {
      showFeatureDisabledAlert("Bookmarks");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        showToast("Please log in to bookmark problems", "error");
        return;
      }

      const isCurrentlyBookmarked = bookmarkData[problemId];

      if (isCurrentlyBookmarked) {
        try {
          await axios.delete(`${API_URL}/auth/problems/${problemId}/bookmark`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          setBookmarkData((prev) => ({
            ...prev,
            [problemId]: false,
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
              [problemId]: true,
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
            [problemId]: true,
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
              [problemId]: false,
            }));
          } else {
            throw postError;
          }
        }
      }
    } catch (error) {
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setFollowStatus((prev) => ({
        ...prev,
        [authorId]: true,
      }));
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFollowStatus((prev) => ({
        ...prev,
        [authorId]: false,
      }));
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  const handleLocalSearch = (query) => {
    setSearchQuery(query);
    filterProblems(query);
  };

  const handleLocalAdvancedSearch = (advancedData) => {
    setSearchQuery(advancedData.query || "");
    filterProblemsAdvanced(advancedData);
  };

  const filterProblems = (query) => {
    if (!query.trim()) {
      setProblems(allProblems);
      setTotalPages(1);
      return;
    }

    const filtered = allProblems.filter((problem) => {
      const searchTerm = query.toLowerCase();
      const title = problem.title || "";
      const description = problem.description || "";
      const tags = problem.tags || "";
      const level = problem.level || "";
      const year = problem.year ? problem.year.toString() : "";

      return (
        title.toLowerCase().includes(searchTerm) ||
        description.toLowerCase().includes(searchTerm) ||
        tags.toLowerCase().includes(searchTerm) ||
        level.toLowerCase().includes(searchTerm) ||
        year.includes(searchTerm)
      );
    });

    setProblems(filtered);
    setTotalPages(1);
  };

  const filterProblemsAdvanced = (filters) => {
    let filtered = [...allProblems];

    if (filters.query && filters.query.trim()) {
      const searchTerm = filters.query.toLowerCase();

      filtered = filtered.filter((problem) => {
        const title = problem.title || "";
        const description = problem.description || "";
        const tags = problem.tags || "";

        return (
          title.toLowerCase().includes(searchTerm) ||
          description.toLowerCase().includes(searchTerm) ||
          tags.toLowerCase().includes(searchTerm)
        );
      });
    }

    if (filters.subjects && filters.subjects.length > 0) {
      filtered = filtered.filter((problem) =>
        filters.subjects.includes(problem.subject),
      );
    }

    if (filters.level && filters.level.trim()) {
      filtered = filtered.filter(
        (problem) =>
          problem.level &&
          problem.level.toLowerCase().includes(filters.level.toLowerCase()),
      );
    }

    if (filters.year && filters.year.trim()) {
      filtered = filtered.filter(
        (problem) =>
          problem.year && problem.year.toString().includes(filters.year),
      );
    }

    if (filters.tags && filters.tags.trim()) {
      const tagTerms = filters.tags
        .toLowerCase()
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      filtered = filtered.filter(
        (problem) =>
          problem.tags &&
          tagTerms.some((term) => problem.tags.toLowerCase().includes(term)),
      );
    }

    setProblems(filtered);
    setTotalPages(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
      return;
    }

    setSearchQuery("");
    setCurrentPage(newPage);
  };

  const paginatedProblems = problems;
  const displayedCount = searchQuery ? problems.length : totalProblems;

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="subject"
          message={`Loading ${subjectName} problems...`}
          size="large"
        />
      </Layout>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <BackButton
            fallbackPath="/homepage"
            style={{
              backgroundColor: colors.light,
              color: colors.gray[600],
              border: `1px solid ${colors.gray[300]}`,
              borderRadius: "8px",
              padding: "8px 16px",
            }}
            hoverStyle={{
              backgroundColor: colors.primary,
              color: colors.white,
              borderColor: colors.primary,
              transform: "translateY(-1px)",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: isMobile ? "1.5rem" : "2.5rem",
            fontWeight: "700",
            color: "#1a4d3a",
            marginBottom: "0.5rem",
          }}
        >
          {subjectName} Problems
        </h1>

        <p
          style={{
            fontSize: isMobile ? "0.9rem" : "1.1rem",
            color: "#666",
            marginBottom: "1rem",
          }}
        >
          {displayedCount} problems found in {subjectName}
          {searchQuery && ` on this page (filtered by "${searchQuery}")`}
        </p>

        <div
          style={{
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
            }}
          >
            <SearchBar
              placeholder={`Search within current ${subjectName} page...`}
              searchMode="subject"
              lockedSubject={subjectName}
              onLocalSearch={handleLocalSearch}
              onAdvancedSearch={handleLocalAdvancedSearch}
            />
          </div>
        </div>
      </div>

      {problems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            backgroundColor: "white",
            borderRadius: "12px",
            border: "1px solid #e9ecef",
          }}
        >
          <h3 style={{ color: "#1a4d3a", marginBottom: "1rem" }}>
            No {subjectName} problems found
          </h3>

          <p style={{ color: "#666", marginBottom: "2rem" }}>
            {searchQuery
              ? "Try a different search term or clear your search."
              : `Be the first to create a ${subjectName.toLowerCase()} problem.`}
          </p>

          {!searchQuery && (
            <Link
              to={`/create-problem?from=/subject/${encodeURIComponent(
                subject,
              )}`}
            >
              <button
                style={{
                  backgroundColor: "#1a4d3a",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Create Problem
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(400px, 1fr))",
              gap: isMobile ? "0.75rem" : "1rem",
              marginBottom: "3rem",
            }}
          >
            {paginatedProblems.map((problem) => {
              const description = problem.description || "";
              const shortDescription =
                description.length > 150
                  ? `${description.substring(0, 150)}...`
                  : description;

              return (
                <Card
                  key={problem.id}
                  hover={true}
                  style={{
                    marginBottom: spacing.lg,
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    navigate(
                      `/problem/${problem.id}?from=subject&subject=${encodeURIComponent(
                        subject,
                      )}`,
                    )
                  }
                >
                  {problem.author && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: isMobile ? "0.5rem" : "0.75rem",
                        gap: isMobile ? "6px" : "8px",
                      }}
                    >
                      <div
                        style={{
                          width: isMobile ? "28px" : "32px",
                          height: isMobile ? "28px" : "32px",
                          borderRadius: "50%",
                          backgroundColor: "#1a4d3a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: isMobile ? "10px" : "12px",
                          fontWeight: "bold",
                          backgroundImage: problem.author.profile_picture
                            ? `url(${problem.author.profile_picture})`
                            : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          pointerEvents: "none",
                        }}
                      >
                        {!problem.author.profile_picture &&
                          getUserInitial(problem.author.username)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: "600",
                            fontSize: isMobile ? "12px" : "14px",
                            color: "#1a4d3a",
                            cursor: "pointer",
                            textDecoration: "underline",
                            pointerEvents: "auto",
                          }}
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

                        <div
                          style={{
                            fontSize: isMobile ? "10px" : "12px",
                            color: "#666",
                            pointerEvents: "none",
                          }}
                        >
                          {problem.created_at
                            ? new Date(problem.created_at).toLocaleDateString()
                            : "Unknown date"}
                        </div>
                      </div>

                      {currentUser && problem.author.id !== currentUser.id && (
                        <div onClick={(e) => e.stopPropagation()}>
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
                  )}

                  <h3
                    style={{
                      margin: "0 0 0.75rem 0",
                      color: "#333",
                      fontSize: isMobile ? "0.9rem" : "1.1rem",
                      fontWeight: "600",
                      lineHeight: "1.4",
                      pointerEvents: "none",
                    }}
                  >
                    {renderMathContent(problem.title)}
                  </h3>

                  <div
                    style={{
                      color: "#666",
                      lineHeight: "1.5",
                      marginBottom: "0.75rem",
                      fontSize: isMobile ? "0.8rem" : "0.9rem",
                      whiteSpace: "pre-wrap",
                      pointerEvents: "none",
                    }}
                  >
                    {renderMathContent(shortDescription)}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: isMobile ? "3px" : "6px",
                      marginBottom: "0.75rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                      pointerEvents: "none",
                    }}
                  >
                    {problem.subject && (
                      <span
                        style={{
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                          padding: isMobile ? "3px 6px" : "6px 12px",
                          borderRadius: "16px",
                          fontSize: isMobile ? "9px" : "12px",
                          fontWeight: "600",
                          marginRight: "8px",
                          boxShadow: "0 2px 6px rgba(30, 64, 175, 0.2)",
                        }}
                      >
                        {problem.subject}
                      </span>
                    )}

                    {problem.level && problem.level.trim() && (
                      <span
                        style={{
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          padding: isMobile ? "3px 6px" : "6px 12px",
                          borderRadius: "16px",
                          fontSize: isMobile ? "9px" : "12px",
                          fontWeight: "600",
                          marginRight: "8px",
                          boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        {problem.level}
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
                            style={{
                              backgroundColor: colors.tertiary,
                              color: "white",
                              padding: isMobile ? "3px 6px" : "6px 12px",
                              borderRadius: "16px",
                              fontSize: isMobile ? "9px" : "12px",
                              fontWeight: "600",
                              boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
                            }}
                          >
                            {trimmedTag}
                          </span>
                        );
                      })}

                    {problem.year && (
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          padding: isMobile ? "3px 6px" : "6px 12px",
                          borderRadius: "16px",
                          fontSize: isMobile ? "9px" : "12px",
                          fontWeight: "600",
                          marginRight: "8px",
                          boxShadow: "0 2px 6px rgba(26, 77, 58, 0.2)",
                        }}
                      >
                        Year: {problem.year}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: isMobile ? "10px" : "12px",
                      color: "#666",
                      pointerEvents: "none",
                      borderTop: "1px solid #e9ecef",
                      paddingTop: "10px",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: isMobile ? "8px" : "12px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(problem.id, "like");
                        }}
                        style={{
                          backgroundColor:
                            voteData[problem.id]?.user_vote === "like"
                              ? "rgba(26, 77, 58, 0.1)"
                              : "#f8f9fa",
                          border: `1px solid ${
                            voteData[problem.id]?.user_vote === "like"
                              ? "rgb(26, 77, 58)"
                              : "#dee2e6"
                          }`,
                          cursor: "pointer",
                          fontSize: isMobile ? "12px" : "14px",
                          color:
                            voteData[problem.id]?.user_vote === "like"
                              ? "rgb(26, 77, 58)"
                              : "#666",
                          fontWeight:
                            voteData[problem.id]?.user_vote === "like"
                              ? "bold"
                              : "500",
                          padding: isMobile ? "8px 12px" : "10px 16px",
                          borderRadius: "8px",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? "6px" : "8px",
                          pointerEvents: "auto",
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795079/Like_Icon_hf3gef.svg"
                          alt="Like"
                          style={{
                            height: isMobile ? "14px" : "18px",
                            width: isMobile ? "14px" : "18px",
                            objectFit: "contain",
                          }}
                        />
                        {voteData[problem.id]?.like_count || 0}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(problem.id, "dislike");
                        }}
                        style={{
                          backgroundColor:
                            voteData[problem.id]?.user_vote === "dislike"
                              ? "rgba(118, 75, 162, 0.1)"
                              : "#f8f9fa",
                          border: `1px solid ${
                            voteData[problem.id]?.user_vote === "dislike"
                              ? "rgb(118, 75, 162)"
                              : "#dee2e6"
                          }`,
                          cursor: "pointer",
                          fontSize: isMobile ? "12px" : "14px",
                          color:
                            voteData[problem.id]?.user_vote === "dislike"
                              ? "rgb(118, 75, 162)"
                              : "#666",
                          fontWeight:
                            voteData[problem.id]?.user_vote === "dislike"
                              ? "bold"
                              : "500",
                          padding: isMobile ? "8px 12px" : "10px 16px",
                          borderRadius: "8px",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? "6px" : "8px",
                          pointerEvents: "auto",
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795077/Dislike_icon_vdy4ss.svg"
                          alt="Dislike"
                          style={{
                            height: isMobile ? "14px" : "18px",
                            width: isMobile ? "14px" : "18px",
                            objectFit: "contain",
                          }}
                        />
                        {voteData[problem.id]?.dislike_count || 0}
                      </button>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? "6px" : "8px",
                          padding: isMobile ? "8px 12px" : "10px 16px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "8px",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg"
                          alt="Comments"
                          style={{
                            height: isMobile ? "14px" : "18px",
                            width: isMobile ? "14px" : "18px",
                            objectFit: "contain",
                          }}
                        />
                        <span
                          style={{
                            fontSize: isMobile ? "12px" : "14px",
                            color: "#666",
                            fontWeight: "500",
                          }}
                        >
                          {problem.comment_count || 0}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookmark(problem.id);
                      }}
                      style={{
                        padding: isMobile ? "8px 12px" : "10px 16px",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? "6px" : "8px",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                        pointerEvents: "auto",
                      }}
                    >
                      <img
                        src={
                          bookmarkData[problem.id]
                            ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797449/Save_FULL_Icon_Green_fdrxbj.svg"
                            : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797443/Save_UNFULL_Icon_Green_wvn6qk.svg"
                        }
                        alt="Bookmark"
                        style={{
                          height: isMobile ? "16px" : "20px",
                          width: isMobile ? "16px" : "20px",
                          objectFit: "contain",
                        }}
                      />
                      <span
                        style={{
                          fontSize: isMobile ? "12px" : "14px",
                          color: bookmarkData[problem.id]
                            ? "rgb(26, 77, 58)"
                            : "#666",
                          fontWeight: "500",
                        }}
                      >
                        {bookmarkData[problem.id] ? "Saved" : "Save"}
                      </span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {!searchQuery && totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: isMobile ? "10px" : "20px",
                marginTop: "2rem",
                padding: "1rem",
                paddingBottom: isMobile ? "100px" : "1rem",
              }}
            >
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: isMobile ? "8px 16px" : "10px 20px",
                  backgroundColor:
                    currentPage === 1 ? "#e9ecef" : colors.primary,
                  color: currentPage === 1 ? "#6c757d" : "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: isMobile ? "14px" : "16px",
                  fontWeight: "600",
                }}
              >
                ← Previous
              </button>

              <span
                style={{
                  fontSize: isMobile ? "14px" : "16px",
                  color: "#666",
                  fontWeight: "500",
                }}
              >
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: isMobile ? "8px 16px" : "10px 20px",
                  backgroundColor:
                    currentPage === totalPages ? "#e9ecef" : colors.primary,
                  color: currentPage === totalPages ? "#6c757d" : "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: isMobile ? "14px" : "16px",
                  fontWeight: "600",
                }}
              >
                Next →
              </button>
            </div>
          )}

          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              zIndex: 1000,
            }}
          >
            <Link
              to={`/create-problem?subject=${encodeURIComponent(
                subjectName,
              )}&from=/subject/${encodeURIComponent(subject)}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  width: isMobile ? "50px" : "60px",
                  height: isMobile ? "50px" : "60px",
                  backgroundColor: colors.primary,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  transition: "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  fontSize: isMobile ? "20px" : "24px",
                  color: colors.white,
                  fontWeight: typography.fontWeight.bold,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.width = "220px";
                    e.currentTarget.style.borderRadius = "30px";
                    e.currentTarget.style.justifyContent = "flex-start";
                    e.currentTarget.style.paddingLeft = "20px";
                    e.currentTarget.style.backgroundColor = colors.secondary;
                    e.currentTarget.style.boxShadow =
                      "0 6px 25px rgba(0,0,0,0.2)";
                    e.currentTarget.innerHTML =
                      '<span style="font-size: 16px;">Create New Problem</span><span style="position: absolute; right: 18px; top: 50%; transform: translateY(-50%); font-size: 24px;">+</span>';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.width = "60px";
                    e.currentTarget.style.borderRadius = "50%";
                    e.currentTarget.style.justifyContent = "center";
                    e.currentTarget.style.paddingLeft = "0px";
                    e.currentTarget.style.backgroundColor = colors.primary;
                    e.currentTarget.style.boxShadow =
                      "0 4px 20px rgba(0,0,0,0.15)";
                    e.currentTarget.innerHTML = "+";
                  }
                }}
                title={`Create New ${subjectName} Problem`}
              >
                +
              </div>
            </Link>
          </div>
        </>
      )}
    </Layout>
  );
}

export default SubjectPage;
