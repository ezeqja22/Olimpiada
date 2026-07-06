import React from "react";
import { useNavigate } from "react-router-dom";
import { colors } from "./designSystem";
import MathRenderer from "./MathRenderer";
import "./forumModern.css";

const ForumProblemCard = ({ problem, author, forumId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!problem?.id) return;

    const forumQuery = forumId ? `&forumId=${forumId}` : "";
    navigate(`/problem/${problem.id}?from=forum${forumQuery}`);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  if (!problem) {
    return <div className="forum-problem-card">Loading problem...</div>;
  }

  const getDifficultyColor = (level) => {
    switch (level?.toLowerCase()) {
      case "elementary":
        return colors.success;
      case "middle school":
        return colors.warning;
      case "high school":
        return colors.primary;
      case "undergraduate":
        return colors.secondary;
      case "graduate":
        return colors.error;
      default:
        return colors.gray[500];
    }
  };

  const getSubjectColor = (subject) => {
    const subjectColors = {
      mathematics: colors.primary,
      physics: colors.secondary,
      chemistry: colors.success,
      biology: colors.warning,
      "computer science": colors.error,
      other: colors.gray[500],
    };

    return subjectColors[subject?.toLowerCase()] || colors.gray[500];
  };

  const tags = problem.tags
    ? problem.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="forum-problem-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open problem: ${problem.title || "Untitled problem"}`}
      style={{ "--forum-primary": colors.primary }}
    >
      <h3 className="forum-problem-card__title">
        <MathRenderer text={problem.title} />
      </h3>

      {problem.description && (
        <div className="forum-problem-card__description">
          <MathRenderer text={problem.description} />
        </div>
      )}

      <div className="forum-problem-card__badges">
        {problem.subject && (
          <span
            className="forum-problem-card__badge"
            style={{
              backgroundColor: `${getSubjectColor(problem.subject)}18`,
              color: getSubjectColor(problem.subject),
            }}
          >
            {problem.subject}
          </span>
        )}

        {problem.level && problem.level !== "Any Level" && (
          <span
            className="forum-problem-card__badge"
            style={{
              backgroundColor: `${getDifficultyColor(problem.level)}18`,
              color: getDifficultyColor(problem.level),
            }}
          >
            {problem.level}
          </span>
        )}

        {problem.year && (
          <span
            className="forum-problem-card__badge"
            style={{
              backgroundColor: colors.gray[100],
              color: colors.gray[600],
            }}
          >
            {problem.year}
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="forum-problem-card__tags">
          {tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className="forum-problem-card__tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="forum-problem-card__footer">
        <span>
          {author?.username
            ? `Shared by ${author.username}`
            : "View full problem"}
        </span>
        {problem.created_at && (
          <span>{new Date(problem.created_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
};

export default ForumProblemCard;
