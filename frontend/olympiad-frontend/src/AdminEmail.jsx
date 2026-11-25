import {useLanguage} from "./context/LanguageContext";
import {PublishingHeader} from "./components/PublishingWorkspace";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./components/ToastProvider";
import { useConfirm } from "./components/ConfirmProvider";
import "./AdminLayout.css";
import {AdminTemplates} from "./AdminExperience";

const AdminEmail = () => {
  const {lang} = useLanguage();
  const tr = (en,sq) => lang === 'en' ? en : sq;
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [newCampaign, setNewCampaign] = useState({
    subject: "",
    content: "",
    target_audience: "all",
    target_user_ids: [],
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/email/campaigns`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCampaigns(response.data);
    } catch (err) {
      setError(tr("Failed to load email campaigns","Fushatat e email-it nuk u ngarkuan"));
      console.error("Email campaigns error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/email/campaigns`,
        newCampaign,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setNewCampaign({
        subject: "",
        content: "",
        target_audience: "all",
        target_user_ids: [],
      });
      setShowCreateForm(false);
      fetchCampaigns();
    } catch (err) {
      console.error("Create campaign error:", err);
      showToast(tr("Failed to create email campaign","Fushata e email-it nuk u krijua"), "error");
    }
  };

  const getStatusBadge = (status) => {
    const getStatusStyle = (status) => {
      switch (status) {
        case "draft":
          return {
            background: "#fff3cd",
            color: "#856404",
            border: "1px solid #ffeaa7",
          };
        case "sent":
          return {
            background: "#d1ecf1",
            color: "#0c5460",
            border: "1px solid #bee5eb",
          };
        case "scheduled":
          return {
            background: "#d4edda",
            color: "#155724",
            border: "1px solid #c3e6cb",
          };
        case "failed":
          return {
            background: "#f8d7da",
            color: "#721c24",
            border: "1px solid #f5c6cb",
          };
        default:
          return {
            background: "#e2e3e5",
            color: "#383d41",
            border: "1px solid #d6d8db",
          };
      }
    };

    const style = getStatusStyle(status);

    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "0.8rem",
          fontWeight: "500",
          ...style,
        }}
      >
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return tr("Not sent","Nuk është dërguar");
    return new Date(dateString).toLocaleDateString(lang === "en" ? "en-GB" : "sq-AL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendCampaign = async (campaignId) => {
    const confirmed = await confirm({
      title: tr("Send email campaign?","Dërgo fushatën e email-it?"),
      message:
        tr("This will send the campaign to the selected users. This action cannot be undone.","Fushata do t'u dërgohet përdoruesve të zgjedhur. Ky veprim nuk mund të zhbëhet."),
      confirmText: tr("Send campaign","Dërgo fushatën"),
      cancelText: tr("Cancel","Anulo"),
      variant: "success",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/email/campaigns/${campaignId}/send`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast(
        tr(`Campaign sent successfully! ${response.data.message}`, `Fushata u dërgua me sukses! ${response.data.message}`),
        "success",
      );
      fetchCampaigns(); // Refresh the campaigns list
    } catch (err) {
      console.error("Send campaign error:", err);
      showToast(
        tr(`Failed to send campaign: ${err.response?.data?.detail || err.message}`, `Dërgimi i fushatës dështoi: ${err.response?.data?.detail || err.message}`),
        "error",
      );
    }
  };

  const handleViewCampaign = async (campaignId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/email/campaigns/${campaignId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setSelectedCampaign(response.data);
      setShowViewModal(true);
    } catch (err) {
      console.error("View campaign error:", err);
      showToast(
        tr(`Failed to load campaign details: ${err.response?.data?.detail || err.message}`, `Detajet e fushatës nuk u ngarkuan: ${err.response?.data?.detail || err.message}`),
        "error",
      );
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    const confirmed = await confirm({
      title: tr("Delete email campaign?","Fshi fushatën e email-it?"),
      message:
        tr("This will delete the campaign and all associated data. This action cannot be undone.","Fushata dhe të dhënat e lidhura do të fshihen. Ky veprim nuk mund të zhbëhet."),
      confirmText: tr("Delete campaign","Fshi fushatën"),
      cancelText: tr("Cancel","Anulo"),
      variant: "success",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/email/campaigns/${campaignId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast(tr("Campaign deleted successfully","Fushata u fshi me sukses"), "success");
      fetchCampaigns(); // Refresh the campaigns list
    } catch (err) {
      console.error("Delete campaign error:", err);
      showToast(
        tr(`Failed to delete campaign: ${err.response?.data?.detail || err.message}`, `Fshirja e fushatës dështoi: ${err.response?.data?.detail || err.message}`),
        "error",
      );
    }
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
        <h2>{tr(tr("Error","Gabim"),"Gabim")}</h2>
        <p>{error}</p>
        <button className="admin-btn" onClick={fetchCampaigns}>{tr(tr("Try Again","Provo përsëri"),"Provo përsëri")}</button>
      </div>
    );
  }

  return (
    <div className="publishing-workspace admin-email-page"><PublishingHeader eyebrow={tr(tr("Website / Communication","Faqja / Komunikimi"),"Faqja / Komunikimi")} title={tr(tr("Email campaigns","Fushatat e email-it"),"Fushatat e email-it")} description={tr(tr("Prepare campaigns, review recipients and inspect delivery history. Sending an email is a separate action.","Përgatit fushatat, kontrollo marrësit dhe historikun e dërgesave. Dërgimi i email-it është veprim më vete."),"Përgatit fushatat, kontrollo marrësit dhe historikun e dërgesave. Dërgimi i email-it është veprim më vete.")}/><details className="publishing-maintenance"><summary>{tr(tr("Notification templates","Modelet e njoftimeve"),"Modelet e njoftimeve")}</summary><AdminTemplates/></details>
      {/* Header */}
      <div className="admin-card">
        <div className="admin-card-header admin-card-header-wrap">
          <h2>{tr(tr("Campaign history","Historiku i fushatave"),"Historiku i fushatave")}</h2>
          <button className="admin-btn" onClick={() => setShowCreateForm(true)}>{tr(tr("Create Campaign","Krijo fushatë"),"Krijo fushatë")}</button>
        </div>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <div className="publishing-section publishing-composer">
          <header><h3>{tr(tr("Create a campaign","Krijo një fushatë"),"Krijo një fushatë")}</h3><p>{tr(tr("Compose the message and select its audience. Review the campaign before sending.","Përgatit mesazhin dhe zgjidh marrësit. Kontrollo fushatën para dërgimit."),"Përgatit mesazhin dhe zgjidh marrësit. Kontrollo fushatën para dërgimit.")}</p></header>
          <form onSubmit={handleCreateCampaign} className="admin-form">
            <div className="form-group">
              <label htmlFor="campaign-subject">{tr(tr("Subject","Subjekti"),"Subjekti")}</label>
              <input
                id="campaign-subject" type="text"
                value={newCampaign.subject}
                onChange={(e) =>
                  setNewCampaign((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder={tr(tr("Email subject...","Subjekti i email-it..."),"Subjekti i email-it...")}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="campaign-content">{tr(tr("Content","Përmbajtja"),"Përmbajtja")}</label>
              <textarea id="campaign-content"
                value={newCampaign.content}
                onChange={(e) =>
                  setNewCampaign((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder={tr(tr("Email content...","Përmbajtja e email-it..."),"Përmbajtja e email-it...")}
                rows={8}
                required
              />
            </div>

            <div className="form-group">
              <label>{tr(tr("Target Audience","Marrësit"),"Marrësit")}</label>
              <select
                value={newCampaign.target_audience}
                onChange={(e) =>
                  setNewCampaign((prev) => ({
                    ...prev,
                    target_audience: e.target.value,
                  }))
                }
              >
                <option value="all">{tr(tr("All Users","Të gjithë përdoruesit"),"Të gjithë përdoruesit")}</option>
                <option value="marketing_opt_in">{tr(tr("Marketing Opt-in Users","Përdoruesit që pranojnë marketingun"),"Përdoruesit që pranojnë marketingun")}</option>
                <option value="admins">{tr(tr("Admins Only","Vetëm administratorët"),"Vetëm administratorët")}</option>
                <option value="moderators">{tr(tr("Moderators Only","Vetëm moderatorët"),"Vetëm moderatorët")}</option>
                <option value="users">{tr(tr("Regular Users Only","Vetëm përdoruesit e zakonshëm"),"Vetëm përdoruesit e zakonshëm")}</option>
                <option value="specific">{tr(tr("Specific Users","Përdorues të caktuar"),"Përdorues të caktuar")}</option>
              </select>
            </div>

            {newCampaign.target_audience === "specific" && (
              <div className="form-group">
                <label>{tr(tr("User IDs (comma-separated)","ID-të e përdoruesve (ndarë me presje)"),"ID-të e përdoruesve (ndarë me presje)")}</label>
                <input
                  type="text"
                  value={newCampaign.target_user_ids.join(", ")}
                  onChange={(e) =>
                    setNewCampaign((prev) => ({
                      ...prev,
                      target_user_ids: e.target.value
                        .split(",")
                        .map((id) => parseInt(id.trim()))
                        .filter((id) => !isNaN(id)),
                    }))
                  }
                  placeholder="1, 2, 3, 4..."
                />
              </div>
            )}

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn">{tr(tr("Create Campaign","Krijo fushatë"),"Krijo fushatë")}</button>
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setShowCreateForm(false)}
              >{tr(tr("Cancel","Anulo"),"Anulo")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns List */}
      <div className="admin-card">
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>{tr(tr("Subject","Subjekti"),"Subjekti")}</th>
                <th>{tr(tr("Target","Grupi i synuar"),"Grupi i synuar")}</th>
                <th>{tr(tr("Status","Statusi"),"Statusi")}</th>
                <th>{tr(tr("Recipients","Marrësit"),"Marrësit")}</th>
                <th>{tr(tr("Created By","Krijuar nga"),"Krijuar nga")}</th>
                <th>{tr(tr("Created","Krijuar më"),"Krijuar më")}</th>
                <th>{tr(tr("Sent","Dërguar"),"Dërguar")}</th>
                <th>{tr(tr("Actions","Veprimet"),"Veprimet")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <div>
                      <strong>{campaign.subject}</strong>
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
                      {campaign.target_audience}
                    </span>
                  </td>
                  <td>{getStatusBadge(campaign.status)}</td>
                  <td>
                    <span
                      style={{
                        background: "#d1ecf1",
                        color: "#0c5460",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                      }}
                    >
                      {campaign.recipient_count} users
                    </span>
                  </td>
                  <td>{campaign.created_by}</td>
                  <td>{formatDate(campaign.created_at)}</td>
                  <td>{formatDate(campaign.sent_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      {campaign.status === "draft" && (
                        <button
                          className="admin-btn"
                          onClick={() => handleSendCampaign(campaign.id)}
                          style={{
                            background:
                              "linear-gradient(135deg, #10b981, #059669)",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: "500",
                          }}
                        >{tr(tr("Send","Dërgo"),"Dërgo")}</button>
                      )}
                      <button
                        className="admin-btn secondary"
                        onClick={() => handleViewCampaign(campaign.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                        }}
                      >{tr(tr("View","Shiko"),"Shiko")}</button>
                      {campaign.status === "draft" && (
                        <button
                          className="admin-btn danger"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                          }}
                        >
                          <img
                            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811026/Delete_Icon_White_pjg21g.svg"
                            alt={tr(tr("Delete","Fshi"),"Fshi")}
                            style={{
                              width: "14px",
                              height: "14px",
                              objectFit: "contain",
                              marginRight: "6px",
                            }}
                          />{tr(tr("Delete","Fshi"),"Fshi")}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {campaigns.length === 0 && (
          <div className="empty-state">
            <h3>{tr(tr("No email campaigns","Nuk ka fushata email-i"),"Nuk ka fushata email-i")}</h3>
            <p>{tr(tr("No email campaigns have been created yet.","Nuk është krijuar ende asnjë fushatë email-i."),"Nuk është krijuar ende asnjë fushatë email-i.")}</p>
            <button
              className="admin-btn"
              onClick={() => setShowCreateForm(true)}
            >{tr(tr("Create Your First Campaign","Krijo fushatën e parë"),"Krijo fushatën e parë")}</button>
          </div>
        )}
      </div>

      {/* Campaign View Modal */}
      {showViewModal && selectedCampaign && (
        <div
          className="admin-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <div
            className="admin-modal admin-email-modal"
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              width: "90vw",
            }}
          >
            <div className="admin-modal-header">
              <h3
                style={{
                  margin: 0,
                  color: "#1f2937",
                  fontSize: "1.25rem",
                  fontWeight: "600",
                }}
              >{tr(tr("Campaign Details","Detajet e fushatës"),"Detajet e fushatës")}</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCampaign(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "4px",
                  borderRadius: "4px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#f3f4f6")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "transparent")
                }
              >
                X
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong
                style={{
                  color: "#374151",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >{tr(tr("Subject:","Subjekti:"),"Subjekti:")}</strong>
              <p
                style={{
                  margin: "4px 0",
                  color: "#1f2937",
                  fontSize: "1rem",
                  fontWeight: "500",
                }}
              >
                {selectedCampaign.subject}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong
                style={{
                  color: "#374151",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >{tr(tr("Target Audience:","Marrësit:"),"Marrësit:")}</strong>
              <span
                style={{
                  background: "#e9ecef",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                  marginLeft: "8px",
                  fontWeight: "500",
                }}
              >
                {selectedCampaign.target_audience}
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong
                style={{
                  color: "#374151",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >{tr(tr("Status:","Statusi:"),"Statusi:")}</strong>
              <span
                style={{
                  background:
                    selectedCampaign.status === "sent"
                      ? "#d1ecf1"
                      : selectedCampaign.status === "draft"
                        ? "#fff3cd"
                        : selectedCampaign.status === "scheduled"
                          ? "#d4edda"
                          : "#f8d7da",
                  color:
                    selectedCampaign.status === "sent"
                      ? "#0c5460"
                      : selectedCampaign.status === "draft"
                        ? "#856404"
                        : selectedCampaign.status === "scheduled"
                          ? "#155724"
                          : "#721c24",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                  marginLeft: "8px",
                  fontWeight: "500",
                }}
              >
                {selectedCampaign.status}
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong
                style={{
                  color: "#374151",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >{tr(tr("Recipients:","Marrësit:"),"Marrësit:")}</strong>
              <span
                style={{
                  background: "#d1ecf1",
                  color: "#0c5460",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                  marginLeft: "8px",
                  fontWeight: "500",
                }}
              >
                {selectedCampaign.recipient_count} users
              </span>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <strong
                style={{
                  color: "#374151",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >{tr(tr("Content:","Përmbajtja:"),"Përmbajtja:")}</strong>
              <div
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  padding: "16px",
                  marginTop: "8px",
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {selectedCampaign.content}
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCampaign(null);
                }}
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#4b5563")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "#6b7280")
                }
              >{tr(tr("Close","Mbyll"),"Mbyll")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmail;
