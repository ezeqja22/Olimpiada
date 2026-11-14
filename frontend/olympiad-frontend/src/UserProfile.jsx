/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable jsx-a11y/img-redundant-alt */
import {useAuth} from "./context/AuthContext";
import {useSearchParams} from "react-router-dom";
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import BackButton from "./components/BackButton";
import AnimatedLoader from "./components/AnimatedLoader";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { getUserInitial } from "./utils";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./ProfilePages.css";
import "./AccountWorkspace.css";
import ProblemCard from "./components/feed/ProblemCard";
import {useLanguage} from "./context/LanguageContext";
import { useToast } from "./components/ToastProvider";
import { useConfirm } from "./components/ConfirmProvider";

// Helper function to render math content
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
    } else if (part.startsWith("$") && part.endsWith("$")) {
      const content = part.slice(1, -1);
      return <InlineMath key={index} math={content} />;
    } else {
      return <span key={index}>{part}</span>;
    }
  });
};

function UserProfile() {
  const {lang} = useLanguage();
  const label = (en, sq) => lang === "sq" ? sq : en;
  const {logout}=useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabParams,setTabParams]=useSearchParams();
  const activeTab=["problems","comments","bookmarks","drafts"].includes(tabParams.get("tab"))?tabParams.get("tab"):"problems";
  const setActiveTab=tab=>setTabParams(p=>{const n=new URLSearchParams(p);n.set("tab",tab);return n});
  const [commentsSubTab, setCommentsSubTab] = useState("all");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [voteData, setVoteData] = useState({});
  const [bookmarkData, setBookmarkData] = useState({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const fileInputRef = useRef(null);
  const [editFormData, setEditFormData] = useState({
    bio: "",
  });

  const [isMobile, setIsMobile] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const openConnections = (connectionType, userId) => {
    if (!userId) return;

    const returnTo = `${location.pathname}${location.search || ""}`;
    sessionStorage.setItem(`connectionsReturnTo:${userId}`, returnTo);

    navigate(`/${connectionType}/${userId}`, {
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUserProfile();
      fetchDrafts();
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/user/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setProfileData(response.data);

      if (response.data.problems && response.data.problems.length > 0) {
        await fetchVoteData(response.data.problems);
      }

      if (response.data.bookmarks && response.data.bookmarks.length > 0) {
        const bookmarkedProblems = response.data.bookmarks.map(
          (bookmark) => bookmark.problem,
        );
        await fetchVoteData(bookmarkedProblems);
        await fetchBookmarkData(bookmarkedProblems);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoteData = async (problemsList) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, skipping vote data fetch");
        return;
      }

      console.log(
        "Fetching vote data for problems:",
        problemsList.map((p) => p.id),
      );

      const votePromises = problemsList.map(async (problem) => {
        const problemId = problem.id;
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/${problemId}/vote-status`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          console.log(`Vote data for problem ${problemId}:`, response.data);
          return { problemId, voteData: response.data };
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

      console.log("Final vote data map:", voteDataMap);
      setVoteData(voteDataMap);
    } catch (error) {
      console.error("Error fetching vote data:", error);
    }
  };

  const fetchBookmarkData = async (problemsList) => {
    try {
      const token = localStorage.getItem("token");
      const problemIds = problemsList.map((problem) => problem.id);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/problems/bookmark-status`,
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
      problemsList.forEach((problem) => {
        bookmarkDataMap[problem.id] = false;
      });
      setBookmarkData(bookmarkDataMap);
    }
  };

  const fetchDrafts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/drafts`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setDrafts(response.data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    }
  };

  const handleVote = async (problemId, voteType) => {
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

      setVoteData((prev) => ({
        ...prev,
        [problemId]: response.data,
      }));
    } catch (error) {
      console.error("Error voting:", error);
      showToast("Error voting on problem", "error");
    }
  };

  const handleEditProfile = () => {
    setEditFormData({
      bio: profileData?.user?.bio || "",
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/user/profile`,
        editFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setProfileData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          bio: editFormData.bio,
        },
      }));

      setIsEditingProfile(false);
      showToast("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Error updating profile. Please try again.", "error");
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditFormData({
      bio: "",
      profile_picture: "",
    });
  };

  const handleBookmark = async (problemId) => {
    try {
      const token = localStorage.getItem("token");
      const isCurrentlyBookmarked = bookmarkData[problemId];

      if (isCurrentlyBookmarked) {
        try {
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

          fetchUserProfile();
        } catch (deleteError) {
          console.error("Error removing bookmark:", deleteError);
        }
      } else {
        try {
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
        } catch (postError) {
          console.error("Error adding bookmark:", postError);
        }
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/user/profile-picture`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setProfileData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          profile_picture: response.data.file_path,
        },
      }));

      showToast("Profile picture updated successfully!", "success");
    } catch (error) {
      console.error("Error uploading file:", error);
      showToast("Error uploading file. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!user.profile_picture) {
      showToast("No profile picture to remove!", "error");
      return;
    }

    const confirmed = await confirm({
      title: "Remove profile picture?",
      message: "Are you sure you want to remove your profile picture?",
      confirmText: "Remove",
      cancelText: "Cancel",
      variant: "success",
    });

    if (!confirmed) return;

    setUploading(true);

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/user/profile-picture`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setProfileData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          profile_picture: null,
        },
      }));

      showToast("Profile picture removed successfully!", "success");
    } catch (error) {
      console.error("Error removing profile picture:", error);
      showToast("Error removing profile picture. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    const confirmed = await confirm({
      title: "Delete draft?",
      message:
        "Are you sure you want to delete this draft? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "success",
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Please log in to delete draft", "error");
        return;
      }

      await axios.delete(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/drafts/${draftId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));

      showToast("Draft deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting draft:", error);
      showToast(
        error.response?.data?.detail || "Failed to delete draft",
        "error",
      );
    }
  };

  const handleProfilePictureClick = () => {
    if (user.profile_picture) {
      setShowImageModal(true);
    }
  };

  const handleCameraOverlayClick = (e) => {
    e.stopPropagation();
    fileInputRef.current.click();
  };

  const openProblem = (problemId) => {
    if (!problemId) return;
    navigate(`/problem/${problemId}?from=/profile`);
  };

  const getCommentProblemId = (comment) => {
    return (
      comment.problem_id ||
      comment.problem?.id ||
      comment.problemId ||
      comment.problemID
    );
  };

  const openCommentProblem = (comment) => {
    const problemId = getCommentProblemId(comment);

    if (!problemId) {
      showToast("Could not find the problem for this comment.", "error");
      return;
    }

    navigate(
      `/problem/${problemId}?from=/profile&comment=${comment.id}#comment-${comment.id}`,
    );
  };

  const handleClickableKeyDown = (e, callback) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback();
    }
  };

  const handleLogout = () => {
    logout();

    setProfileData(null);
    setActiveTab("problems");
    setIsEditingProfile(false);
    setEditFormData({ bio: "", profile_picture: "" });
    setSelectedFile(null);

    navigate("/homepage", { replace: true });
  };

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="profile"
          message="Loading profile..."
          size="large"
        />
      </Layout>
    );
  }

  if (!profileData) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Error loading profile</h2>
      </div>
    );
  }

  const { user, problems, comments, bookmarks } = profileData;

  const sortedComments = comments
    ? [...comments].sort((a, b) => {
        if (a.is_solution && !b.is_solution) return -1;
        if (!a.is_solution && b.is_solution) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      })
    : [];

  return (
    <Layout showHomeButton={true}>
      <div className="profile-page account-workspace">
        <BackButton fallbackPath={profileBackPath} />
        <header className="account-heading"><div><p>{label("Your account", "Llogaria jote")}</p><h1>{label("My Profile", "Profili im")}</h1></div><Link to="/settings">{label("Account settings", "Cilësimet e llogarisë")} →</Link></header>
        <div className="account-columns">
          <aside className="account-identity">
            <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} ref={fileInputRef} hidden />
            <button className="account-avatar" onClick={handleProfilePictureClick} disabled={!user.profile_picture} aria-label={label("View profile picture", "Shiko fotografinë e profilit")}>
              {user.profile_picture ? <img src={user.profile_picture} alt="" /> : getUserInitial(user.username)}
            </button>
            <button className="account-photo-action" onClick={handleCameraOverlayClick} disabled={uploading}>{label("Change photo", "Ndrysho fotografinë")}</button>
            <h2>{user.username}</h2><p className="account-email">{user.email}</p>
            {user.bio && <p className="account-bio">{user.bio}</p>}
            <div className="account-connections">
              <button onClick={() => openConnections("followers", user.id)}><strong>{user.follower_count || 0}</strong>{label("Followers", "Ndjekës")}</button>
              <button onClick={() => openConnections("following", user.id)}><strong>{user.following_count || 0}</strong>{label("Following", "Duke ndjekur")}</button>
            </div>
            <button className="account-outline" onClick={handleEditProfile}>{label("Edit Profile", "Ndrysho profilin")}</button>
            {isEditingProfile && <section className="account-edit" aria-label={label("Edit profile", "Ndrysho profilin")}>
              <label htmlFor="profile-bio">{label("About you", "Rreth teje")}</label>
              <textarea id="profile-bio" value={editFormData.bio} onChange={e => setEditFormData({...editFormData,bio:e.target.value})} rows={5} />
              <div className="account-edit-actions"><button onClick={handleSaveProfile}>{label("Save Changes", "Ruaj ndryshimet")}</button><button onClick={handleCancelEdit}>{label("Cancel", "Anulo")}</button></div>
              {user.profile_picture && <button className="account-danger-link" onClick={handleRemoveProfilePicture} disabled={uploading}>{label("Remove profile picture", "Hiq fotografinë e profilit")}</button>}
            </section>}
            <Link className="account-create" to="/create-problem?from=/profile">+ {label("Create a problem", "Krijo një problem")}</Link>
          </aside>
          <section className="account-library" aria-label={label("Your contributions and saved work", "Kontributet dhe puna e ruajtur")}>
            <nav className="account-sections" aria-label={label("Profile sections", "Seksionet e profilit")}>
              {[["problems",label("My Problems", "Problemet e mia"),problems.length],["comments",label("My Comments", "Komentet e mia"),comments.length],["bookmarks",label("My Bookmarks", "Të ruajturat"),bookmarks.length],["drafts",label("My Drafts", "Draftet e mia"),drafts.length]].map(([key,name,count]) => <button key={key} aria-current={activeTab===key?"page":undefined} onClick={()=>{setActiveTab(key);if(key==="drafts")fetchDrafts();}}>{name}<span>{count}</span></button>)}
            </nav>
            <div className="account-contributions">
              {(activeTab === "problems" || activeTab === "bookmarks") && <>
                {(activeTab === "problems" ? problems : bookmarks.map(item=>item.problem).filter(Boolean)).map(problem=><ProblemCard key={problem.id} problem={activeTab === "problems" ? {...problem,author:user} : problem} currentUser={user} voteData={voteData} bookmarkData={Object.fromEntries(Object.entries(bookmarkData).map(([id,saved])=>[id,{isBookmarked:saved}]))} onVote={handleVote} onBookmark={handleBookmark} showFollow={false} problemHref={`/problem/${problem.id}?from=${encodeURIComponent('/profile?tab='+activeTab)}`} />)}
                {(activeTab === "problems" ? problems.length : bookmarks.length) === 0 && <div className="account-empty"><h2>{activeTab === "problems" ? label("Your problems", "Problemet e tua") : label("Saved problems", "Problemet e ruajtura")}</h2><p>{activeTab === "problems" ? label("Problems you publish will appear here.", "Problemet që publikon do të shfaqen këtu.") : label("Bookmark a problem to return to it here.", "Ruaj një problem për ta gjetur këtu më vonë.")}</p><Link to={activeTab === "problems" ? "/create-problem?from=/profile" : "/feed"}>{activeTab === "problems" ? label("Create a problem", "Krijo një problem") : label("Browse problems", "Shfleto problemet")} →</Link></div>}
              </>}
              {activeTab === "comments" && <>
                <div className="account-comment-filter"><button aria-pressed={commentsSubTab==="all"} onClick={()=>setCommentsSubTab("all")}>{label("All comments", "Të gjitha komentet")} ({sortedComments.length})</button><button aria-pressed={commentsSubTab==="solutions"} onClick={()=>setCommentsSubTab("solutions")}>{label("Solutions", "Zgjidhjet")} ({sortedComments.filter(comment=>comment.is_solution).length})</button></div>
                {sortedComments.filter(comment=>commentsSubTab==="all"||comment.is_solution).map(comment=><article className="account-comment" key={comment.id}><div className="account-entry-meta"><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString()}</time>{comment.is_solution && <span>{label("Accepted solution", "Zgjidhje e pranuar")}</span>}</div><h2><button onClick={()=>openCommentProblem(comment)}>{renderMathContent(comment.problem?.title || label("View related problem", "Shiko problemin përkatës"))}</button></h2><div className="account-math">{renderMathContent(comment.text)}</div></article>)}
                {!sortedComments.some(comment=>commentsSubTab==="all"||comment.is_solution) && <p className="account-empty">{label("No comments in this section yet.", "Nuk ka komente në këtë seksion ende.")}</p>}
              </>}
              {activeTab === "drafts" && <>
                <p className="account-private-note">{label("Only you can see these unfinished problems.", "Vetëm ti mund t'i shohësh këto probleme të papërfunduara.")}</p>
                {drafts.map(draft=><article className="account-draft" key={draft.id}>
                  <div className="account-entry-meta"><span>{draft.subject}</span><span>{draft.level}</span><time dateTime={draft.updated_at}>{label("Updated", "Përditësuar")} {new Date(draft.updated_at).toLocaleDateString()}</time></div>
                  <h2><Link to={`/create-problem?draft=${draft.id}&from=/profile`}>{renderMathContent(draft.title)}</Link></h2>
                  <details><summary>{label("Read full draft", "Lexo draftin e plotë")}</summary><div className="account-math">{renderMathContent(draft.description)}</div></details>
                  {draft.tags && <p className="account-draft-tags">{draft.tags.split(',').map(tag=>tag.trim()).filter(Boolean).join(' · ')}</p>}
                  <div className="account-draft-actions"><Link to={`/create-problem?draft=${draft.id}&from=/profile`}>{label("Finish Problem", "Përfundo problemin")} →</Link><button onClick={()=>handleDeleteDraft(draft.id)}>{label("Delete", "Fshi")}</button></div>
                </article>)}
                {!drafts.length && <div className="account-empty"><h2>{label("Your drafts", "Draftet e tua")}</h2><p>{label('Use "Save in Drafts" in the problem editor to keep work for later.', 'Përdor "Ruaj në drafte" në redaktor për të vazhduar punën më vonë.')}</p><Link to="/create-problem?from=/profile">{label("Start a problem", "Fillo një problem")} →</Link></div>}
              </>}
            </div>
          </section>
        </div>
        {showImageModal && user.profile_picture && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowImageModal(false)}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "90vw",
                maxHeight: "90vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageModal(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1001,
                }}
              >
                ×
              </button>

              <img
                src={user.profile_picture}
                alt="Profile Picture"
                style={{
                  maxWidth: "100%",
                  maxHeight: "90vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                  display: "block",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default UserProfile;
