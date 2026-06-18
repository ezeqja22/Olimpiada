import React from "react";
import { useNavigate } from "react-router-dom";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import Card from "../Card";
import FollowButton from "../FollowButton";
import { spacing } from "../../designSystem";
import { getUserInitial, getDisplayName } from "../../utils";

const renderMathContent = (text) => {
  if (!text) return "";

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const content = part.slice(2, -2);

      return (
        <div
          key={index}
          style={{
            textAlign: "left",
            margin: "10px 0",
            overflowX: "auto",
          }}
        >
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

function ProblemCard({
  problem,
  activeTab,
  currentUser,
  voteData,
  bookmarkData,
  followStatus,
  onVote,
  onBookmark,
  onFollow,
  onUnfollow,
}) {
  const navigate = useNavigate();

  const openProblem = () => {
    navigate(`/problem/${problem.id}?from=feed&tab=${activeTab}`);
  };

  const openAuthor = (event) => {
    event.stopPropagation();

    if (!problem.author) return;

    if (currentUser && problem.author.id === currentUser.id) {
      navigate("/profile");
    } else {
      navigate(`/user/${problem.author.username}`);
    }
  };

  return (
    <Card
      hover={true}
      className="problem-card"
      style={{
        marginBottom: spacing.lg,
        cursor: "pointer",
        border: "1px solid rgba(226,232,240,0.95)",
        boxShadow: "0 14px 36px rgba(15,23,42,0.05)",
        background: "rgba(255,255,255,0.96)",
      }}
      onClick={openProblem}
    >
      {problem.author ? (
        <div className="problem-author-row">
          <div className="problem-author-main">
            <div
              className="problem-avatar"
              style={{
                backgroundImage: problem.author.profile_picture
                  ? `url(${problem.author.profile_picture})`
                  : "none",
              }}
            >
              {!problem.author.profile_picture &&
                getUserInitial(problem.author.username)}
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="problem-author-name" onClick={openAuthor}>
                {getDisplayName(problem.author.username)}
              </div>

              <div className="problem-date">
                {new Date(problem.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {currentUser && problem.author.id !== currentUser.id && (
            <div onClick={(event) => event.stopPropagation()} style={{ flexShrink: 0 }}>
              <FollowButton
                isFollowing={followStatus[problem.author.id]}
                onFollow={() => onFollow(problem.author.id)}
                onUnfollow={() => onUnfollow(problem.author.id)}
                size="sm"
                style={{ marginLeft: "auto" }}
                isDeletedUser={problem.author.username.startsWith(
                  "__deleted_user_",
                )}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="problem-author-row">
          <div className="problem-author-main">
            <div
              className="problem-avatar"
              style={{
                backgroundColor: "#64748b",
                boxShadow: "0 12px 25px rgba(100,116,139,0.18)",
              }}
            >
              ?
            </div>

            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "14px",
                  color: "#334155",
                }}
              >
                Unknown Author
              </div>

              <div className="problem-date">
                {new Date(problem.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 className="problem-title">{renderMathContent(problem.title)}</h3>

      <div className="problem-description">
        {renderMathContent(problem.description)}
      </div>

      <div className="problem-footer">
        <div className="problem-tags">
          {problem.subject && (
            <span className="problem-tag tag-subject">{problem.subject}</span>
          )}

          {problem.level && problem.level.trim() && (
            <span className="problem-tag tag-level">{problem.level}</span>
          )}

          {problem.year && (
            <span className="problem-tag tag-year">Year {problem.year}</span>
          )}
        </div>

        <div className="problem-actions">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onVote(problem.id, "like");
            }}
            className={`action-button ${
              voteData[problem.id]?.user_vote === "like" ? "active-like" : ""
            }`}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795079/Like_Icon_hf3gef.svg"
              alt="Like"
              className="action-icon"
            />
            {voteData[problem.id]?.like_count || 0}
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onVote(problem.id, "dislike");
            }}
            className={`action-button ${
              voteData[problem.id]?.user_vote === "dislike"
                ? "active-dislike"
                : ""
            }`}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795077/Dislike_icon_vdy4ss.svg"
              alt="Dislike"
              className="action-icon"
            />
            {voteData[problem.id]?.dislike_count || 0}
          </button>

          <div className="comment-pill">
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg"
              alt="Comments"
              className="action-icon"
            />
            <span>{problem.comment_count || 0}</span>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onBookmark(problem.id);
            }}
            className={`bookmark-button ${
              bookmarkData[problem.id]?.isBookmarked ? "saved" : ""
            }`}
          >
            <img
              src={
                bookmarkData[problem.id]?.isBookmarked
                  ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797449/Save_FULL_Icon_Green_fdrxbj.svg"
                  : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760797443/Save_UNFULL_Icon_Green_wvn6qk.svg"
              }
              alt="Bookmark"
              className="action-icon"
            />

            <span>
              {bookmarkData[problem.id]?.isBookmarked ? "Saved" : "Save"}
            </span>
          </button>
        </div>
      </div>
    </Card>
  );
}

export default ProblemCard;
