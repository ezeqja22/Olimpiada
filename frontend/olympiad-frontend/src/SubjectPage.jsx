import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { colors, spacing, typography } from "./designSystem";
import { getUserInitial, getDisplayName } from "./utils";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import Layout from "./components/Layout";
import SearchBar from "./SearchBar";
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Helper function to render math content
const renderMathContent = (text) => {
    if (!text) return '';
    
    const hasLatex = /\\[a-zA-Z]+|[\^_]\s*[a-zA-Z0-9]|[\+\-\*\/\=\<\>\≤\≥\±\∓\∞]/.test(text);
    
    if (hasLatex) {
        try {
            return <InlineMath math={text} />;
        } catch (error) {
            console.warn('KaTeX rendering failed:', error);
            return <span>{text}</span>;
        }
    }
    
    return <span>{text}</span>;
};

function SubjectPage() {
    const { subject } = useParams();
    const [problems, setProblems] = useState([]);
    const [allProblems, setAllProblems] = useState([]); // Store all problems for filtering
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [voteData, setVoteData] = useState({});
    const [bookmarkData, setBookmarkData] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();
    
    // Feature settings
    const { checkFeatureEnabled, showFeatureDisabledAlert } = useFeatureSettings();

    // Convert URL parameter back to proper case
    const subjectName = subject.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    useEffect(() => {
        fetchProblems();
    }, [subject, currentPage]);

    const fetchProblems = async () => {
        console.log("🚀 fetchProblems called for subject:", subjectName);
        setLoading(true);
        try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${subjectName}`);
        console.log("📋 Problems fetched:", response.data.length);
        
        // Filter out forum problems - only show standalone problems
        const standaloneProblems = response.data.filter(problem => !problem.forum_id);
        console.log("📋 Standalone problems (excluding forum problems):", standaloneProblems.length);
        
        setAllProblems(standaloneProblems); // Store all standalone problems
        setProblems(standaloneProblems); // Initially show all standalone problems
            // For now, we'll implement simple pagination on frontend
            setTotalPages(Math.ceil(standaloneProblems.length / 20));
            
            // Fetch vote data for all standalone problems
            console.log("🔄 Starting to fetch vote data...");
            await fetchVoteData(standaloneProblems);
            console.log("🔄 Starting to fetch bookmark data...");
            await fetchBookmarkData(standaloneProblems);
            console.log("✅ All data fetching completed");
        } catch (error) {
            console.error("❌ Error fetching problems:", error);
            console.error("Subject name being used:", subjectName);
            setProblems([]);
        } finally {
            setLoading(false);
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
                problemsList.forEach(problem => {
                    voteDataMap[problem.id] = { like_count: 0, dislike_count: 0, user_vote: null };
                });
                setVoteData(voteDataMap);
                console.log("📊 Set default vote data:", voteDataMap);
                return;
            }
            
            // Get current user info
            let currentUserId = null;
            try {
                const userResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                currentUserId = userResponse.data.id;
                console.log("👤 Current user ID:", currentUserId);
            } catch (userError) {
                console.error("❌ Error fetching current user:", userError);
            }
            
            const votePromises = problemsList.map(async (problem) => {
                const problemId = problem.id;
                try {
                    const response = await axios.get(
                        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/${problemId}/votes`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                    console.log(`📊 Vote data for problem ${problemId}:`, response.data);
                    
                    // Process the vote data - backend returns array of votes, we need aggregated data
                    let likeCount = 0;
                    let dislikeCount = 0;
                    let userVote = null;
                    
                    if (Array.isArray(response.data)) {
                        response.data.forEach(vote => {
                            if (vote.vote_type === 'like') {
                                likeCount++;
                                if (vote.user_id === currentUserId) {
                                    userVote = 'like';
                                }
                            } else if (vote.vote_type === 'dislike') {
                                dislikeCount++;
                                if (vote.user_id === currentUserId) {
                                    userVote = 'dislike';
                                }
                            }
                        });
                    }
                    
                    const processedVoteData = {
                        like_count: likeCount,
                        dislike_count: dislikeCount,
                        user_vote: userVote
                    };
                    
                    console.log(`📊 Processed vote data for problem ${problemId}:`, processedVoteData);
                    return { problemId, voteData: processedVoteData };
                } catch (error) {
                    console.error(`Error fetching vote data for problem ${problemId}:`, error);
                    return { problemId, voteData: { like_count: 0, dislike_count: 0, user_vote: null } };
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

    const fetchBookmarkData = async (problemsList) => {
        console.log("🔍 fetchBookmarkData called with problems:", problemsList.length);
        try {
            const token = localStorage.getItem("token");
            console.log("🔑 Token exists for bookmarks:", !!token);
            if (!token) {
                // If no token, initialize with all false
                const bookmarkDataMap = {};
                problemsList.forEach(problem => {
                    bookmarkDataMap[problem.id] = false;
                });
                setBookmarkData(bookmarkDataMap);
                console.log("📊 Set default bookmark data:", bookmarkDataMap);
                return;
            }
            
            const problemIds = problemsList.map(problem => problem.id);
            console.log("📤 Sending bookmark request with problem IDs:", problemIds);
            // Try different request formats
            let response;
            try {
                // First try: wrapped format
                response = await axios.post(
                    `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/bookmark-status`,
                    { problem_ids: problemIds },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } catch (firstError) {
                console.log("🔄 First bookmark request failed, trying direct array format...");
                // Second try: direct array format
                response = await axios.post(
                    `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/problems/bookmark-status`,
                    problemIds,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            }
            // Convert backend format to frontend format
            const convertedData = {};
            Object.keys(response.data).forEach(problemId => {
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

    const handleVote = async (problemId, voteType) => {
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

    const handleBookmark = async (problemId) => {
        // Check if bookmarks are enabled
        if (!checkFeatureEnabled('bookmarks_enabled')) {
            showFeatureDisabledAlert('Bookmarks');
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const isCurrentlyBookmarked = bookmarkData[problemId];
            
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
                        [problemId]: false
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
                            [problemId]: true
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
                        [problemId]: true
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
                            [problemId]: false
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

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/homepage", { replace: true });
    };

    // Local search filtering
    const handleLocalSearch = (query) => {
        setSearchQuery(query);
        filterProblems(query);
    };

    // Local advanced search filtering
    const handleLocalAdvancedSearch = (advancedData) => {
        setSearchQuery(advancedData.query || "");
        filterProblemsAdvanced(advancedData);
    };

    // Filter problems based on search query
    const filterProblems = (query) => {
        if (!query.trim()) {
            setProblems(allProblems);
            setTotalPages(Math.ceil(allProblems.length / 20));
            setCurrentPage(1);
            return;
        }

        const filtered = allProblems.filter(problem => {
            const searchTerm = query.toLowerCase();
            return (
                problem.title.toLowerCase().includes(searchTerm) ||
                problem.description.toLowerCase().includes(searchTerm) ||
                (problem.tags && problem.tags.toLowerCase().includes(searchTerm)) ||
                (problem.level && problem.level.toLowerCase().includes(searchTerm)) ||
                (problem.year && problem.year.toString().includes(searchTerm))
            );
        });

        setProblems(filtered);
        setTotalPages(Math.ceil(filtered.length / 20));
        setCurrentPage(1);
    };

    // Advanced filtering
    const filterProblemsAdvanced = (filters) => {
        let filtered = [...allProblems];

        // Text search
        if (filters.query && filters.query.trim()) {
            const searchTerm = filters.query.toLowerCase();
            filtered = filtered.filter(problem => 
                problem.title.toLowerCase().includes(searchTerm) ||
                problem.description.toLowerCase().includes(searchTerm) ||
                (problem.tags && problem.tags.toLowerCase().includes(searchTerm))
            );
        }

        // Subject filter (should already be locked to current subject)
        if (filters.subjects && filters.subjects.length > 0) {
            filtered = filtered.filter(problem => 
                filters.subjects.includes(problem.subject)
            );
        }

        // Level filter
        if (filters.level && filters.level.trim()) {
            filtered = filtered.filter(problem => 
                problem.level && problem.level.toLowerCase().includes(filters.level.toLowerCase())
            );
        }

        // Year filter
        if (filters.year && filters.year.trim()) {
            filtered = filtered.filter(problem => 
                problem.year && problem.year.toString().includes(filters.year)
            );
        }

        // Tags filter
        if (filters.tags && filters.tags.trim()) {
            const tagTerms = filters.tags.toLowerCase().split(',').map(tag => tag.trim());
            filtered = filtered.filter(problem => 
                problem.tags && tagTerms.some(term => 
                    problem.tags.toLowerCase().includes(term)
                )
            );
        }

        setProblems(filtered);
        setTotalPages(Math.ceil(filtered.length / 20));
        setCurrentPage(1);
    };


    // Paginate problems (20 per page)
    const startIndex = (currentPage - 1) * 20;
    const endIndex = startIndex + 20;
    const paginatedProblems = problems.slice(startIndex, endIndex);

    if (loading) {
        return (
            <AnimatedLoader 
                type="subject" 
                message={`Loading ${subjectName} problems...`} 
                size="large"
            />
        );
    }

    return (
        <Layout showHomeButton={true}>
                <div style={{ marginBottom: "2rem" }}>
                    {/* Back Button */}
                    <div style={{ marginBottom: "1rem" }}>
                        <BackButton 
                            fallbackPath="/homepage"
                            style={{
                                backgroundColor: colors.light,
                                color: colors.gray[600],
                                border: `1px solid ${colors.gray[300]}`,
                                borderRadius: "8px",
                                padding: "8px 16px"
                            }}
                            hoverStyle={{
                                backgroundColor: colors.primary,
                                color: colors.white,
                                borderColor: colors.primary,
                                transform: "translateY(-1px)"
                            }}
                        />
                    </div>
                    
                    <h1 style={{ 
                        fontSize: "2.5rem", 
                        fontWeight: "700", 
                        color: "#1a4d3a",
                        marginBottom: "0.5rem"
                    }}>
                        {subjectName} Problems
                    </h1>
                    <p style={{ 
                        fontSize: "1.1rem", 
                        color: "#666",
                        marginBottom: "1rem"
                    }}>
                        {problems.length} problems found in {subjectName}
                        {searchQuery && ` (filtered by "${searchQuery}")`}
                    </p>

                    {/* Search Bar */}
                    <div style={{ 
                        marginBottom: "2rem",
                        display: "flex",
                        justifyContent: "center"
                    }}>
                        <div style={{ 
                            width: "100%",
                            maxWidth: "600px"
                        }}>
                            <SearchBar 
                                placeholder={`Search within ${subjectName} problems...`}
                                searchMode="subject"
                                lockedSubject={subjectName}
                                onLocalSearch={handleLocalSearch}
                                onAdvancedSearch={handleLocalAdvancedSearch}
                            />
                        </div>
                    </div>
                </div>

                {problems.length === 0 ? (
                    <div style={{ 
                        textAlign: "center", 
                        padding: "4rem 2rem",
                        backgroundColor: "white",
                        borderRadius: "12px",
                        border: "1px solid #e9ecef"
                    }}>
                        <h3 style={{ color: "#1a4d3a", marginBottom: "1rem" }}>
                            No {subjectName} problems yet!
                        </h3>
                        <p style={{ color: "#666", marginBottom: "2rem" }}>
                            Be the first to create a {subjectName.toLowerCase()} problem.
                        </p>
                        <Link to={`/create-problem?from=/subject/${encodeURIComponent(subjectName)}`}>
                            <button style={{
                                backgroundColor: "#1a4d3a",
                                color: "white",
                                border: "none",
                                padding: "12px 24px",
                                borderRadius: "8px",
                                fontSize: "16px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}>
                                Create Problem
                            </button>
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* 2-Column Grid Layout */}
                        <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", 
                            gap: "1.5rem",
                            marginBottom: "3rem"
                        }}>
                            {paginatedProblems.map((problem) => (
                                <div 
                                    key={problem.id} 
                                    onClick={() => navigate(`/problem/${problem.id}?from=subject&subject=${encodeURIComponent(subject)}`)}
                                    style={{
                                        backgroundColor: "white",
                                        border: "1px solid #e9ecef",
                                        borderRadius: "12px",
                                        padding: "1.5rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = "translateY(-2px)";
                                        e.target.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = "translateY(0)";
                                        e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                                    }}
                                >
                                    {/* Author Info */}
                                    {problem.author && (
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            marginBottom: "1rem", 
                                            gap: "10px",
                                            pointerEvents: "none"
                                        }}>
                                            <div style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                backgroundColor: "#1a4d3a",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "white",
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                                backgroundImage: problem.author.profile_picture ? 
                                                    `url(${problem.author.profile_picture})` : "none",
                                                backgroundSize: "cover",
                                                backgroundPosition: "center"
                                            }}>
                                                {!problem.author.profile_picture && getUserInitial(problem.author.username)}
                                            </div>
                                            <div>
                                                <div style={{ 
                                                    fontWeight: "600", 
                                                    fontSize: "14px", 
                                                    color: "#1a4d3a"
                                                }}>
                                                    {getDisplayName(problem.author.username)}
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#666" }}>
                                                    {new Date(problem.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <h3 style={{ 
                                        margin: "0 0 1rem 0", 
                                        color: "#333",
                                        fontSize: "1.25rem",
                                        fontWeight: "600",
                                        lineHeight: "1.4",
                                        pointerEvents: "none"
                                    }}>
                                        {renderMathContent(problem.title)}
                                    </h3>
                                    
                                    <div style={{ 
                                        color: "#666", 
                                        lineHeight: "1.6",
                                        marginBottom: "1rem",
                                        fontSize: "0.95rem",
                                        whiteSpace: "pre-wrap",
                                        pointerEvents: "none"
                                    }}>
                                        {renderMathContent(problem.description.length > 150 ? 
                                            problem.description.substring(0, 150) + "..." : 
                                            problem.description
                                        )}
                                    </div>

                                    <div style={{ 
                                        display: "flex", 
                                        gap: "8px", 
                                        marginBottom: "1rem", 
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        pointerEvents: "none"
                                    }}>
                                        <span style={{
                                            backgroundColor: "#e0e7ff",
                                            color: "#3730a3",
                                            padding: "6px 12px",
                                            borderRadius: "16px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            marginRight: "8px",
                                            boxShadow: "0 2px 6px rgba(30, 64, 175, 0.2)",
                                            transition: "all 0.2s ease"
                                        }}>
                                            {problem.subject}
                                        </span>
                                        {problem.level && problem.level.trim() && (
                                            <span style={{
                                                backgroundColor: "#fef3c7",
                                                color: "#92400e",
                                                padding: "6px 12px",
                                                borderRadius: "16px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                marginRight: "8px",
                                                boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
                                                transition: "all 0.2s ease"
                                            }}>
                                                {problem.level}
                                            </span>
                                        )}
                                        {problem.tags && problem.tags.trim() && (
                                            problem.tags.split(',').map((tag, index) => (
                                                <span key={index} style={{
                                                    backgroundColor: colors.tertiary,
                                                    color: "white",
                                                    padding: "6px 12px",
                                                    borderRadius: "16px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
                                                    transition: "all 0.2s ease"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = "translateY(-1px)";
                                                    e.target.style.boxShadow = "0 4px 12px rgba(124, 58, 237, 0.4)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = "translateY(0)";
                                                    e.target.style.boxShadow = "0 2px 8px rgba(124, 58, 237, 0.3)";
                                                }}>
                                                    {tag.trim()}
                                                </span>
                                            ))
                                        )}
                                        {problem.year && (
                                            <span style={{ 
                                                backgroundColor: "#dcfce7", 
                                                color: "#166534",
                                                padding: "6px 12px",
                                                borderRadius: "16px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                marginRight: "8px",
                                                boxShadow: "0 2px 6px rgba(26, 77, 58, 0.2)",
                                                transition: "all 0.2s ease"
                                            }}>
                                                Year: {problem.year}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ 
                                        display: "flex", 
                                        justifyContent: "space-between", 
                                        alignItems: "center",
                                        fontSize: "12px",
                                        color: "#666",
                                        pointerEvents: "none"
                                    }}>
                                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVote(problem.id, "like");
                                                }}
                                                style={{
                                                    backgroundColor: voteData[problem.id]?.user_vote === "like" ? "rgba(26, 77, 58, 0.1)" : "#f8f9fa",
                                                    border: `1px solid ${voteData[problem.id]?.user_vote === "like" ? "rgb(26, 77, 58)" : "#dee2e6"}`,
                                                    cursor: "pointer",
                                                    fontSize: "14px",
                                                    color: voteData[problem.id]?.user_vote === "like" ? "rgb(26, 77, 58)" : "#666",
                                                    fontWeight: voteData[problem.id]?.user_vote === "like" ? "bold" : "500",
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    transition: "all 0.2s ease",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    pointerEvents: "auto"
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
                                                        objectFit: "contain"
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
                                                    backgroundColor: voteData[problem.id]?.user_vote === "dislike" ? "rgba(118, 75, 162, 0.1)" : "#f8f9fa",
                                                    border: `1px solid ${voteData[problem.id]?.user_vote === "dislike" ? "rgb(118, 75, 162)" : "#dee2e6"}`,
                                                    cursor: "pointer",
                                                    fontSize: "14px",
                                                    color: voteData[problem.id]?.user_vote === "dislike" ? "rgb(118, 75, 162)" : "#666",
                                                    fontWeight: voteData[problem.id]?.user_vote === "dislike" ? "bold" : "500",
                                                    padding: "6px 12px",
                                                    borderRadius: "6px",
                                                    transition: "all 0.2s ease",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    pointerEvents: "auto"
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
                                                        objectFit: "contain"
                                                    }}
                                                />
                                                {voteData[problem.id]?.dislike_count || 0}
                                            </button>
                                            <span style={{ 
                                                pointerEvents: "none", 
                                                display: "flex", 
                                                alignItems: "center", 
                                                gap: "4px",
                                                fontSize: "12px",
                                                color: "#666"
                                            }}>
                                                <img 
                                                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg" 
                                                    alt="Comments"
                                                    style={{
                                                        height: "14px",
                                                        width: "14px",
                                                        objectFit: "contain"
                                                    }}
                                                />
                                                {problem.comment_count || 0}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleBookmark(problem.id);
                                                }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                }}
                                                style={{
                                                    padding: "4px 8px",
                                                    backgroundColor: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    pointerEvents: "auto"
                                                }}
                                            >
                                                <img 
                                                    src={bookmarkData[problem.id] 
                                                        ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797449/Save_FULL_Icon_Green_fdrxbj.svg"
                                                        : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797443/Save_UNFULL_Icon_Green_wvn6qk.svg"
                                                    } 
                                                    alt="Bookmark"
                                                    style={{
                                                        height: "16px",
                                                        width: "16px",
                                                        objectFit: "contain"
                                                    }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ 
                                display: "flex", 
                                justifyContent: "center", 
                                alignItems: "center", 
                                gap: "1rem",
                                marginTop: "3rem"
                            }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: currentPage === 1 ? "#ccc" : "#1a4d3a",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                        fontSize: "14px",
                                        fontWeight: "500"
                                    }}
                                >
                                    Previous
                                </button>
                                
                                <span style={{ 
                                    padding: "0 20px", 
                                    color: "#666",
                                    fontSize: "14px"
                                }}>
                                    Page {currentPage} of {totalPages}
                                </span>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: currentPage === totalPages ? "#ccc" : "#1a4d3a",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "8px",
                                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                                        fontSize: "14px",
                                        fontWeight: "500"
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Enhanced Floating Create Problem Button with Subject Pre-fill */}
                <div style={{
                    position: "fixed",
                    bottom: spacing.xl,
                    right: spacing.xl,
                    zIndex: 1000
                }}>
                    <Link to={`/create-problem?subject=${encodeURIComponent(subjectName)}&from=/subject/${encodeURIComponent(subjectName)}`} style={{ textDecoration: "none" }}>
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
                        title={`Create New ${subjectName} Problem`}
                        >
                            +
                        </div>
                    </Link>
                </div>
        </Layout>
    );
}

export default SubjectPage;
