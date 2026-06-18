import React from "react";
import { Link } from "react-router-dom";

function EmptyState({ emptyState }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">Σ</div>

      <h3>{emptyState.title}</h3>

      <p>{emptyState.description}</p>

      {emptyState.buttonText && (
        <Link to="/create-problem?from=/feed">
          <button className="empty-create-button">
            {emptyState.buttonText}
          </button>
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
