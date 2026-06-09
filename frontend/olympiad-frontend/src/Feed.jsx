/* eslint-disable no-unused-vars */
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
  Sparkles,
  Menu,
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
        <div key={index} className="my-2 text-left overflow-x-auto">
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
      const endpoint = `${
        process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"
      }/auth/problems/`;

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
    setFollowStatus((prev) => ({
      ...prev,
      [authorId]: !prev[authorId],
    }));
  };

  const navItems = [
    { id: "home", label: "Home", icon: LayoutDashboard, active: true },
    { id: "discover", label: "Discover", icon: Compass },
    { id: "library", label: "Library", icon: Library },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e8f3ee_0,#f8fafc_34%,#f8fafc_100%)] font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200/80 bg-white/90 shadow-[8px_0_30px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1a4d3a] text-sm font-black text-white shadow-lg shadow-[#1a4d3a]/20">
            SF
          </div>

          {!isSidebarCollapsed && (
            <div className="ml-3">
              <p className="text-lg font-black tracking-tight text-[#1a4d3a]">
                ScholarFlow
              </p>
              <p className="-mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Research Hub
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200 ${
                item.active
                  ? "bg-[#1a4d3a] text-white shadow-lg shadow-[#1a4d3a]/20"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <item.icon
                size={20}
                className={`shrink-0 transition-transform duration-200 ${
                  item.active
                    ? "text-white"
                    : "text-slate-400 group-hover:scale-110 group-hover:text-[#1a4d3a]"
                }`}
              />

              {!isSidebarCollapsed && (
                <span className="font-bold">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          {!isSidebarCollapsed && (
            <div className="mb-4 rounded-3xl border border-[#1a4d3a]/10 bg-[#1a4d3a]/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-[#1a4d3a]">
                <Sparkles size={16} />
                <span className="text-xs font-black uppercase tracking-widest">
                  Pro Tip
                </span>
              </div>
              <p className="text-xs font-medium leading-relaxed text-slate-500">
                Save problems to your library and build your own olympiad
                collection.
              </p>
            </div>
          )}

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <MoreHorizontal size={20} />
            {!isSidebarCollapsed && (
              <span className="text-sm font-bold">Collapse</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          isSidebarCollapsed ? "pl-20" : "pl-64"
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/75 px-8 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-6">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="rounded-2xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-[#1a4d3a] lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="relative w-full max-w-xl">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                type="text"
                placeholder="Search problems, subjects, authors..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-100/70 py-2.5 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#1a4d3a]/30 focus:bg-white focus:ring-4 focus:ring-[#1a4d3a]/10"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative rounded-2xl p-2.5 text-slate-400 transition-all hover:bg-[#1a4d3a]/5 hover:text-[#1a4d3a]">
              <Bell size={20} />
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>

            <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="group flex cursor-pointer items-center gap-3 rounded-2xl p-1.5 transition-all hover:bg-slate-100">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-black leading-none text-slate-800">
                  {currentUser?.username || "Guest User"}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Researcher
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-white bg-[#1a4d3a] text-sm font-black text-white shadow-lg shadow-[#1a4d3a]/20 ring-1 ring-slate-200">
                {getUserInitial(currentUser?.username || "G")}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-8 py-8">
          {/* Hero Section */}
          <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur-xl">
            <div className="relative z-10 max-w-3xl">
              <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-[#1a4d3a]/10 bg-[#1a4d3a]/5 px-4 py-2 text-[#1a4d3a]">
                <Sparkles size={15} />
                <span className="text-xs font-black uppercase tracking-[0.18em]">
                  Collaborative Science Practice
                </span>
              </div>

              <h1 className="mb-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Science Problems Feed
              </h1>

              <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-500">
                Refined scholarship through collaborative inquiry. Explore
                rigorous problems from the world's leading academic communities.
              </p>
            </div>

            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#1a4d3a]/10 blur-3xl" />
            <div className="absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
          </section>

          {/* Filters & Tabs */}
          <section className="mb-8 flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-fit rounded-2xl bg-slate-100 p-1">
              {["all", "following", "trending"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-5 py-2.5 text-xs font-black capitalize transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-white text-[#1a4d3a] shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab} Problems
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 px-2">
              <div className="flex items-center gap-2 border-r border-slate-200 pr-4 text-xs font-black uppercase tracking-widest text-slate-400">
                <BarChart2 size={14} />
                Sort By
              </div>

              <div className="relative">
                <select className="appearance-none bg-transparent py-2 pl-2 pr-8 text-sm font-black text-[#1a4d3a] outline-none">
                  <option>Most Recent</option>
                  <option>Most Voted</option>
                  <option>Complexity</option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </section>

          {/* Feed List */}
          <div className="space-y-6 pb-28">
            {loading ? (
              <div className="rounded-[2rem] border border-slate-200 bg-white/80 py-20 text-center shadow-sm">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#1a4d3a]" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Sourcing latest problems...
                </p>
              </div>
            ) : problems.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-20 text-center shadow-sm">
                <Compass size={52} className="mx-auto mb-4 text-slate-200" />
                <p className="text-lg font-black text-slate-600">
                  No findings in this sector yet.
                </p>
                <button className="mt-5 rounded-full bg-[#1a4d3a] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#1a4d3a]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#1a4d3a]/25">
                  Start a New Inquiry
                </button>
              </div>
            ) : (
              problems.map((problem) => (
                <article
                  key={problem.id}
                  className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#1a4d3a]/25 hover:shadow-2xl hover:shadow-[#1a4d3a]/10"
                >
                  <div className="relative z-10">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm font-black text-[#1a4d3a] shadow-sm">
                          {getUserInitial(problem.author?.username)}
                        </div>

                        <div className="min-w-0">
                          <Link
                            to={`/user/${problem.author?.username}`}
                            className="block truncate text-sm font-black text-slate-900 transition-colors hover:text-[#1a4d3a] hover:underline"
                          >
                            {getDisplayName(problem.author?.username)}
                          </Link>

                          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Theoretical Physics Institute • 2h ago
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFollow(problem.author?.id);
                        }}
                        className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition-all duration-200 ${
                          followStatus[problem.author?.id]
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "border border-slate-900 bg-white text-slate-900 hover:bg-slate-900 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {followStatus[problem.author?.id] ? (
                            <>
                              <UserCheck size={14} />
                              Following
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} />
                              Follow
                            </>
                          )}
                        </span>
                      </button>
                    </div>

                    <h3 className="mb-3 text-xl font-black leading-snug text-slate-950 transition-colors group-hover:text-[#1a4d3a] sm:text-2xl">
                      {renderMathContent(problem.title)}
                    </h3>

                    <div className="mb-6 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {renderMathContent(problem.description)}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                          {problem.subject}
                        </span>

                        <span className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
                          {problem.level}
                        </span>

                        <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                          {problem.year}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-3">
                        <div className="flex items-center gap-1 rounded-2xl bg-slate-50 p-1">
                          <button
                            onClick={() => handleVote(problem.id, "like")}
                            className={`rounded-xl p-2 transition-all ${
                              voteData[problem.id]?.user_vote === "like"
                                ? "bg-emerald-100 text-emerald-700"
                                : "text-slate-400 hover:bg-white hover:text-slate-700"
                            }`}
                          >
                            <ThumbsUp size={18} />
                          </button>

                          <span className="pr-2 text-xs font-black text-slate-500">
                            1.2k
                          </span>
                        </div>

                        <div className="flex items-center gap-1 rounded-2xl bg-slate-50 p-1">
                          <button
                            onClick={() => handleVote(problem.id, "dislike")}
                            className={`rounded-xl p-2 transition-all ${
                              voteData[problem.id]?.user_vote === "dislike"
                                ? "bg-rose-100 text-rose-700"
                                : "text-slate-400 hover:bg-white hover:text-slate-700"
                            }`}
                          >
                            <ThumbsDown size={18} />
                          </button>

                          <span className="pr-2 text-xs font-black text-slate-500">
                            24
                          </span>
                        </div>

                        <button className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-slate-400 transition-all hover:bg-[#1a4d3a]/5 hover:text-[#1a4d3a]">
                          <MessageSquare size={18} />
                          <span className="text-xs font-black">
                            {problem.comment_count}
                          </span>
                        </button>

                        <button
                          onClick={() => toggleBookmark(problem.id)}
                          className={`rounded-2xl p-2.5 transition-all ${
                            bookmarkData[problem.id]?.isBookmarked
                              ? "bg-[#1a4d3a] text-white shadow-lg shadow-[#1a4d3a]/20"
                              : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          <Bookmark size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#1a4d3a]/5 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                </article>
              ))
            )}

            {/* Sponsored Challenge Card */}
            {!loading && problems.length > 0 && (
              <article className="group relative overflow-hidden rounded-[2.5rem] bg-[#1a4d3a] p-8 text-white shadow-2xl shadow-[#1a4d3a]/25">
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                />

                <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-xs font-black">
                        SF
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                        ScholarFlow Editorial
                      </span>

                      <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/80">
                        Sponsored
                      </span>
                    </div>

                    <h2 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
                      The Riemann Hypothesis: Computational Approaches
                    </h2>

                    <p className="max-w-xl text-sm leading-relaxed text-white/70">
                      Explore the non-trivial zeros of the zeta function{" "}
                      <InlineMath math={"\\zeta(s)"} /> using high-performance
                      cluster computing.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <span className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                        Math
                      </span>

                      <span className="rounded-xl border border-amber-500/20 bg-amber-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200">
                        Legendary
                      </span>

                      <button className="ml-auto flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#1a4d3a] transition-all hover:-translate-y-0.5 hover:shadow-xl">
                        Explore
                        <Plus
                          size={16}
                          className="transition-transform group-hover:rotate-90"
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex aspect-square w-full max-w-[220px] flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/10 bg-white/5 transition-colors group-hover:bg-white/10">
                    <div className="text-7xl font-black text-white/20 transition-opacity group-hover:text-white/30">
                      Σ
                    </div>

                    <div className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                      Featured Challenge
                    </div>
                  </div>
                </div>
              </article>
            )}

            {!loading && (
              <button className="w-full rounded-[1.5rem] border-2 border-slate-200 bg-white/85 py-4 text-sm font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1a4d3a] hover:text-[#1a4d3a] hover:shadow-xl hover:shadow-[#1a4d3a]/5">
                Load More Problems
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Modern Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-4 group">
        <Link to="/create-problem?from=/feed" className="flex items-center">
          <div className="flex h-14 w-14 items-center gap-3 overflow-hidden rounded-full bg-[#1a4d3a] pr-2 shadow-2xl shadow-[#1a4d3a]/30 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:w-64">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center text-white">
              <Plus
                size={28}
                className="transition-transform duration-500 group-hover:rotate-90"
              />
            </div>

            <span className="whitespace-nowrap text-sm font-black uppercase tracking-widest text-white opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100">
              Create New Problem
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default Feed;
