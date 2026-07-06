/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import FollowButton from "./components/FollowButton";
import ReportModal from "./ReportModal";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./ProfilePages.css";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import { useProfileVisibility } from "./hooks/useProfileVisibility";
import { useToast } from "./components/ToastProvider";

// Helper function to render math content
const renderMathContent = (text) => {
  if (!text) return "";

  // Split text into math and non-math segments
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      // Block math mode
      const content = part.slice(2, -2);
      return (
        <div key={index} style={{ textAlign: "left", margin: "8px 0" }}>
          <BlockMath math={content} />
        </div>
      );
    } else if (part.startsWith("$") && part.endsWith("$")) {
      // Inline math mode
      const content = part.slice(1, -1);
      return <InlineMath key={index} math={content} />;
    } else {
      // Regular text — keep it as-is
      return <span key={index}>{part}</span>;
    }
  });
};

const PublicUserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Feature settings
  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();

  // Profile visibility settings
  const {
    canViewProfile,
    canViewProblems,
    loading: visibilityLoading,
  } = useProfileVisibility();

  const [userProfile, setUserProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [voteData, setVoteData] = useState({});
  const [bookmarkData, setBookmarkData] = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { showToast } = useToast();

  const getCurrentProfilePath = () =>
    `${location.pathname}${location.search || ""}`;

  const openConnections = (connectionType) => {
    if (!userProfile?.user?.id) return;

    const returnTo = getCurrentProfilePath();
    sessionStorage.setItem(
      `connectionsReturnTo:${userProfile.user.id}`,
      returnTo,
    );

    navigate(`/${connectionType}/${userProfile.user.id}`, {
      state: { returnTo },
    });
  };

  const currentProfilePath = `${location.pathname}${location.search || ""}`;
  const requestedProfileBackPath = location.state?.returnTo;

  const profileBackPath =
    typeof requestedProfileBackPath === "string" &&
    requestedProfileBackPath.startsWith("/") &&
    requestedProfileBackPath !== currentProfilePath
      ? requestedProfileBackPath
      : "/feed";

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
    fetchUserProfile();
    fetchCurrentUser();
  }, [username]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setCurrentUser(response.data);
      }
    } catch (err) {
      // User not logged in, that's fine
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/user/${username}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUserProfile(response.data);
      setFollowing(response.data.is_following);

      // Fetch vote data for user's problems
      if (response.data.problems && response.data.problems.length > 0) {
        await fetchVoteData(response.data.problems);
        await fetchBookmarkData(response.data.problems);
      }
    } catch (err) {
      setError("User not found");
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!userProfile) return;

    // Check if following is enabled
    if (!checkFeatureEnabled("following_enabled")) {
      showFeatureDisabledAlert("Following");
      return;
    }

    try {
      setFollowLoading(true);
      const token = localStorage.getItem("token");

      if (following) {
        // Unfollow
        await axios.delete(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/follow/${userProfile.user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setFollowing(false);
        setUserProfile((prev) => ({
          ...prev,
          follower_count: prev.follower_count - 1,
        }));
      } else {
        // Follow
        await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/follow/${userProfile.user.id}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setFollowing(true);
        setUserProfile((prev) => ({
          ...prev,
          follower_count: prev.follower_count + 1,
        }));
      }
    } catch (err) {
      console.error("Error following/unfollowing:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchVoteData = async (problemsList) => {
    console.log("🔍 fetchVoteData called with problems:", problemsList.length);
    try {
      const token = localStorage.getItem("token");
      console.log("🔑 Token exists:", !!token);
      if (!token) {
        // If no token, initialize with default values
        const voteDataMap = {};
        problemsList.forEach((problem) => {
          voteDataMap[problem.id] = {
            like_count: 0,
            dislike_count: 0,
            user_vote: null,
          };
        });
        setVoteData(voteDataMap);
        console.log("📊 Set default vote data:", voteDataMap);
        return;
      }

      // Get current user info
      let currentUserId = null;
      try {
        const userResponse = await axios.get(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        currentUserId = userResponse.data.id;
        console.log("👤 Current user ID:", currentUserId);
      } catch (userError) {
        console.error("❌ Error fetching current user:", userError);
      }

      const votePromises = problemsList.map(async (problem) => {
        const problemId = problem.id;
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/${problemId}/votes`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          console.log(`📊 Vote data for problem ${problemId}:`, response.data);

          // Process the vote data - backend returns array of votes, we need aggregated data
          let likeCount = 0;
          let dislikeCount = 0;
          let userVote = null;

          if (Array.isArray(response.data)) {
            response.data.forEach((vote) => {
              if (vote.vote_type === "like") {
                likeCount++;
                if (vote.user_id === currentUserId) {
                  userVote = "like";
                }
              } else if (vote.vote_type === "dislike") {
                dislikeCount++;
                if (vote.user_id === currentUserId) {
                  userVote = "dislike";
                }
              }
            });
          }

          const processedVoteData = {
            like_count: likeCount,
            dislike_count: dislikeCount,
            user_vote: userVote,
          };

          console.log(
            `📊 Processed vote data for problem ${problemId}:`,
            processedVoteData,
          );
          return { problemId, voteData: processedVoteData };
        } catch (error) {
          console.error(
            `Error fetching vote data for problem ${problemId}:`,
            error,
          );
          return {
            problemId,
            voteData: { like_count: 0, dislike_count: 0, user_vote: null },
          };
        }
      });

      const voteResults = await Promise.all(votePromises);
      const voteDataMap = {};
      voteResults.forEach(({ problemId, voteData }) => {
        voteDataMap[problemId] = voteData;
      });
      setVoteData(voteDataMap);
      console.log("✅ Vote data fetched successfully:", voteDataMap);
    } catch (error) {
      console.error("❌ Error fetching vote data:", error);
    }
  };

  const handleVote = async (problemId, voteType) => {
    // Check if voting is enabled
    if (!checkFeatureEnabled("voting_enabled")) {
      showFeatureDisabledAlert("Voting");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/${problemId}/vote`,
        { vote_type: voteType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Update vote data for this specific problem
      setVoteData((prev) => ({
        ...prev,
        [problemId]: response.data,
      }));
    } catch (error) {
      console.error("Error voting:", error);
      showToast("Error voting on problem", "error");
    }
  };

  const fetchBookmarkData = async (problemsList) => {
    console.log(
      "🔍 fetchBookmarkData called with problems:",
      problemsList.length,
    );
    try {
      const token = localStorage.getItem("token");
      console.log("🔑 Token exists for bookmarks:", !!token);
      if (!token) {
        // If no token, initialize with all false
        const bookmarkDataMap = {};
        problemsList.forEach((problem) => {
          bookmarkDataMap[problem.id] = false;
        });
        setBookmarkData(bookmarkDataMap);
        console.log("📊 Set default bookmark data:", bookmarkDataMap);
        return;
      }

      const problemIds = problemsList.map((problem) => problem.id);
      console.log("📤 Sending bookmark request with problem IDs:", problemIds);
      // Try different request formats
      let response;
      try {
        // First try: wrapped format
        response = await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/bookmark-status`,
          { problem_ids: problemIds },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (firstError) {
        console.log(
          "🔄 First bookmark request failed, trying direct array format...",
        );
        // Second try: direct array format
        response = await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/bookmark-status`,
          problemIds,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
      }

      // Convert backend format to frontend format
      const convertedData = {};
      Object.keys(response.data).forEach((problemId) => {
        convertedData[problemId] = response.data[problemId].isBookmarked;
      });
      setBookmarkData(convertedData);
      console.log("✅ Bookmark data fetched successfully:", convertedData);
    } catch (error) {
      console.error("❌ Error fetching bookmark data:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
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
        // Remove bookmark
        await axios.delete(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/${problemId}/bookmark`,
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
        // Add bookmark
        await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/${problemId}/bookmark`,
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
      }
    } catch (error) {
      console.error("Error updating bookmark:", error);
      showToast("Error updating bookmark", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/homepage", { replace: true });
  };

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="profile"
          message="Loading user profile..."
          size="large"
        />
      </Layout>
    );
  }

  if (error || !userProfile) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>User not found</h2>
        <BackButton fallbackPath="/feed" />
      </div>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <div className="profile-page profile-page--public">
        {/* Back Button */}
        <div style={{ marginBottom: spacing.md }}>
          <BackButton fallbackPath={profileBackPath} />
        </div>

        <div style={{ marginBottom: spacing.xl }}>
          <h1
            style={{
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.primary,
              marginBottom: spacing.lg,
              textAlign: "center",
            }}
          >
            User Profile
          </h1>
        </div>

        {/* User Info */}
        <div
          className="profile-hero profile-hero--public"
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            marginBottom: "30px",
            padding: "24px",
            backgroundColor: "#f8f9fa",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          <div
            className="profile-avatar"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#1a4d3a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
              fontWeight: "bold",
              marginRight: isMobile ? "0" : "20px",
              marginBottom: isMobile ? "15px" : "0",
              backgroundImage: userProfile.user.profile_picture
                ? `url(${userProfile.user.profile_picture})`
                : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!userProfile.user.profile_picture &&
              (userProfile.user.username
                ? userProfile.user.username[0].toUpperCase()
                : "?")}
          </div>
          <div className="profile-identity" style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 10px 0", color: "#333" }}>
              {userProfile.user.username}
            </h2>
            {userProfile.user.bio && (
              <p style={{ margin: "0 0 10px 0", color: "#666" }}>
                {userProfile.user.bio}
              </p>
            )}
            <div
              className="profile-social-stats"
              style={{
                display: "flex",
                gap: "20px",
                color: "#666",
                justifyContent: isMobile ? "center" : "flex-start",
                flexWrap: "wrap",
                marginBottom: isMobile ? "15px" : "0",
              }}
            >
              <span
                style={{
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  transition: "all 0.2s ease",
                }}
                onClick={() => openConnections("followers")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[100];
                  e.currentTarget.style.color = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#666";
                }}
              >
                <strong>{userProfile.follower_count}</strong> followers
              </span>
              <span
                style={{
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  transition: "all 0.2s ease",
                }}
                onClick={() => openConnections("following")}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.gray[100];
                  e.currentTarget.style.color = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#666";
                }}
              >
                <strong>{userProfile.following_count}</strong> following
              </span>
              <span>
                <strong>
                  {canViewProblems(
                    userProfile.user,
                    currentUser,
                    following,
                    userProfile.is_followed_by_profile_owner,
                  )
                    ? userProfile.problems.length
                    : "?"}
                </strong>{" "}
                problems
              </span>
            </div>
          </div>
          <div
            className="profile-primary-actions"
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              justifyContent: isMobile ? "center" : "flex-start",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <FollowButton
              isFollowing={following}
              onFollow={handleFollow}
              onUnfollow={handleFollow}
              loading={followLoading}
              size="lg"
              isDeletedUser={userProfile.user.username.startsWith(
                "__deleted_user_",
              )}
            />
            <Button
              onClick={() => setShowReportModal(true)}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Report User
            </Button>
          </div>
        </div>

        {/* Problems */}
        <div>
          <h3 style={{ marginBottom: "20px", color: "#333" }}>
            Problems by {userProfile.user.username}
          </h3>
          {!canViewProblems(
            userProfile.user,
            currentUser,
            following,
            userProfile.is_followed_by_profile_owner,
          ) ? (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                padding: "40px",
                background: "#f8f9fa",
                borderRadius: "12px",
                border: "1px solid #e9ecef",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}></div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "500",
                  marginBottom: "8px",
                }}
              >
                This user's problems are private
              </div>
              <div style={{ fontSize: "14px" }}>
                You need to follow each other to see their problems
              </div>
            </div>
          ) : userProfile.problems.length === 0 ? (
            <p style={{ textAlign: "center", color: "#666", padding: "40px" }}>
              This user hasn't posted any problems yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {userProfile.problems.map((problem) => (
                <div
                  key={problem.id}
                  className="profile-problem-card"
                  style={{
                    border: "1px solid #e9ecef",
                    borderRadius: "12px",
                    padding: isMobile ? "15px" : "24px",
                    backgroundColor: "white",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    navigate(
                      `/problem/${problem.id}?from=user&username=${encodeURIComponent(username)}`,
                    )
                  }
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                  }}
                >
                  <div
                    className="profile-problem-heading-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: isMobile ? "10px" : "15px",
                    }}
                  >
                    <h4 style={{ margin: 0, color: "#333" }}>
                      {renderMathContent(problem.title)}
                    </h4>
                    <span style={{ color: "#666", fontSize: "14px" }}>
                      {new Date(problem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 15px 0", color: "#555" }}>
                    {renderMathContent(problem.description)}
                  </p>
                  <div
                    className="profile-tags"
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "15px",
                    }}
                  >
                    {problem.tags &&
                      problem.tags.split(",").map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: colors.tertiary,
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            fontSize: "14px",
                            fontWeight: "600",
                            boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow =
                              "0 4px 12px rgba(124, 58, 237, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow =
                              "0 2px 8px rgba(124, 58, 237, 0.3)";
                          }}
                        >
                          {tag.trim()}
                        </span>
                      ))}
                  </div>
                  <div
                    className="profile-problem-actions-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        color: "#666",
                        alignItems: "center",
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
                          border: `1px solid ${voteData[problem.id]?.user_vote === "like" ? "rgb(26, 77, 58)" : "#dee2e6"}`,
                          cursor: "pointer",
                          fontSize: "14px",
                          color:
                            voteData[problem.id]?.user_vote === "like"
                              ? "rgb(26, 77, 58)"
                              : "#666",
                          fontWeight:
                            voteData[problem.id]?.user_vote === "like"
                              ? "bold"
                              : "500",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (voteData[problem.id]?.user_vote !== "like") {
                            e.target.style.backgroundColor = "#e9ecef";
                            e.target.style.borderColor = "#adb5bd";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (voteData[problem.id]?.user_vote !== "like") {
                            e.target.style.backgroundColor = "#f8f9fa";
                            e.target.style.borderColor = "#dee2e6";
                          }
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795079/Like_Icon_hf3gef.svg"
                          alt="Like"
                          style={{
                            height: "14px",
                            width: "14px",
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
                          border: `1px solid ${voteData[problem.id]?.user_vote === "dislike" ? "rgb(118, 75, 162)" : "#dee2e6"}`,
                          cursor: "pointer",
                          fontSize: "14px",
                          color:
                            voteData[problem.id]?.user_vote === "dislike"
                              ? "rgb(118, 75, 162)"
                              : "#666",
                          fontWeight:
                            voteData[problem.id]?.user_vote === "dislike"
                              ? "bold"
                              : "500",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          if (voteData[problem.id]?.user_vote !== "dislike") {
                            e.target.style.backgroundColor = "#e9ecef";
                            e.target.style.borderColor = "#adb5bd";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (voteData[problem.id]?.user_vote !== "dislike") {
                            e.target.style.backgroundColor = "#f8f9fa";
                            e.target.style.borderColor = "#dee2e6";
                          }
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795077/Dislike_icon_vdy4ss.svg"
                          alt="Dislike"
                          style={{
                            height: "14px",
                            width: "14px",
                            objectFit: "contain",
                          }}
                        />
                        {voteData[problem.id]?.dislike_count || 0}
                      </button>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          pointerEvents: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg"
                          alt="Comments"
                          style={{
                            height: "14px",
                            width: "14px",
                            objectFit: "contain",
                          }}
                        />
                        {problem.comment_count || 0}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleBookmark(problem.id);
                        }}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={
                            bookmarkData[problem.id]
                              ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797449/Save_FULL_Icon_Green_fdrxbj.svg"
                              : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797443/Save_UNFULL_Icon_Green_wvn6qk.svg"
                          }
                          alt={
                            bookmarkData[problem.id]
                              ? "Remove bookmark"
                              : "Bookmark"
                          }
                          style={{
                            height: "20px",
                            width: "20px",
                            objectFit: "contain",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Modal */}
        {showReportModal && userProfile && (
          <ReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            reportType="user"
            targetId={userProfile.user.id}
            targetUser={userProfile.user}
          />
        )}
      </div>
    </Layout>
  );
};

export default PublicUserProfile;
