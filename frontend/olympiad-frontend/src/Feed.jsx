// src/Feed.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
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
  if (!text) return '';

  // Split text into math and non-math segments
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      // Block math mode
      const content = part.slice(2, -2);
      return (
        <div key={index} style={{ textAlign: 'left', margin: '8px 0' }}>
          <BlockMath math={content} />
        </div>
      );
    } else if (part.startsWith('$') && part.endsWith('$')) {
      // Inline math mode
      const content = part.slice(1, -1);
      return <InlineMath key={index} math={content} />;
    } else {
      // Regular text — keep it as-is
      return <span key={index}>{part}</span>;
    }
  });
};

function Feed() {
  const location = useLocation();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [voteData, setVoteData] = useState({});
  const [followStatus, setFollowStatus] = useState({});
  const [bookmarkData, setBookmarkData] = useState({});
  const [activeTab, setActiveTab] = useState("all"); // "all", "following", "trending"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);
  
  // Feature settings
  const { checkFeatureEnabled, showFeatureDisabledAlert } = useFeatureSettings();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch data if user is authenticated
    const token = localStorage.getItem("token");
    if (token) {
    fetchProblems();
      fetchCurrentUser();
    }
  }, []);

  useEffect(() => {
    // Fetch data when tab changes
    let loadingTimeout;
    
    // Show loading after a short delay to allow animation to be visible
    loadingTimeout = setTimeout(() => {
      setShowLoading(true);
    }, 300); // 300ms delay to see the sliding animation
    
    if (activeTab === "all") {
      fetchProblems().finally(() => {
        clearTimeout(loadingTimeout);
        setShowLoading(false);
      });
    } else if (activeTab === "following") {
      fetchFollowingProblems().finally(() => {
        clearTimeout(loadingTimeout);
        setShowLoading(false);
      });
    } else if (activeTab === "trending") {
      fetchTrendingProblems().finally(() => {
        clearTimeout(loadingTimeout);
        setShowLoading(false);
      });
    }
    
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [activeTab]);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['all', 'following', 'trending'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location]);

  const handleLogout = () => {
    // Clear all user data
    localStorage.removeItem("token");
    
    // Clear any cached data
    setProblems([]);
    setVoteData({});
    setFollowStatus({});
    
    // Replace current history entry to prevent back navigation
    navigate("/homepage", { replace: true });
  };

  const fetchProblems = async (page = 1) => {
    setLoading(true);
    try {
      let endpoint = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/?page=${page}&limit=10`;
      
      // Use trending endpoint for trending tab
      if (activeTab === "trending") {
        endpoint = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/trending?page=${page}&limit=10`;
      }
      
      const response = await axios.get(endpoint);
      const allProblems = response.data.problems || response.data;
      
      // Filter out forum problems - only show standalone problems
      const standaloneProblems = allProblems.filter(problem => problem.forum_id === null || problem.forum_id === undefined);
      
      setProblems(standaloneProblems);
      setCurrentPage(page);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(response.data.total_problems || response.data.total || response.data.length);
      
      // Fetch vote/bookmark/follow in parallel for speed
      const problemIds = standaloneProblems.map(problem => problem.id);
      await Promise.all([
        fetchVoteData(problemIds),
        fetchBookmarkData(problemIds),
        fetchFollowStatus(standaloneProblems)
      ]);
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowingProblems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/feed/following`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // The backend returns an object with 'problems' array
      const allProblems = Array.isArray(response.data.problems) ? response.data.problems : [];
      
      // Filter logic: Show standalone problems OR forum problems where user is a member
      const filteredProblems = allProblems.filter(problem => {
        // Always show standalone problems
        if (problem.forum_id === null || problem.forum_id === undefined) {
          return true;
        }
        // For forum problems, only show if user is a member of that forum
        // The backend should already handle this logic, but we double-check
        return problem.user_is_forum_member === true;
      });
      
      setProblems(filteredProblems);
      
      // Only fetch vote data and follow status if we have problems
      if (filteredProblems.length > 0) {
        const problemIds = filteredProblems.map(problem => problem.id);
        await fetchVoteData(problemIds);
        await fetchBookmarkData(problemIds);
        await fetchFollowStatus(filteredProblems);
      }
    } catch (error) {
      console.error("Error fetching following problems:", error);
      // Set empty array on error to prevent map error
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingProblems = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/trending?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const allProblems = response.data.problems || [];
      
      // Filter out ALL forum problems from trending - only show standalone problems
      const standaloneProblems = allProblems.filter(problem => problem.forum_id === null || problem.forum_id === undefined);
      setProblems(standaloneProblems);
      setCurrentPage(page);
      setTotalPages(response.data.total_pages || 1);
      setTotalProblems(standaloneProblems.length);
      
      // Only fetch vote data and follow status if we have standalone problems
      if (standaloneProblems && standaloneProblems.length > 0) {
        const problemIds = standaloneProblems.map(problem => problem.id);
        await fetchVoteData(problemIds);
        await fetchBookmarkData(problemIds);
        await fetchFollowStatus(standaloneProblems);
      }
    } catch (error) {
      console.error("Error fetching trending problems:", error);
      // Set empty array on error to prevent map error
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async (problems) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const followPromises = problems.map(async (problem) => {
        if (!problem.author) return { authorId: null, isFollowing: false };
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/status/${problem.author.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return { authorId: problem.author.id, isFollowing: response.data.is_following };
        } catch (error) {
          return { authorId: problem.author.id, isFollowing: false };
        }
      });
      
      const results = await Promise.all(followPromises);
      const followStatusMap = {};
      results.forEach(result => {
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
        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/vote-status-bulk`,
        problemIds,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
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
        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/bookmark-status`,
        problemIds,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setBookmarkData(response.data);
    } catch (error) {
      console.error("Error fetching bookmark data:", error);
      // Initialize with all false if fetch fails
      const bookmarkDataMap = {};
      problemIds.forEach(problemId => {
        bookmarkDataMap[problemId] = { isBookmarked: false };
      });
      setBookmarkData(bookmarkDataMap);
    }
  };

  const handleBookmark = async (problemId) => {
    // Check if bookmarks are enabled
    if (!checkFeatureEnabled('bookmarks_enabled')) {
      showFeatureDisabledAlert('Bookmarks');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const isCurrentlyBookmarked = bookmarkData[problemId]?.isBookmarked;
      
      if (isCurrentlyBookmarked) {
        // Try to remove bookmark
        try {
          await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/bookmark`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          // Update state to unbookmarked
          setBookmarkData(prev => ({
            ...prev,
            [problemId]: { isBookmarked: false }
          }));
        } catch (deleteError) {
          // If delete fails (404), it means it wasn't bookmarked, so try to add it
          if (deleteError.response?.status === 404) {
            await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/bookmark`, {}, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            // Update state to bookmarked
            setBookmarkData(prev => ({
              ...prev,
              [problemId]: { isBookmarked: true }
            }));
          } else {
            throw deleteError;
          }
        }
      } else {
        // Try to add bookmark
        try {
          await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/bookmark`, {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          // Update state to bookmarked
          setBookmarkData(prev => ({
            ...prev,
            [problemId]: { isBookmarked: true }
          }));
        } catch (postError) {
          // If post fails (400), it means it was already bookmarked, so try to remove it
          if (postError.response?.status === 400) {
            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/bookmark`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            // Update state to unbookmarked
            setBookmarkData(prev => ({
              ...prev,
              [problemId]: { isBookmarked: false }
            }));
          } else {
            throw postError;
          }
        }
      }
      
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      console.error("Error details:", error.response?.data);
      alert(`Error updating bookmark: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleVote = async (problemId, voteType) => {
    // Check if voting is enabled
    if (!checkFeatureEnabled('voting_enabled')) {
      showFeatureDisabledAlert('Voting');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/vote`,
        { vote_type: voteType },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Update vote data for this specific problem
      setVoteData(prev => ({
        ...prev,
        [problemId]: response.data
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

    // Check if following is enabled
    if (!checkFeatureEnabled('following_enabled')) {
      showFeatureDisabledAlert('Following');
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
        await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${authorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowStatus(prev => ({ ...prev, [authorId]: false }));
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${authorId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowStatus(prev => ({ ...prev, [authorId]: true }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const handleFollowUser = async (authorId) => {
    // Check if following is enabled
    if (!checkFeatureEnabled('following_enabled')) {
      showFeatureDisabledAlert('Following');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to follow users");
        return;
      }

      await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${authorId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowStatus(prev => ({ ...prev, [authorId]: true }));
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleUnfollowUser = async (authorId) => {
    // Check if following is enabled
    if (!checkFeatureEnabled('following_enabled')) {
      showFeatureDisabledAlert('Following');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to follow users");
        return;
      }

      await axios.delete(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/follow/${authorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowStatus(prev => ({ ...prev, [authorId]: false }));
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
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  if (showLoading) {
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
      <div style={{ 
        width: "100%", 
        maxWidth: "100%", 
        overflow: "hidden",
        boxSizing: "border-box"
      }}>
      <div style={{ 
        marginBottom: spacing.xl
      }}>
        <h1 style={{
          fontSize: isMobile ? "1.5rem" : typography.fontSize["3xl"],
          fontWeight: typography.fontWeight.bold,
          color: colors.primary,
          marginBottom: spacing.lg,
          textAlign: "center"
        }}>
          Science Problems Feed
        </h1>
        
      </div>

      {/* Enhanced Search Bar */}
      <div style={{ 
        marginBottom: "20px"
      }}>
        <SearchBar placeholder="Search problems, users, tags, levels..." />
      </div>
        {/* Removed old search results - now handled by SearchBar component */}

      {/* Tab Navigation */}
      <div style={{
        display: "flex",
        marginBottom: spacing.lg,
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        border: `1px solid ${colors.gray[200]}`
      }}>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            flex: 1,
            padding: isMobile ? "10px 2px" : `${spacing.sm} ${spacing.md}`,
            border: "none",
            backgroundColor: activeTab === "all" ? colors.primary : "transparent",
            color: activeTab === "all" ? colors.white : colors.gray[600],
            cursor: "pointer",
            fontWeight: activeTab === "all" ? typography.fontWeight.bold : typography.fontWeight.medium,
            transition: "all 0.2s ease",
            fontSize: isMobile ? "11px" : typography.fontSize.base
          }}
        >
          All Problems
        </button>
        <button
          onClick={() => setActiveTab("following")}
          style={{
            flex: 1,
            padding: isMobile ? "10px 2px" : `${spacing.sm} ${spacing.md}`,
            border: "none",
            backgroundColor: activeTab === "following" ? colors.primary : "transparent",
            color: activeTab === "following" ? colors.white : colors.gray[600],
            cursor: "pointer",
            fontWeight: activeTab === "following" ? typography.fontWeight.bold : typography.fontWeight.medium,
            transition: "all 0.2s ease",
            fontSize: isMobile ? "11px" : typography.fontSize.base
          }}
        >
          Following
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          style={{
            flex: 1,
            padding: isMobile ? "10px 2px" : `${spacing.sm} ${spacing.md}`,
            border: "none", 
            backgroundColor: activeTab === "trending" ? colors.primary : "transparent",
            color: activeTab === "trending" ? colors.white : colors.gray[600],
            cursor: "pointer",
            fontWeight: activeTab === "trending" ? typography.fontWeight.bold : typography.fontWeight.medium,
            transition: "all 0.2s ease",
            fontSize: isMobile ? "11px" : typography.fontSize.base
          }}
        >
          Trending
          </button>
      </div>

      {problems.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          {activeTab === "all" && (
            <>
          <h3>No problems yet!</h3>
          <p>Be the first to create a science problem.</p>
          <Link to="/create-problem?from=/feed">
            <button style={{ 
              padding: "10px 20px", 
              backgroundColor: "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "5px",
              cursor: "pointer"
            }}>
              Create First Problem
            </button>
          </Link>
            </>
          )}
          {activeTab === "following" && (
            <>
              <h3>You're not following anyone yet!</h3>
              <p>Follow other users to see their problems in your feed.</p>
              <p>Switch to "All Problems" to discover users to follow.</p>
            </>
          )}
          {activeTab === "trending" && (
            <>
              <h3>No trending problems yet!</h3>
              <p>Problems with more comments and engagement will appear here.</p>
              <Link to="/create-problem?from=/feed">
                <button style={{ 
                  padding: "10px 20px", 
                  backgroundColor: "#28a745", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "5px",
                  cursor: "pointer"
                }}>
                  Create a Problem
                </button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div>
          {problems.map((problem) => (
            <Card 
            key={problem.id} 
            hover={true}
            style={{
              marginBottom: spacing.lg,
              cursor: "pointer"
            }}
            onClick={() => navigate(`/problem/${problem.id}?from=feed&tab=${activeTab}`)}
          >
              {/* Author Info Section - Twitter Style */}
              {problem.author ? (
                <div style={{ display: "flex", alignItems: "center", marginBottom: "15px", gap: "10px" }}>
                  {/* Profile Picture */}
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#007bff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold",
                    backgroundImage: problem.author.profile_picture ? `url(${problem.author.profile_picture})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    pointerEvents: "none"
                  }}>
                    {!problem.author.profile_picture && getUserInitial(problem.author.username)}
                  </div>
                  
                  {/* Author Name and Follow Button */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                    <div style={{ pointerEvents: "none" }}>
                      <div 
            style={{
                          fontWeight: "bold", 
                          fontSize: "14px", 
                          color: "#007bff",
                          cursor: "pointer",
                          textDecoration: "underline",
                          pointerEvents: "auto"
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent bubbling to problem card
                          // If it's the current user, go to their own profile page
                          if (currentUser && problem.author.id === currentUser.id) {
                            navigate('/profile');
                          } else {
                            navigate(`/user/${problem.author.username}`);
                          }
                        }}
                      >
                        {getDisplayName(problem.author.username)}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {new Date(problem.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Follow Button - Hide for own posts */}
                    {currentUser && problem.author.id !== currentUser.id && (
                      <FollowButton
                        isFollowing={followStatus[problem.author.id]}
                        onFollow={() => handleFollowUser(problem.author.id)}
                        onUnfollow={() => handleUnfollowUser(problem.author.id)}
                        size="sm"
                        style={{ marginLeft: "auto" }}
                        isDeletedUser={problem.author.username.startsWith('__deleted_user_')}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", marginBottom: "15px", gap: "10px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#6c757d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold"
                  }}>
                    ?
                  </div>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>
                      Unknown Author
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {new Date(problem.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
              
              <h3 style={{ 
                marginTop: 0, 
                color: "#333", 
                pointerEvents: "none",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                maxWidth: "100%"
              }}>{renderMathContent(problem.title)}</h3>
              <div style={{ 
                color: "#666", 
                lineHeight: "1.5", 
                whiteSpace: "pre-wrap", 
                pointerEvents: "none",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                maxWidth: "100%"
              }}>{renderMathContent(problem.description)}</div>
              <div style={{ 
                display: "flex", 
                gap: isMobile ? "4px" : "10px", 
                marginTop: "15px", 
                alignItems: isMobile ? "flex-start" : "center",
                flexWrap: isMobile ? "wrap" : "nowrap",
                flexDirection: isMobile ? "column" : "row",
                width: "100%",
                boxSizing: "border-box"
              }}>
                <div style={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: isMobile ? "4px" : "8px",
                  marginBottom: isMobile ? "8px" : "0"
                }}>
                  <span style={{
                    backgroundColor: "#e0e7ff",
                    color: "#3730a3",
                    padding: isMobile ? "3px 6px" : "6px 12px",
                    borderRadius: "16px",
                    fontSize: isMobile ? "9px" : "12px",
                    fontWeight: "600",
                    boxShadow: "0 2px 6px rgba(30, 64, 175, 0.2)",
                    transition: "all 0.2s ease",
                    pointerEvents: "none"
                  }}>
                    {problem.subject}
                  </span>
                  {problem.level && problem.level.trim() && (
                    <span style={{
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      padding: isMobile ? "3px 6px" : "6px 12px",
                      borderRadius: "16px",
                      fontSize: isMobile ? "9px" : "12px",
                      fontWeight: "600",
                      boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
                      transition: "all 0.2s ease",
                      pointerEvents: "none"
                    }}>
                      {problem.level}
                    </span>
                  )}
                  {problem.year && (
                    <span style={{
                      backgroundColor: "#dcfce7", 
                      color: "#166534",
                      padding: isMobile ? "3px 6px" : "6px 12px",
                      borderRadius: "16px",
                      fontSize: isMobile ? "9px" : "12px",
                      fontWeight: "600",
                      boxShadow: "0 2px 6px rgba(26, 77, 58, 0.2)",
                      transition: "all 0.2s ease",
                      pointerEvents: "none"
                    }}>
                      Year: {problem.year}
                    </span>
                  )}
                </div>
                {problem.tags && problem.tags.trim() && (
                  <div style={{ 
                    display: "flex", 
                    flexWrap: "wrap", 
                    gap: isMobile ? "4px" : "8px",
                    marginBottom: isMobile ? "8px" : "0"
                  }}>
                    {problem.tags.split(",").map((tag, index) => {
                      const trimmedTag = tag.trim();
                      if (!trimmedTag) return null;
                      return (
                        <span
                          key={index}
                          style={{
                            backgroundColor: colors.tertiary,
                            color: "white",
                            padding: isMobile ? "2px 5px" : "6px 12px",
                            borderRadius: "16px",
                            fontSize: isMobile ? "8px" : "12px",
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                            boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
                            transition: "all 0.2s ease",
                            pointerEvents: "none"
                          }}
                        >
                          {trimmedTag}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Interaction Buttons - Bottom of Card */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "15px",
                  paddingTop: "10px",
                  borderTop: "1px solid #e9ecef"
                }}>
                  {/* Like, Dislike, Comment - Left Side */}
                  <div style={{ 
                    display: "flex", 
                    gap: isMobile ? "8px" : "12px", 
                    alignItems: "center"
                  }}>
                    {/* Like Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(problem.id, "like");
                      }}
                      style={{
                        backgroundColor: voteData[problem.id]?.user_vote === "like" ? "rgba(26, 77, 58, 0.1)" : "#f8f9fa",
                        border: `1px solid ${voteData[problem.id]?.user_vote === "like" ? "rgb(26, 77, 58)" : "#dee2e6"}`,
                        cursor: "pointer",
                        fontSize: isMobile ? "12px" : "14px",
                        color: voteData[problem.id]?.user_vote === "like" ? "rgb(26, 77, 58)" : "#666",
                        fontWeight: voteData[problem.id]?.user_vote === "like" ? "bold" : "500",
                        padding: isMobile ? "8px 12px" : "10px 16px",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? "6px" : "8px"
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
                          height: isMobile ? "14px" : "18px",
                          width: isMobile ? "14px" : "18px",
                          objectFit: "contain"
                        }}
                      />
                      {voteData[problem.id]?.like_count || 0}
                    </button>

                    {/* Dislike Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(problem.id, "dislike");
                      }}
                      style={{
                        backgroundColor: voteData[problem.id]?.user_vote === "dislike" ? "rgba(118, 75, 162, 0.1)" : "#f8f9fa",
                        border: `1px solid ${voteData[problem.id]?.user_vote === "dislike" ? "rgb(118, 75, 162)" : "#dee2e6"}`,
                        cursor: "pointer",
                        fontSize: isMobile ? "12px" : "14px",
                        color: voteData[problem.id]?.user_vote === "dislike" ? "rgb(118, 75, 162)" : "#666",
                        fontWeight: voteData[problem.id]?.user_vote === "dislike" ? "bold" : "500",
                        padding: isMobile ? "8px 12px" : "10px 16px",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? "6px" : "8px"
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
                          height: isMobile ? "14px" : "18px",
                          width: isMobile ? "14px" : "18px",
                          objectFit: "contain"
                        }}
                      />
                      {voteData[problem.id]?.dislike_count || 0}
                    </button>

                    {/* Comment Count */}
                    <div style={{ 
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? "6px" : "8px",
                      padding: isMobile ? "8px 12px" : "10px 16px",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px",
                      border: "1px solid #dee2e6"
                    }}>
                      <img 
                        src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg" 
                        alt="Comments"
                        style={{
                          height: isMobile ? "14px" : "18px",
                          width: isMobile ? "14px" : "18px",
                          objectFit: "contain"
                        }}
                      />
                      <span style={{ 
                        fontSize: isMobile ? "12px" : "14px", 
                        color: "#666",
                        fontWeight: "500"
                      }}>
                        {problem.comment_count || 0}
                      </span>
                    </div>
                  </div>

                  {/* Bookmark - Right Side */}
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
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <img 
                      src={bookmarkData[problem.id]?.isBookmarked 
                        ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797449/Save_FULL_Icon_Green_fdrxbj.svg"
                        : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797443/Save_UNFULL_Icon_Green_wvn6qk.svg"
                      } 
                      alt="Bookmark"
                      style={{
                        height: isMobile ? "16px" : "20px",
                        width: isMobile ? "16px" : "20px",
                        objectFit: "contain"
                      }}
                    />
                    <span style={{ 
                      fontSize: isMobile ? "12px" : "14px",
                      color: bookmarkData[problem.id]?.isBookmarked ? "rgb(26, 77, 58)" : "#666",
                      fontWeight: "500"
                    }}>
                      {bookmarkData[problem.id]?.isBookmarked ? "Saved" : "Save"}
                    </span>
                  </button>
                </div>
              </div>
          </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(activeTab === "all" || activeTab === "trending") && totalPages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: spacing.md,
          marginTop: spacing.xl,
          padding: spacing.lg
        }}>
          <Button
            onClick={() => {
              if (activeTab === "trending") {
                fetchTrendingProblems(currentPage - 1);
              } else {
                fetchProblems(currentPage - 1);
              }
            }}
            disabled={currentPage === 1}
            variant={currentPage === 1 ? "ghost" : "primary"}
            size="md"
          >
            ← Previous
          </Button>
          
          <span style={{ 
            padding: `0 ${spacing.lg}`,
            fontSize: isMobile ? typography.fontSize.sm : typography.fontSize.base,
            color: colors.gray[600],
            fontWeight: typography.fontWeight.medium
          }}>
            Page {currentPage} of {totalPages} ({totalProblems} total problems)
          </span>
          
          <Button
            onClick={() => {
              if (activeTab === "trending") {
                fetchTrendingProblems(currentPage + 1);
              } else {
                fetchProblems(currentPage + 1);
              }
            }}
            disabled={currentPage === totalPages}
            variant={currentPage === totalPages ? "ghost" : "primary"}
            size="md"
          >
            Next →
          </Button>
        </div>
      )}

      {/* Enhanced Floating Create Problem Button */}
      <div style={{
        position: "fixed",
        bottom: spacing.xl,
        right: spacing.xl,
        zIndex: 1000
      }}>
        <Link to="/create-problem?from=/feed" style={{ textDecoration: "none" }}>
          <div style={{
            width: "60px",
            height: "60px",
            backgroundColor: colors.primary,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            transition: "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            fontSize: "24px",
            color: colors.white,
            fontWeight: typography.fontWeight.bold,
            overflow: "hidden",
            whiteSpace: "nowrap",
            position: "relative"
          }}
          onMouseEnter={(e) => {
            e.target.style.width = "220px";
            e.target.style.borderRadius = "30px";
            e.target.style.justifyContent = "flex-start";
            e.target.style.paddingLeft = "20px";
            e.target.style.backgroundColor = colors.secondary;
            e.target.style.boxShadow = "0 6px 25px rgba(0,0,0,0.2)";
            e.target.innerHTML = '<span style="font-size: 16px;">Create New Problem</span><span style="position: absolute; right: 18px; top: 50%; transform: translateY(-50%); font-size: 24px;">+</span>';
          }}
          onMouseLeave={(e) => {
            e.target.style.width = "60px";
            e.target.style.borderRadius = "50%";
            e.target.style.justifyContent = "center";
            e.target.style.paddingLeft = "0px";
            e.target.style.backgroundColor = colors.primary;
            e.target.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
            e.target.innerHTML = '+';
          }}
          title="Create New Problem"
          >
            +
          </div>
        </Link>
    </div>

      </div>
    </Layout>
  );
}

export default Feed;
