import {useLanguage} from "./context/LanguageContext";
import {PublishingHeader} from "./components/PublishingWorkspace";
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import axios from "axios";
import ReportDetailsModal from "./ReportDetailsModal";
import { useToast } from "./components/ToastProvider";
import "./AdminLayout.css";

const AdminReports = () => {
  const {lang}=useLanguage();
  const tr=(en,sq)=>lang==='sq'?sq:en;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: "",
    page: 1,
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchReports();
    fetchCurrentUser();
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCurrentUser(response.data);
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (filters.status) params.append("status", filters.status);
      params.append("page", filters.page);
      params.append("limit", 20);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/reports?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setReports(response.data.reports);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(tr("Failed to load reports","Raportimet nuk u ngarkuan"));
      console.error("Reports error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleResolveReport = async (reportId, resolution) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/reports/${reportId}/resolve`,
        { resolution },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Refresh the reports list
      fetchReports();
      showToast("Report resolved successfully", "success");
    } catch (err) {
      console.error("Resolve report error:", err);
      showToast(
        `Failed to resolve report: ${err.response?.data?.detail || err.message}`,
        "error",
      );
    }
  };

  const handleDismissReport = async (reportId, reason) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/reports/${reportId}/dismiss`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Refresh the reports list
      fetchReports();
      showToast("Report dismissed successfully", "success");
    } catch (err) {
      console.error("Dismiss report error:", err);
      showToast(
        `Failed to dismiss report: ${err.response?.data?.detail || err.message}`,
        "error",
      );
    }
  };

  const handleViewReport = (reportId) => {
    setSelectedReportId(reportId);
    setShowReportModal(true);
  };

  const handleReportUpdate = () => {
    fetchReports();
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: "pending",
      reviewed: "active",
      resolved: "resolved",
      dismissed: "inactive",
    };

    return (
      <span className={`status-badge ${statusColors[status] || "inactive"}`}>
        {status}
      </span>
    );
  };

  const getReportTypeIcon = (type) => {
    const icons = {
      user: "👤",
      forum: "",
      problem: "",
      comment: "💭",
      message: "",
    };
    return icons[type] || "📄";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <h2>{tr("Error","Gabim")}</h2>
        <p>{error}</p>
        <button className="admin-btn" onClick={fetchReports}>
          {tr("Try Again","Provo përsëri")}
        </button>
      </div>
    );
  }

  return (
    <div className="publishing-workspace admin-reports-page"><PublishingHeader eyebrow={tr("Community / Moderation","Komuniteti / Moderimi")} title={tr("Content reports","Raportimet e përmbajtjes")} description={tr("Review reports in context, assign responsibility and record moderation decisions.","Shqyrto raportimet në kontekst, cakto përgjegjësinë dhe regjistro vendimet e moderimit.")}/><div className="publishing-settings-columns"><aside className="publishing-section"><h2>{tr("Review queue","Radha e shqyrtimit")}</h2>
        <div className="admin-filter-row">
          <div>
            <label htmlFor="report-status">{tr("Status","Statusi")}</label>
            <select id="report-status"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">{tr("All Reports","Të gjitha raportimet")}</option>
              <option value="pending">{tr("Pending","Në pritje")}</option>
              <option value="under_review">{tr("Under Review","Në shqyrtim")}</option>
              <option value="resolved">{tr("Resolved","Zgjidhur")}</option>
              <option value="dismissed">{tr("Dismissed","Hedhur poshtë")}</option>
            </select>
          </div>
        </div>
      </aside>
      <div className="publishing-section">
        <div className="publishing-table">
          <table>
            <thead>
              <tr>
                <th>{tr("Report","Raportimi")}</th>
                <th>{tr("Reporter","Raportuesi")}</th>
                <th>{tr("Type","Lloji")}</th>
                <th>{tr("Reason","Arsyeja")}</th>
                <th>{tr("Status","Statusi")}</th>
                <th>{tr("Date","Data")}</th>
                <th>{tr("Actions","Veprimet")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div>
                      <strong>
                        {getReportTypeIcon(report.report_type)}{" "}
                        {report.report_type}
                      </strong>
                      <br />
                      <small>{tr("Target ID:","ID e objektit:")} {report.target_id}</small>
                      {report.description && (
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#6c757d",
                            marginTop: "4px",
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {report.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{report.reporter}</strong>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        background: "#e9ecef",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {report.report_type}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        background: "#f8d7da",
                        color: "#721c24",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {report.reason}
                    </span>
                  </td>
                  <td>{getStatusBadge(report.status)}</td>
                  <td>{formatDate(report.created_at)}</td>
                  <td>
                    <div
                      className="admin-table-actions"
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="admin-btn primary"
                        onClick={() => handleViewReport(report.id)}
                        style={{
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        {tr("View Details","Shiko detajet")}
                      </button>

                      {report.assigned_to && (
                        <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                          Assigned to {report.assigned_to}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {reports.length === 0 && (
          <div className="empty-state">
            <h3>{tr("No reports found","Nuk u gjet asnjë raportim")}</h3>
            <p>{tr("No reports match your current filters.","Nuk ka raportime që përputhen me filtrat.")}</p>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div
            className="admin-pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              className="admin-btn secondary"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
            >
              {tr("Previous","Mëparshmja")}
            </button>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 15px",
                color: "#495057",
              }}
            >
              Page {filters.page} of {pagination.pages}
            </span>

            <button
              className="admin-btn secondary"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= pagination.pages}
            >
              {tr("Next","Tjetra")}
            </button>
          </div>
        )}

        {/* Report Details Modal */}
        {showReportModal && (
          <ReportDetailsModal
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setSelectedReportId(null);
            }}
            reportId={selectedReportId}
            currentUser={currentUser}
            onReportUpdate={handleReportUpdate}
          />
        )}
      </div>
      </div>
    </div>
  );
};

export default AdminReports;
