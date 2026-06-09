/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function SearchBar({
  placeholder = "Search...",
  showAdvanced = true,
  initialQuery = "",
  searchMode = "all", // "all", "forums", "subject"
  lockedSubject = null, // For subject-locked searches
  onLocalSearch = null, // Callback for local filtering
  onAdvancedSearch = null, // Callback for advanced local filtering
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    if (onLocalSearch) {
      onLocalSearch(searchQuery.trim());
      return;
    }

    const query = encodeURIComponent(searchQuery.trim());

    if (searchMode === "forums") {
      navigate(`/search?q=${query}&category=forums`);
    } else if (searchMode === "subject") {
      navigate(
        `/search?q=${query}&category=problems&subjects=${encodeURIComponent(
          lockedSubject,
        )}`,
      );
    } else {
      navigate(`/search?q=${query}&category=all`);
    }
  };

  const openAdvancedSearch = () => {
    setShowAdvancedModal(true);
  };

  const closeAdvancedSearch = () => {
    setShowAdvancedModal(false);
  };

  const clearSearch = () => {
    setSearchQuery("");

    if (onLocalSearch) {
      onLocalSearch("");
    }
  };

  const handleAdvancedSearch = (advancedData) => {
    const params = new URLSearchParams();

    if (advancedData.query) params.append("q", advancedData.query);
    if (advancedData.category) params.append("category", advancedData.category);

    if (advancedData.subjects && advancedData.subjects.length > 0) {
      params.append("subjects", advancedData.subjects.join(","));
    }

    if (advancedData.level) params.append("level", advancedData.level);
    if (advancedData.year) params.append("year", advancedData.year);
    if (advancedData.tags) params.append("tags", advancedData.tags);

    navigate(`/search?${params.toString()}`);
    closeAdvancedSearch();
  };

  return (
    <>
      <style>
        {`
          .searchbar-root {
            position: relative;
            width: 100%;
          }

          .searchbar-form {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
          }

          .searchbar-input-wrap {
            position: relative;
            flex: 1;
            min-width: 0;
          }

          .searchbar-icon {
            position: absolute;
            left: 17px;
            top: 50%;
            transform: translateY(-50%);
            width: 17px;
            height: 17px;
            opacity: 0.55;
            pointer-events: none;
          }

          .searchbar-input {
            width: 100%;
            min-height: 48px;
            padding: 13px 44px 13px 46px;
            border: 1px solid #dbe3ea;
            border-radius: 999px;
            font-size: 15px;
            outline: none;
            background: #ffffff;
            color: #0f172a;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            box-sizing: border-box;
          }

          .searchbar-input::placeholder {
            color: #94a3b8;
          }

          .searchbar-input:focus {
            border-color: rgba(26, 77, 58, 0.45);
            box-shadow: 0 0 0 4px rgba(26, 77, 58, 0.10), 0 12px 28px rgba(15, 23, 42, 0.06);
          }

          .searchbar-clear {
            position: absolute;
            right: 13px;
            top: 50%;
            transform: translateY(-50%);
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 999px;
            background: #f1f5f9;
            color: #64748b;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            transition: all 0.2s ease;
          }

          .searchbar-clear:hover {
            background: #e2e8f0;
            color: #1a4d3a;
          }

          .searchbar-button {
            height: 48px;
            padding: 0 22px;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 900;
            white-space: nowrap;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          }

          .searchbar-button:hover {
            transform: translateY(-1px);
          }

          .searchbar-submit {
            background: #1a4d3a;
            color: #ffffff;
            box-shadow: 0 12px 24px rgba(26, 77, 58, 0.20);
          }

          .searchbar-submit:hover {
            background: #163f31;
            box-shadow: 0 16px 30px rgba(26, 77, 58, 0.26);
          }

          .searchbar-advanced {
            background: #f8fafc;
            color: #1a4d3a;
            border: 1px solid rgba(26, 77, 58, 0.18);
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
          }

          .searchbar-advanced:hover {
            background: rgba(26, 77, 58, 0.07);
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
          }

          .searchbar-button-icon {
            height: 16px;
            width: 16px;
            object-fit: contain;
          }

          .advanced-search-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: rgba(15, 23, 42, 0.46);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .advanced-search-modal {
            width: min(720px, 100%);
            max-height: 88vh;
            overflow: hidden;
            background: #ffffff;
            border-radius: 28px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: 0 35px 90px rgba(15, 23, 42, 0.28);
            display: flex;
            flex-direction: column;
            animation: advancedModalIn 0.22s ease;
          }

          @keyframes advancedModalIn {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .advanced-search-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
            padding: 26px 28px 18px;
            border-bottom: 1px solid #f1f5f9;
            background:
              radial-gradient(circle at top right, rgba(26,77,58,0.10), transparent 34%),
              #ffffff;
          }

          .advanced-search-kicker {
            width: fit-content;
            margin-bottom: 8px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(26, 77, 58, 0.08);
            border: 1px solid rgba(26, 77, 58, 0.12);
            color: #1a4d3a;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .advanced-search-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.03em;
          }

          .advanced-search-header p {
            margin: 6px 0 0;
            color: #64748b;
            font-size: 14px;
            line-height: 1.5;
            font-weight: 500;
          }

          .advanced-search-close {
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 14px;
            background: #f8fafc;
            color: #64748b;
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;
          }

          .advanced-search-close:hover {
            background: #1a4d3a;
            color: white;
            transform: rotate(90deg);
          }

          .advanced-search-body {
            padding: 24px 28px;
            overflow-y: auto;
          }

          .advanced-form {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .advanced-field label,
          .advanced-label {
            display: block;
            margin-bottom: 8px;
            color: #0f172a;
            font-weight: 900;
            font-size: 14px;
          }

          .advanced-input {
            width: 100%;
            min-height: 44px;
            border: 1px solid #dbe3ea;
            border-radius: 14px;
            padding: 11px 13px;
            outline: none;
            color: #0f172a;
            background: #ffffff;
            font-size: 14px;
            transition: all 0.2s ease;
            box-sizing: border-box;
          }

          .advanced-input:focus {
            border-color: rgba(26,77,58,0.45);
            box-shadow: 0 0 0 4px rgba(26,77,58,0.10);
          }

          .advanced-info {
            padding: 13px 14px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 13px;
            line-height: 1.55;
          }

          .advanced-info strong {
            color: #1a4d3a;
          }

          .advanced-locked {
            display: block;
            margin-top: 5px;
            color: #1a4d3a;
            font-weight: 900;
          }

          .advanced-subject-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 12px;
            border: 1px solid #dbe3ea;
            border-radius: 18px;
            background: #f8fafc;
          }

          .advanced-subject-grid.locked {
            background: #f1f5f9;
            opacity: 0.82;
          }

          .advanced-subject-option {
            display: flex;
            align-items: center;
            gap: 9px;
            min-height: 42px;
            padding: 9px 10px;
            border-radius: 14px;
            cursor: pointer;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            color: #0f172a;
            font-size: 14px;
            font-weight: 800;
            transition: all 0.2s ease;
            user-select: none;
          }

          .advanced-subject-option:hover {
            border-color: rgba(26, 77, 58, 0.25);
            background: rgba(26, 77, 58, 0.04);
          }

          .advanced-subject-option.selected {
            border-color: rgba(26, 77, 58, 0.38);
            background: rgba(26, 77, 58, 0.08);
            color: #1a4d3a;
          }

          .advanced-subject-option.disabled {
            cursor: not-allowed;
          }

          .advanced-subject-option input {
            accent-color: #1a4d3a;
          }

          .advanced-search-footer {
            padding: 18px 28px 24px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            border-top: 1px solid #f1f5f9;
            background: #f8fafc;
          }

          .advanced-secondary-btn,
          .advanced-primary-btn {
            border: none;
            border-radius: 999px;
            padding: 12px 18px;
            cursor: pointer;
            font-weight: 900;
            transition: all 0.2s ease;
          }

          .advanced-secondary-btn {
            background: #ffffff;
            color: #475569;
            border: 1px solid #e2e8f0;
          }

          .advanced-secondary-btn:hover {
            background: #f1f5f9;
          }

          .advanced-primary-btn {
            background: #1a4d3a;
            color: white;
            box-shadow: 0 12px 26px rgba(26,77,58,0.22);
          }

          .advanced-primary-btn:hover {
            background: #163f31;
            transform: translateY(-1px);
            box-shadow: 0 16px 32px rgba(26,77,58,0.28);
          }

          @media (max-width: 768px) {
            .searchbar-form {
              gap: 8px;
              flex-wrap: wrap;
            }

            .searchbar-input-wrap {
              width: 100%;
              flex-basis: 100%;
            }

            .searchbar-button {
              flex: 1;
              height: 44px;
              padding: 0 14px;
              font-size: 13px;
            }

            .advanced-search-overlay {
              align-items: flex-end;
              padding: 12px;
            }

            .advanced-search-modal {
              max-height: 92vh;
              border-radius: 24px;
            }

            .advanced-search-header,
            .advanced-search-body,
            .advanced-search-footer {
              padding-left: 18px;
              padding-right: 18px;
            }

            .advanced-search-header h2 {
              font-size: 23px;
            }

            .advanced-subject-grid {
              grid-template-columns: 1fr;
            }

            .advanced-search-footer {
              flex-direction: column-reverse;
            }

            .advanced-secondary-btn,
            .advanced-primary-btn {
              width: 100%;
            }
          }
        `}
      </style>

      <div className="searchbar-root">
        <form onSubmit={handleSearch} className="searchbar-form">
          <div className="searchbar-input-wrap">
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg"
              alt=""
              className="searchbar-icon"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="searchbar-input"
            />

            {searchQuery && (
              <button
                type="button"
                className="searchbar-clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <button type="submit" className="searchbar-button searchbar-submit">
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795126/Search_Icon_White_wj1ka1.svg"
              alt=""
              className="searchbar-button-icon"
            />
            Search
          </button>

          {showAdvanced && (
            <button
              type="button"
              onClick={openAdvancedSearch}
              className="searchbar-button searchbar-advanced"
            >
              Advanced
            </button>
          )}
        </form>

        {showAdvancedModal && (
          <AdvancedSearchModal
            onClose={closeAdvancedSearch}
            onSearch={onAdvancedSearch || handleAdvancedSearch}
            initialData={{
              query: searchQuery,
              category: searchMode === "forums" ? "forums" : "problems",
            }}
            searchMode={searchMode}
            lockedSubject={lockedSubject}
          />
        )}
      </div>
    </>
  );
}

// Advanced Search Modal Component
function AdvancedSearchModal({
  onClose,
  onSearch,
  initialData = {},
  searchMode = "all",
  lockedSubject = null,
}) {
  const [formData, setFormData] = useState({
    query: initialData.query || "",
    category: searchMode === "forums" ? "forums" : "problems",
    subjects: lockedSubject ? [lockedSubject] : [],
    level: "",
    year: "",
    tags: "",
  });

  const subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Computer Science",
    "Other",
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubjectChange = (subject) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleClear = () => {
    setFormData({
      query: "",
      category: searchMode === "forums" ? "forums" : "problems",
      subjects: lockedSubject ? [lockedSubject] : [],
      level: "",
      year: "",
      tags: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(formData);
  };

  return (
    <div
      className="advanced-search-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="advanced-search-modal">
        <div className="advanced-search-header">
          <div>
            <div className="advanced-search-kicker">Advanced Filters</div>
            <h2>Advanced Search</h2>
            <p>
              Filter {searchMode === "forums" ? "forums" : "problems"} by
              subject, level, year, tags, or keywords.
            </p>
          </div>

          <button
            type="button"
            className="advanced-search-close"
            onClick={onClose}
            aria-label="Close advanced search"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="advanced-form">
          <div className="advanced-search-body">
            <div className="advanced-form">
              <div className="advanced-field">
                <label>Search Query</label>
                <input
                  type="text"
                  name="query"
                  value={formData.query}
                  onChange={handleChange}
                  placeholder="Enter keywords to search for..."
                  className="advanced-input"
                />
              </div>

              <div className="advanced-info">
                <strong>Advanced Search</strong> gives you more precise results
                by combining filters.
                {lockedSubject && (
                  <span className="advanced-locked">
                    Subject locked to: {lockedSubject}
                  </span>
                )}
              </div>

              <div className="advanced-field">
                <div className="advanced-label">
                  Subjects {lockedSubject ? "(Locked)" : "(Optional)"}
                </div>

                <div
                  className={`advanced-subject-grid ${
                    lockedSubject ? "locked" : ""
                  }`}
                >
                  {subjects.map((subject) => {
                    const isSelected = formData.subjects.includes(subject);
                    const isLockedSelected =
                      lockedSubject && subject === lockedSubject;

                    return (
                      <label
                        key={subject}
                        className={`advanced-subject-option ${
                          isSelected ? "selected" : ""
                        } ${lockedSubject ? "disabled" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            !lockedSubject && handleSubjectChange(subject)
                          }
                          disabled={lockedSubject}
                        />
                        <span>
                          {subject}
                          {isLockedSelected ? " 🔒" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="advanced-field">
                <label>Level</label>
                <input
                  type="text"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  placeholder="e.g., IMO, EGMO Phase 2, Advanced..."
                  className="advanced-input"
                />
              </div>

              {searchMode !== "forums" && (
                <div className="advanced-field">
                  <label>Year</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    placeholder="e.g., 2024"
                    min="1900"
                    max="2030"
                    className="advanced-input"
                  />
                </div>
              )}

              <div className="advanced-field">
                <label>Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g., algebra, geometry, combinatorics"
                  className="advanced-input"
                />
              </div>
            </div>
          </div>

          <div className="advanced-search-footer">
            <button
              type="button"
              className="advanced-secondary-btn"
              onClick={handleClear}
            >
              Clear
            </button>

            <button
              type="button"
              className="advanced-secondary-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="advanced-primary-btn">
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SearchBar;
