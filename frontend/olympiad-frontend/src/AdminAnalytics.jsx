import {useLanguage} from "./context/LanguageContext";
import {PublishingHeader} from "./components/PublishingWorkspace";
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminLayout.css";
import { AdminFinance } from "./AdminPhase1";
import GA4Dashboard from "./GA4Dashboard";

const AdminAnalytics = () => {
  const {lang} = useLanguage();
  const tr = (en,sq) => lang === "en" ? en : sq;
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("7d");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);setError(null);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/analytics?range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setAnalytics(response.data);
    } catch (err) {
      setError(tr("Failed to load analytics data","Të dhënat analitike nuk u ngarkuan"));
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeLabel = (range) => {
    const labels = {
      "1d": "Last 24 Hours",
      "7d": "Last 7 Days",
      "30d": "Last 30 Days",
      "90d": "Last 90 Days",
      "1y": "Last Year",
    };
    return labels[range] || range;
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
        <button className="admin-btn" onClick={fetchAnalytics}>{tr("Try Again","Provo përsëri")}</button>
      </div>
    );
  }

  return (
    <div className="publishing-workspace admin-analytics-page"><PublishingHeader eyebrow={tr("Administration / Activity","Administrimi / Aktiviteti")} title={tr("Platform activity","Aktiviteti i platformës")} description={tr("Compare community activity over time. These figures describe usage, not service availability.","Krahaso aktivitetin e komunitetit në kohë. Këto shifra tregojnë përdorimin, jo disponueshmërinë e shërbimit.")}/>
      {/* Time Range Selector */}
      <div className="admin-card">
        <div className="admin-card-header admin-card-header-wrap">
          <label htmlFor="analytics-period">{tr("Reporting period","Periudha e raportimit")}</label>
          <select id="analytics-period"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "2px solid #e9ecef",
            }}
          >
            <option value="1d">{tr("Last 24 Hours","24 orët e fundit")}</option>
            <option value="7d">{tr("Last 7 Days","7 ditët e fundit")}</option>
            <option value="30d">{tr("Last 30 Days","30 ditët e fundit")}</option>
            <option value="90d">{tr("Last 90 Days","90 ditët e fundit")}</option>
            <option value="1y">{tr("Last Year","Viti i fundit")}</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="publishing-metrics">
        <div className="publishing-metric">
          <h3>{tr("New Users","Përdorues të rinj")}</h3>
          <p className="stat-value">{analytics?.new_users || 0}</p>
          <p className="stat-change">{getTimeRangeLabel(timeRange)}</p>
        </div>

        <div className="publishing-metric">
          <h3>{tr("Active Users","Përdorues aktivë")}</h3>
          <p className="stat-value">{analytics?.active_users || 0}</p>
          <p className="stat-change">
            {analytics?.user_activity_rate || 0}% activity rate
          </p>
        </div>

        <div className="publishing-metric">
          <h3>{tr("New Forums","Forume të reja")}</h3>
          <p className="stat-value">{analytics?.new_forums || 0}</p>
          <p className="stat-change">{getTimeRangeLabel(timeRange)}</p>
        </div>

        <div className="publishing-metric">
          <h3>{tr("New Problems","Problema të reja")}</h3>
          <p className="stat-value">{analytics?.new_problems || 0}</p>
          <p className="stat-change">{getTimeRangeLabel(timeRange)}</p>
        </div>

        <div className="publishing-metric">
          <h3>{tr("Total Comments","Komente gjithsej")}</h3>
          <p className="stat-value">{analytics?.total_comments || 0}</p>
          <p className="stat-change">
            {analytics?.comments_per_day || 0} per day
          </p>
        </div>

        <div className="publishing-metric">
          <h3>{tr("Reports","Raportimet")}</h3>
          <p className="stat-value">{analytics?.total_reports || 0}</p>
          <p className="stat-change">
            {analytics?.resolved_reports || 0} resolved
          </p>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="admin-card">
        <div className="admin-card-header analytics-card-header">
          <h2 style={{ margin: 0 }}>{tr("Growth Trends","Trendet e rritjes")}</h2>
          <span
            style={{
              background: "#e3f2fd",
              color: "#1976d2",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            {getTimeRangeLabel(timeRange)}
          </span>
        </div>

        {/* Line Chart */}
        <div
          className="analytics-chart-shell"
          style={{
            height: "400px",
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            position: "relative",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 300"
            style={{ overflow: "visible" }}
          >
            {/* Grid Lines */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#f0f0f0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Y-axis labels */}
            <text x="20" y="30" fontSize="12" fill="#666">
              100
            </text>
            <text x="20" y="80" fontSize="12" fill="#666">
              75
            </text>
            <text x="20" y="130" fontSize="12" fill="#666">
              50
            </text>
            <text x="20" y="180" fontSize="12" fill="#666">
              25
            </text>
            <text x="20" y="230" fontSize="12" fill="#666">
              0
            </text>

            {/* X-axis labels */}
            <text x="150" y="290" fontSize="12" fill="#666" textAnchor="middle">
              Mon
            </text>
            <text x="250" y="290" fontSize="12" fill="#666" textAnchor="middle">
              Tue
            </text>
            <text x="350" y="290" fontSize="12" fill="#666" textAnchor="middle">
              Wed
            </text>
            <text x="450" y="290" fontSize="12" fill="#666" textAnchor="middle">
              Thu
            </text>
            <text x="550" y="290" fontSize="12" fill="#666" textAnchor="middle">
              Fri
            </text>
            <text x="650" y="290" fontSize="12" fill="#666" textAnchor="middle">
              Sat
            </text>
            <text x="750" y="290" fontSize="12" fill="#666" textAnchor="middle">
              Sun
            </text>

            {/* Generate sample data for the week */}
            {(() => {
              const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
              const newUsersData = [2, 3, 1, 4, 2, 1, 3];
              const activeUsersData = [8, 12, 6, 15, 10, 7, 9];
              const newForumsData = [1, 2, 0, 3, 1, 1, 2];
              const newProblemsData = [5, 8, 3, 12, 6, 4, 7];

              const maxValue = Math.max(
                ...newUsersData,
                ...activeUsersData,
                ...newForumsData,
                ...newProblemsData,
              );
              const scale = 200 / maxValue;

              const createPath = (data, color, offset = 0) => {
                let path = "";
                data.forEach((value, index) => {
                  const x = 150 + index * 100;
                  const y = 250 - value * scale + offset;
                  if (index === 0) {
                    path += `M ${x} ${y}`;
                  } else {
                    path += ` L ${x} ${y}`;
                  }
                });
                return path;
              };

              return (
                <>
                  {/* New Users Line */}
                  <path
                    d={createPath(newUsersData, "#28a745")}
                    fill="none"
                    stroke="#28a745"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* New Users Area */}
                  <path
                    d={`${createPath(newUsersData, "#28a745")} L 750 250 L 150 250 Z`}
                    fill="url(#newUsersGradient)"
                  />

                  {/* Active Users Line */}
                  <path
                    d={createPath(activeUsersData, "#007bff")}
                    fill="none"
                    stroke="#007bff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* New Forums Line */}
                  <path
                    d={createPath(newForumsData, "#fd7e14")}
                    fill="none"
                    stroke="#fd7e14"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* New Problems Line */}
                  <path
                    d={createPath(newProblemsData, "#6f42c1")}
                    fill="none"
                    stroke="#6f42c1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points */}
                  {newUsersData.map((value, index) => {
                    const x = 150 + index * 100;
                    const y = 250 - value * scale;
                    return (
                      <circle
                        key={`newUsers-${index}`}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#28a745"
                      />
                    );
                  })}
                  {activeUsersData.map((value, index) => {
                    const x = 150 + index * 100;
                    const y = 250 - value * scale;
                    return (
                      <circle
                        key={`activeUsers-${index}`}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#007bff"
                      />
                    );
                  })}
                  {newForumsData.map((value, index) => {
                    const x = 150 + index * 100;
                    const y = 250 - value * scale;
                    return (
                      <circle
                        key={`newForums-${index}`}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#fd7e14"
                      />
                    );
                  })}
                  {newProblemsData.map((value, index) => {
                    const x = 150 + index * 100;
                    const y = 250 - value * scale;
                    return (
                      <circle
                        key={`newProblems-${index}`}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#6f42c1"
                      />
                    );
                  })}
                </>
              );
            })()}

            {/* Gradients */}
            <defs>
              <linearGradient
                id="newUsersGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#28a745" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#28a745" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "white",
              padding: "12px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "3px",
                  background: "#28a745",
                  marginRight: "8px",
                }}
              ></div>
              <span>{tr("New Users","Përdorues të rinj")}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "3px",
                  background: "#007bff",
                  marginRight: "8px",
                }}
              ></div>
              <span>{tr("Active Users","Përdorues aktivë")}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "3px",
                  background: "#fd7e14",
                  marginRight: "8px",
                }}
              ></div>
              <span>{tr("New Forums","Forume të reja")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "12px",
                  height: "3px",
                  background: "#6f42c1",
                  marginRight: "8px",
                }}
              ></div>
              <span>{tr("New Problems","Problema të reja")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="admin-two-column-grid analytics-detail-grid">
        {/* Top Users */}
        <div className="admin-card">
          <h2>{tr("Most Active Users","Përdoruesit më aktivë")}</h2>
          {analytics?.top_users && analytics.top_users.length > 0 ? (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>{tr("User","Përdoruesi")}</th>
                    <th>{tr("Activity","Aktiviteti")}</th>
                    <th>{tr("Problems","Problemat")}</th>
                    <th>{tr("Comments","Komentet")}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_users.map((user, index) => (
                    <tr key={user.id}>
                      <td>
                        <div>
                          <strong>
                            #{index + 1} {user.username}
                          </strong>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            background: "#d4edda",
                            color: "#155724",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                          }}
                        >
                          {user.activity_score} points
                        </span>
                      </td>
                      <td>{user.problems_count}</td>
                      <td>{user.comments_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>{tr("No activity data","Nuk ka të dhëna aktiviteti")}</h3>
              <p>No user activity data available for this period.</p>
            </div>
          )}
        </div>

        {/* Popular Forums */}
        <div className="admin-card">
          <h2>{tr("Most Popular Forums","Forumet më të njohura")}</h2>
          {analytics?.popular_forums && analytics.popular_forums.length > 0 ? (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>{tr("Forum","Forumi")}</th>
                    <th>{tr("Members","Anëtarët")}</th>
                    <th>{tr("Activity","Aktiviteti")}</th>
                    <th>{tr("Created","Krijuar më")}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.popular_forums.map((forum, index) => (
                    <tr key={forum.id}>
                      <td>
                        <div>
                          <strong>
                            #{index + 1} {forum.name}
                          </strong>
                          <br />
                          <small>{forum.description}</small>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              background: "#d1ecf1",
                              color: "#0c5460",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "0.8rem",
                            }}
                          >
                            {forum.member_count} members
                          </span>
                          <span
                            style={{
                              background: "#e8f5e8",
                              color: "#2d5a2d",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "0.8rem",
                            }}
                          >
                            {forum.recent_activity || 0} recent posts
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            background:
                              forum.activity_level === "High"
                                ? "#d4edda"
                                : forum.activity_level === "Medium"
                                  ? "#fff3cd"
                                  : "#f8d7da",
                            color:
                              forum.activity_level === "High"
                                ? "#155724"
                                : forum.activity_level === "Medium"
                                  ? "#856404"
                                  : "#721c24",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                          }}
                        >
                          {forum.activity_level}
                        </span>
                      </td>
                      <td>
                        {forum.created_at
                          ? new Date(forum.created_at).toLocaleDateString(lang === "en" ? "en-GB" : "sq-AL")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>{tr("No forum data","Nuk ka të dhëna forumesh")}</h3>
              <p>No forum activity data available for this period.</p>
            </div>
          )}
        </div>
      </div>

      <GA4Dashboard />
      <AdminFinance />
      <section className="publishing-section"><h2>{tr("Monitoring information","Informacioni i monitorimit")}</h2><p>{tr("This page does not verify service availability or uptime.","Kjo faqe nuk verifikon disponueshmërinë ose kohën e funksionimit të shërbimit.")}</p><dl className="publishing-health"><div><dt>{tr("Database response time","Koha e përgjigjes së bazës së të dhënave")}</dt><dd>{analytics?.db_response_time!=null?analytics.db_response_time+" ms":tr("Not measured","Nuk është matur")}</dd></div><div><dt>{tr("Storage usage","Përdorimi i hapësirës")}</dt><dd>{analytics?.storage_usage||tr("Not measured","Nuk është matur")}</dd></div></dl></section>
    </div>
  );
};

export default AdminAnalytics;
