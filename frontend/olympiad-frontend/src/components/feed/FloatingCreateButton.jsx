import React from "react";
import { Link } from "react-router-dom";

function FloatingCreateButton() {
  return (
    <Link to="/create-problem?from=/feed" className="fab-link">
      <div className="create-fab" title="Create New Problem">
        <span className="fab-plus">+</span>
        <span className="fab-text">Create Problem</span>
      </div>
    </Link>
  );
}

export default FloatingCreateButton;
