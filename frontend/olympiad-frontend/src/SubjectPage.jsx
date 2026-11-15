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
import ProblemCard from "./components/feed/ProblemCard";
import "./DiscoveryWorkspace.css";
import "./SubjectWorkspace.css";
import {subjects} from "./navigation";
import {useLanguage} from "./context/LanguageContext";
import SearchBar from "./SearchBar";
import FollowButton from "./components/FollowButton";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { useToast } from "./components/ToastProvider";

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
  const {lang}=useLanguage(),sq=lang==="sq";
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
      <div className="discovery-workspace subject-workspace">
        <BackButton fallbackPath="/feed" />
        <header className="discovery-heading"><div><span className="discovery-eyebrow">{sq?'PRAKTIKË SIPAS LËNDËS':'SUBJECT PRACTICE'}</span><h1>{subjectName}</h1><p>{displayedCount} {sq?'probleme':'problems'}{searchQuery && ` · "${searchQuery}"`}</p></div><Link className="discovery-primary" to={`/create-problem?subject=${encodeURIComponent(subjectName)}&from=/subject/${encodeURIComponent(subject)}`}>{sq?'+ Shto problem':'+ Create Problem'}</Link></header>
        <div className="discovery-columns">
          <aside className="discovery-rail"><h2>{sq?'Lëndët':'Subjects'}</h2><nav aria-label={sq?'Lëndët':'Subjects'}>{subjects.map(item=>{const slug=item.toLowerCase().replaceAll(' ','-');return <Link key={item} to={`/subject/${slug}`} aria-current={slug===subject?'page':undefined}>{item}</Link>})}</nav><div className="discovery-rail-group"><Link to="/feed">{sq?'Të gjitha problemet →':'All problems →'}</Link><Link to="/courses">{sq?'Materiale & teste →':'Materials & tests →'}</Link><Link to="/weekly">{sq?'Sfida e javës →':'Weekly challenge →'}</Link></div></aside>
          <section className="discovery-results" aria-label={sq?'Problemet':'Problems'}>
            <SearchBar placeholder={`Search within current ${subjectName} page...`} searchMode="subject" lockedSubject={subjectName} onLocalSearch={handleLocalSearch} onAdvancedSearch={handleLocalAdvancedSearch}/>
            <p className="subject-search-scope">{sq?'Kërkimi filtron problemet në këtë faqe.':'Search filters the problems on this page.'}</p>
            {problems.length===0?<div className="subject-empty"><h2>{sq?'Nuk u gjetën probleme':'No problems found'}</h2><p>{searchQuery?(sq?'Provo një kërkim tjetër.':'Try a different search term.'):(sq?'Mund të shtosh një problem për këtë lëndë.':'You can add a problem for this subject.')}</p></div>:paginatedProblems.map(problem=><ProblemCard key={problem.id} problem={problem} problemHref={`/problem/${problem.id}?from=subject&subject=${encodeURIComponent(subject)}`} currentUser={currentUser} voteData={voteData} bookmarkData={{[problem.id]:{isBookmarked:!!bookmarkData[problem.id]}}} followStatus={followStatus} onVote={handleVote} onBookmark={handleBookmark} onFollow={handleFollowUser} onUnfollow={handleUnfollowUser}/>)}
            {!searchQuery&&totalPages>1&&<nav className="subject-pagination" aria-label={sq?'Faqet e problemeve':'Problem pages'}><button onClick={()=>handlePageChange(currentPage-1)} disabled={currentPage===1}>{sq?'← Më parë':'← Previous'}</button><span>{currentPage} / {totalPages}</span><button onClick={()=>handlePageChange(currentPage+1)} disabled={currentPage===totalPages}>{sq?'Më tej →':'Next →'}</button></nav>}
          </section>
        </div>
      </div>
    </Layout>
  );
}

export default SubjectPage;
