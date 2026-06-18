import React from "react";
import Button from "../Button";

function PaginationControls({
  currentPage,
  totalPages,
  totalProblems,
  refreshing,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-shell">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || refreshing}
        variant={currentPage === 1 || refreshing ? "ghost" : "primary"}
        size="md"
      >
        ← Previous
      </Button>

      <span className="pagination-text">
        Page {currentPage} of {totalPages} · {totalProblems} total
      </span>

      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || refreshing}
        variant={currentPage === totalPages || refreshing ? "ghost" : "primary"}
        size="md"
      >
        Next →
      </Button>
    </div>
  );
}

export default PaginationControls;
