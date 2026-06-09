import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  Search,
  Plus,
  MessageSquare,
  Bookmark,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  UserPlus,
  UserCheck,
  LayoutDashboard,
  Compass,
  Library,
  BarChart2,
  Settings,
  Bell,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";

// Helper for initials
const getUserInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");
const getDisplayName = (name) => name || "Anonymous";

// Simple Math Renderer
const renderMathContent = (text) => {
  if (!text) return "";
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return (
        <div key={index} className="my-2 text-left">
          <BlockMath math={part.slice(2, -2)} />
        </div>
      );
    } else if (part.startsWith("$") && part.endsWith("$")) {
      return <InlineMath key={index} math={part.slice(1, -1)} />;
    }
    return <span key={index}>{part}</span>;
  });
};

function Feed() {
  const location = useLocation();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [voteData, setVoteData] = useState({});
  const [followStatus, setFollowStatus] = useState({});
  const [bookmarkData, setBookmarkData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchProblems();
      fetchCurrentUser();
    } else {
      // Mock data for demo purposes if no token/API
      setProblems([
        {
          id: 1,
          title:
            "Calculation of Wave-Particle Duality in $\\text{SiO}_2$ Quantum Dots",
          description:
            "Given the lattice constant $a = 5.43\\text{\\AA}$ and the potential well depth $V_0$, calculate the first three energy eigenvalues...",
          subject: "Physics",
          level: "Advanced",
          year: "2024",
          author: { id: 101, username: "Dr. Julian Sorel" },
          created_at: new Date().toISOString(),
          comment_count: 156,
        },
        {
          id: 2,
          title: "Structural Homology of CRISPR-Cas9 Variants",
          description:
            "Analyze the following protein sequence alignment to determine the conserved catalytic residues in the RuvC domain...",
          subject: "Biology",
          level: "Intermediate",
          year: "2023",
          author: { id: 102, username: "Prof. Maria Lopez" },
          created_at: new Date().toISOString(),
          comment_count: 42,
        },
      ]);
      setLoading(false);
    }
  }, [activeTab]);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const endpoint = `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/`;
      const response = await axios.get(endpoint);
      setProblems(response.data.problems || response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/me`,
      );
      setCurrentUser(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVote = (id, type) => {
    setVoteData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        user_vote: prev[id]?.user_vote === type ? null : type,
      },
    }));
  };

  const toggleBookmark = (id) => {
    setBookmarkData((prev) => ({
      ...prev,
      [id]: { isBookmarked: !prev[id]?.isBookmarked },
    }));
  };

  const toggleFollow = (authorId) => {
    setFollowStatus((prev) => ({ ...prev, [authorId]: !prev[authorId] }));
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 z-50 flex flex-col ${isSidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
          <div className="w-8 h-8 bg-[#1a4d3a] rounded-lg flex items-center justify-center text-white font-black text-sm">
            SF
          </div>
          {!isSidebarCollapsed && (
            <span className="ml-3 font-bold text-xl tracking-tight text-[#1a4d3a]">
              ScholarFlow
            </span>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {[
            { id: "home", label: "Home", icon: LayoutDashboard, active: true },
            { id: "discover", label: "Discover", icon: Compass },
            { id: "library", label: "Library", icon: Library },
            { id: "analytics", label: "Analytics", icon: BarChart2 },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${item.active ? "bg-[#1a4d3a]/5 text-[#1a4d3a] font-semibold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <item.icon
                size={20}
                className={
                  item.active
                    ? "text-[#1a4d3a]"
                    : "group-hover:scale-110 transition-transform"
                }
              />
              {!isSidebarCollapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-slate-800 transition-colors"
          >
            <MoreHorizontal size={20} />
            {!isSidebarCollapsed && (
              <span className="text-sm font-medium">Collapse</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? "pl-20" : "pl-64"}`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-8 flex-1">
            <div className="relative w-full max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search problems, papers, levels..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-[#1a4d3a]/10 focus:border-[#1a4d3a]/30 transition-all outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-[#1a4d3a] hover:bg-[#1a4d3a]/5 rounded-full transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none">
                  {currentUser?.username || "Guest User"}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Researcher
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#1a4d3a] text-white flex items-center justify-center text-sm font-black shadow-md border-2 border-white ring-1 ring-slate-200">
                {getUserInitial(currentUser?.username || "G")}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8 max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              Science Problems Feed
            </h1>
            <p className="text-slate-500 font-medium max-w-2xl">
              Refined scholarship through collaborative inquiry. Explore
              rigorous problems from the world's leading academic communities.
            </p>
          </div>

          {/* Filters & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex p-1 bg-slate-50 rounded-xl w-fit">
              {["all", "following", "trending"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? "bg-white text-[#1a4d3a] shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {tab} Problems
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 px-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest border-r border-slate-200 pr-4">
                <BarChart2 size={14} /> Sort By:
              </div>
              <div className="relative">
                <select className="appearance-none pl-2 pr-8 py-1.5 bg-transparent text-sm font-bold text-[#1a4d3a] outline-none cursor-pointer">
                  <option>Most Recent</option>
                  <option>Most Voted</option>
                  <option>Complexity</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Feed List */}
          <div className="space-y-6 pb-24">
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1a4d3a] rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                  Sourcing latest problems...
                </p>
              </div>
            ) : problems.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-20 text-center">
                <Compass size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold text-lg">
                  No findings in this sector yet.
                </p>
                <button className="mt-4 text-[#1a4d3a] font-bold text-sm hover:underline">
                  Start a New Inquiry
                </button>
              </div>
            ) : (
              problems.map((problem) => (
                <div
                  key={problem.id}
                  className="group bg-white border border-slate-200 rounded-3xl p-6 hover:border-[#1a4d3a]/30 hover:shadow-xl hover:shadow-[#1a4d3a]/5 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[#1a4d3a] font-black text-sm border border-slate-200">
                        {getUserInitial(problem.author?.username)}
                      </div>
                      <div>
                        <Link
                          to={`/user/${problem.author?.username}`}
                          className="text-sm font-bold text-slate-900 hover:text-[#1a4d3a] hover:underline decoration-2 transition-colors"
                        >
                          {getDisplayName(problem.author?.username)}
                        </Link>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                          Theoretical Physics Institute • 2h ago
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFollow(problem.author?.id);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${followStatus[problem.author?.id] ? "bg-slate-100 text-slate-600" : "bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"}`}
                    >
                      {followStatus[problem.author?.id]
                        ? "Following"
                        : "Follow"}
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-3 group-hover:text-[#1a4d3a] transition-colors">
                    {renderMathContent(problem.title)}
                  </h3>

                  <div className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                    {renderMathContent(problem.description)}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 shadow-sm">
                        {problem.subject}
                      </span>
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-100 shadow-sm">
                        {problem.level}
                      </span>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 shadow-sm">
                        {problem.year}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVote(problem.id, "like")}
                          className={`p-2 rounded-xl transition-all ${voteData[problem.id]?.user_vote === "like" ? "bg-emerald-50 text-emerald-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
                        >
                          <ThumbsUp size={18} />
                        </button>
                        <span className="text-xs font-bold text-slate-500">
                          1.2k
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleVote(problem.id, "dislike")}
                          className={`p-2 rounded-xl transition-all ${voteData[problem.id]?.user_vote === "dislike" ? "bg-rose-50 text-red-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
                        >
                          <ThumbsDown size={18} />
                        </button>
                        <span className="text-xs font-bold text-slate-500">
                          24
                        </span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-[#1a4d3a] hover:bg-[#1a4d3a]/5 rounded-xl transition-all cursor-pointer">
                        <MessageSquare size={18} />
                        <span className="text-xs font-bold">
                          {problem.comment_count}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleBookmark(problem.id)}
                        className={`p-2 rounded-xl transition-all ${bookmarkData[problem.id]?.isBookmarked ? "bg-[#1a4d3a] text-white shadow-lg shadow-[#1a4d3a]/20" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
                      >
                        <Bookmark size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Subtle side indicator */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#1a4d3a]/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
                </div>
              ))
            )}

            {/* Sponsored Challenge Card */}
            {!loading && problems.length > 0 && (
              <div className="bg-[#1a4d3a] rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-[#1a4d3a]/20 relative overflow-hidden group">
                <div className="relative z-10 flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-xs">
                      SF
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                      ScholarFlow Editorial
                    </span>
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded italic">
                      Sponsored
                    </span>
                  </div>
                  <h2 className="text-3xl font-black leading-tight">
                    The Riemann Hypothesis: Computational Approaches
                  </h2>
                  <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                    Explore the non-trivial zeros of the zeta function
                    $\zeta(s)$ using high-performance cluster computing.
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                      Math
                    </span>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-200 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-500/20">
                      Legendary
                    </span>
                    <button className="ml-auto group/btn flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                      Explore{" "}
                      <Plus
                        size={16}
                        className="group-hover/btn:translate-x-1 transition-transform"
                      />
                    </button>
                  </div>
                </div>
                <div className="relative z-10 w-full md:w-1/3 aspect-square bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4 group-hover:bg-white/10 transition-colors">
                  <div className="text-6xl opacity-20 group-hover:opacity-40 transition-opacity">
                    $\Sigma$
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                    Featured Challenge
                  </div>
                </div>
                {/* Decorative Pattern */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                />
              </div>
            )}

            <button className="w-full py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-black text-sm uppercase tracking-widest hover:border-[#1a4d3a] hover:text-[#1a4d3a] transition-all">
              Load More Problems
            </button>
          </div>
        </main>
      </div>

      {/* Modern Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-4 group">
        <Link to="/create-problem?from=/feed" className="flex items-center">
          <div className="flex items-center gap-3 pr-2 overflow-hidden h-14 w-14 group-hover:w-64 bg-[#1a4d3a] rounded-full shadow-2xl shadow-[#1a4d3a]/30 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="h-14 w-14 shrink-0 flex items-center justify-center text-white">
              <Plus
                size={28}
                className="group-hover:rotate-90 transition-transform duration-500"
              />
            </div>
            <span className="text-white font-black text-sm uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              Create New Problem
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default Feed;
