import React, { useEffect } from "react";
import { Pin, X } from "lucide-react";
import "./ForumsSidebar.css";
import {useDialogFocus} from "../hooks/useDialogFocus";

const getSubjectIcon = (subject) => {
  const subjectLower = subject?.toLowerCase() || "";

  if (subjectLower.includes("biology")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/Biology_subject_pcxmoa.svg";
  }

  if (subjectLower.includes("chemistry")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/chemistry_subject_r4n7jq.svg";
  }

  if (subjectLower.includes("mathematics") || subjectLower.includes("math")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/math_subject_iqigfx.svg";
  }

  if (subjectLower.includes("physics")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/physics_subject_m90gto.svg";
  }

  if (subjectLower.includes("computer")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/computer_engineerin_subject_u2m2ze.svg";
  }

  return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg";
};

function ForumsSidebar({
  open,
  onClose,
  forumsEnabled,
  loading,
  forums = [],
  pinnedForums = [],
  onForumClick,
  onTogglePin,
}) {
  const drawerRef = useDialogFocus(open,onClose);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const sortedForums = [
    ...forums.filter((forum) => pinnedForums.includes(forum.id)),
    ...forums.filter((forum) => !pinnedForums.includes(forum.id)),
  ];

  if (!open) return null;
  return (
    <>
      {open && (
        <button
          type="button"
          className="forums-drawer-backdrop" tabIndex={-1}
          onClick={onClose}
          aria-label="Close forums panel"
        />
      )}

      <aside
        className={`forums-drawer ${open ? "open" : ""}`}
        ref={drawerRef} role="dialog" aria-modal="true" aria-label="My forums" tabIndex={-1}
      >
        <div className="forums-drawer-header">
          <button
            type="button"
            className="forums-drawer-close"
            onClick={onClose}
            aria-label="Close my forums"
          >
            <X size={22} />
          </button>

          <h3>{forumsEnabled ? "My Forums" : "Forums Disabled"}</h3>
        </div>

        <div className="forums-drawer-body">
          {forumsEnabled && (
            <>
              {loading ? (
                <div className="forums-drawer-state">Loading forums...</div>
              ) : sortedForums.length === 0 ? (
                <div className="forums-drawer-state">
                  No forums found.
                  <br />
                  Join or create a forum to see it here.
                </div>
              ) : (
                <div className="forums-drawer-list">
                  {sortedForums.map((forum) => {
                    const isPinned = pinnedForums.includes(forum.id);

                    return (
                      <div className="forums-drawer-item" key={forum.id}>
                        <button
                          type="button"
                          className="forums-drawer-main"
                          onClick={() => onForumClick(forum.id)}
                        >
                          <img
                            src={getSubjectIcon(forum.subject)}
                            alt=""
                            aria-hidden="true"
                            className="forums-drawer-icon"
                          />

                          <span className="forums-drawer-copy">
                            <strong>{forum.title}</strong>

                            {forum.description && (
                              <span className="forums-drawer-description">
                                {forum.description.length > 80
                                  ? `${forum.description.substring(0, 80)}...`
                                  : forum.description}
                              </span>
                            )}

                            {forum.subject && (
                              <span className="forums-drawer-badge">
                                {forum.subject}
                              </span>
                            )}
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`forums-drawer-pin ${
                            isPinned ? "pinned" : ""
                          }`}
                          onClick={() => onTogglePin(forum.id)}
                          aria-label={
                            isPinned
                              ? `Unpin ${forum.title}`
                              : `Pin ${forum.title}`
                          }
                        >
                          <Pin size={16} fill="currentColor" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

export default ForumsSidebar;
