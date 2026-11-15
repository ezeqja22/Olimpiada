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
import "./AccountWorkspace.css";
import ProblemCard from "./components/feed/ProblemCard";
import {useLanguage} from "./context/LanguageContext";
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
  const {lang}=useLanguage();
  const label=(en,sq)=>lang==="sq"?sq:en;
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
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/bookmark-status`,
        problemIds,
        {headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"}},
      );

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
      <Layout><div className="account-workspace account-empty"><h1>{label("User not found", "Përdoruesi nuk u gjet")}</h1><BackButton fallbackPath="/feed" /></div></Layout>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <div className="profile-page account-workspace">
        <BackButton fallbackPath={profileBackPath} />
        <header className="account-heading"><div><p>{label("Community", "Komuniteti")}</p><h1>{label("Member profile", "Profili i anëtarit")}</h1></div></header>
        <div className="account-columns">
          <aside className="account-identity">
            <div className="account-avatar">{userProfile.user.profile_picture ? <img src={userProfile.user.profile_picture} alt=""/> : (userProfile.user.username?.[0]?.toUpperCase() || "?")}</div>
            <h2>{userProfile.user.username}</h2>
            {userProfile.user.bio && <p className="account-bio">{userProfile.user.bio}</p>}
            <div className="account-connections"><button onClick={()=>openConnections("followers")}><strong>{userProfile.follower_count}</strong>{label("Followers", "Ndjekës")}</button><button onClick={()=>openConnections("following")}><strong>{userProfile.following_count}</strong>{label("Following", "Duke ndjekur")}</button></div>
            <div className="account-member-actions"><FollowButton isFollowing={following} onFollow={handleFollow} onUnfollow={handleFollow} loading={followLoading} size="lg" isDeletedUser={userProfile.user.username.startsWith("__deleted_user_")} /><button className="account-danger-link" onClick={()=>setShowReportModal(true)}>{label("Report User", "Raporto përdoruesin")}</button></div>
          </aside>
          <section className="account-library account-contributions">
            <h2 className="account-contribution-title">{label("Published problems", "Problemet e publikuara")}</h2>
            {!canViewProblems(userProfile.user,currentUser,following,userProfile.is_followed_by_profile_owner) ? <div className="account-empty"><h3>{label("These problems are private", "Këto probleme janë private")}</h3><p>{label("You need to follow each other to see their problems.", "Duhet të ndiqni njëri-tjetrin për të parë problemet.")}</p></div> : userProfile.problems.length===0 ? <p className="account-empty">{label("This member has not published any problems yet.", "Ky anëtar nuk ka publikuar ende probleme.")}</p> : userProfile.problems.map(problem=><ProblemCard key={problem.id} problem={{...problem,author:userProfile.user}} currentUser={currentUser} voteData={voteData} bookmarkData={Object.fromEntries(Object.entries(bookmarkData).map(([id,saved])=>[id,{isBookmarked:saved}]))} onVote={handleVote} onBookmark={handleBookmark} showFollow={false} problemHref={`/problem/${problem.id}?from=user&username=${encodeURIComponent(username)}`} />)}
          </section>
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
