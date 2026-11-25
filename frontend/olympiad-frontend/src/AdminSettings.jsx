import {useLanguage} from "./context/LanguageContext";
import {PublishingHeader} from "./components/PublishingWorkspace";
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./components/ToastProvider";
import { useConfirm } from "./components/ConfirmProvider";

const AdminSettings = () => {
  const {lang} = useLanguage();
  const tr = (en,sq) => lang === 'en' ? en : sq;
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("site");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Settings categories
  const categories = {
    site: { name: tr("Site Settings","Cilësimet e faqes"), searchName: "Site Settings", icon: "🌐", color: "#3b82f6" },
    email: { name: tr("Email Settings","Cilësimet e email-it"), searchName: "Email Settings", icon: "", color: "#10b981" },
    security: { name: tr("Security","Siguria"), searchName: "Security", icon: "", color: "#ef4444" },
    content: { name: tr("Content","Përmbajtja"), searchName: "Content", icon: "", color: "#8b5cf6" },
    forum: { name: tr("Forums","Forumet"), searchName: "Forums", icon: "", color: "#f59e0b" },
    notification: { name: tr("Notifications","Njoftimet"), searchName: "Notifications", icon: "", color: "#06b6d4" },
    analytics: { name: tr("Analytics","Analitika"), searchName: "Analytics", icon: "📊", color: "#84cc16" },
    maintenance: { name: tr("Maintenance","Mirëmbajtja"), searchName: "Maintenance", icon: "🔧", color: "#6b7280" },
    feature: { name: tr("Features","Funksionalitetet"), searchName: "Features", icon: "", color: "#ec4899" },
    privacy: { name: tr("Privacy","Privatësia"), searchName: "Privacy", icon: "🛡️", color: "#14b8a6" },
    integration: { name: tr("Integrations","Integrimet"), searchName: "Integrations", icon: "🔗", color: "#f97316" },
    advanced: { name: tr("Advanced","Të avancuara"), searchName: "Advanced", icon: "⚡", color: "#6366f1" },
  };

  // Settings definitions with types and validation
  const settingsConfig = {
    site: {
      site_name: { type: "text", label: tr("Site Name","Emri i faqes"), searchLabel: "Site Name", required: true },
      site_description: {
        type: "textarea",
        label: tr("Site Description","Përshkrimi i faqes"), searchLabel: "Site Description",
        rows: 3,
      },
      site_logo: { type: "url", label: tr("Site Logo URL","Lidhja e logos"), searchLabel: "Site Logo URL" },
      site_favicon: { type: "url", label: tr("Favicon URL","Lidhja e ikonës së faqes"), searchLabel: "Favicon URL" },
      site_theme: {
        type: "select",
        label: tr("Theme","Tema"), searchLabel: "Theme",
        options: ["light", "dark", "auto"],
      },
      site_language: {
        type: "select",
        label: tr("Language","Gjuha"), searchLabel: "Language",
        options: ["en", "es", "fr", "de"],
      },
    },
    email: {
      smtp_server: { type: "text", label: tr("SMTP Server","Serveri SMTP"), searchLabel: "SMTP Server", required: true },
      smtp_port: { type: "number", label: tr("SMTP Port","Porta SMTP"), searchLabel: "SMTP Port", min: 1, max: 65535 },
      smtp_username: { type: "text", label: tr("SMTP Username","Përdoruesi SMTP"), searchLabel: "SMTP Username" },
      smtp_password: { type: "password", label: tr("SMTP Password","Fjalëkalimi SMTP"), searchLabel: "SMTP Password" },
      smtp_use_tls: { type: "boolean", label: tr("Use TLS","Përdor TLS"), searchLabel: "Use TLS" },
      email_from_name: { type: "text", label: tr("From Name","Emri i dërguesit"), searchLabel: "From Name" },
      email_from_address: { type: "email", label: tr("From Address","Adresa e dërguesit"), searchLabel: "From Address" },
    },
    security: {
      password_min_length: {
        type: "number",
        label: tr("Min Password Length","Gjatësia minimale e fjalëkalimit"), searchLabel: "Min Password Length",
        min: 6,
        max: 50,
      },
      password_require_special: {
        type: "boolean",
        label: tr("Require Special Characters","Kërko karaktere të veçanta"), searchLabel: "Require Special Characters",
      },
      session_timeout_hours: {
        type: "number",
        label: tr("Session Timeout (hours)","Afati i sesionit (orë)"), searchLabel: "Session Timeout (hours)",
        min: 1,
        max: 168,
      },
      max_login_attempts: {
        type: "number",
        label: tr("Max Login Attempts","Numri maksimal i tentativave të hyrjes"), searchLabel: "Max Login Attempts",
        min: 3,
        max: 20,
      },
      lockout_duration_minutes: {
        type: "number",
        label: tr("Lockout Duration (minutes)","Kohëzgjatja e bllokimit (minuta)"), searchLabel: "Lockout Duration (minutes)",
        min: 5,
        max: 1440,
      },
    },
    content: {
      max_problem_length: {
        type: "number",
        label: tr("Max Problem Length","Gjatësia maksimale e problemës"), searchLabel: "Max Problem Length",
        min: 100,
        max: 50000,
      },
      max_comment_length: {
        type: "number",
        label: tr("Max Comment Length","Gjatësia maksimale e komentit"), searchLabel: "Max Comment Length",
        min: 10,
        max: 5000,
      },
      max_forum_description_length: {
        type: "number",
        label: tr("Max Forum Description Length","Gjatësia maksimale e përshkrimit të forumit"), searchLabel: "Max Forum Description Length",
        min: 50,
        max: 10000,
      },
      auto_moderate_content: {
        type: "boolean",
        label: tr("Auto Moderate Content","Modero automatikisht përmbajtjen"), searchLabel: "Auto Moderate Content",
      },
      require_approval_for_problems: {
        type: "boolean",
        label: tr("Require Approval for Problems","Kërko miratim për problemat"), searchLabel: "Require Approval for Problems",
      },
    },
    forum: {
      max_members_per_forum: {
        type: "number",
        label: tr("Max Members per Forum","Numri maksimal i anëtarëve në forum"), searchLabel: "Max Members per Forum",
        min: 10,
        max: 1000,
      },
      forum_creation_requires_approval: {
        type: "boolean",
        label: tr("Forum Creation Requires Approval","Krijimi i forumit kërkon miratim"), searchLabel: "Forum Creation Requires Approval",
      },
      default_forum_visibility: {
        type: "select",
        label: tr("Default Forum Visibility","Dukshmëria e parazgjedhur e forumit"), searchLabel: "Default Forum Visibility",
        options: ["public", "private", "invite_only"],
      },
    },
    notification: {
      email_notifications_enabled: {
        type: "boolean",
        label: tr("Email Notifications","Njoftimet me email"), searchLabel: "Email Notifications",
      },
      in_app_notifications_enabled: {
        type: "boolean",
        label: tr("In-App Notifications","Njoftimet në platformë"), searchLabel: "In-App Notifications",
      },
      notification_retention_days: {
        type: "number",
        label: tr("Notification Retention (days)","Ruajtja e njoftimeve (ditë)"), searchLabel: "Notification Retention (days)",
        min: 7,
        max: 365,
      },
    },
    analytics: {
      analytics_enabled: { type: "boolean", label: tr("Analytics Enabled","Analitika aktive"), searchLabel: "Analytics Enabled" },
      track_user_activity: { type: "boolean", label: tr("Track User Activity","Gjurmo aktivitetin e përdoruesve"), searchLabel: "Track User Activity" },
      data_retention_days: {
        type: "number",
        label: tr("Data Retention (days)","Ruajtja e të dhënave (ditë)"), searchLabel: "Data Retention (days)",
        min: 30,
        max: 1095,
      },
      export_data_enabled: { type: "boolean", label: tr("Allow Data Export","Lejo eksportin e të dhënave"), searchLabel: "Allow Data Export" },
    },
    maintenance: {
      maintenance_mode: { type: "boolean", label: tr("Maintenance Mode","Modaliteti i mirëmbajtjes"), searchLabel: "Maintenance Mode" },
      maintenance_message: {
        type: "textarea",
        label: tr("Maintenance Message","Mesazhi i mirëmbajtjes"), searchLabel: "Maintenance Message",
        rows: 3,
      },
      backup_frequency_hours: {
        type: "number",
        label: tr("Backup Frequency (hours)","Frekuenca e kopjeve rezervë (orë)"), searchLabel: "Backup Frequency (hours)",
        min: 1,
        max: 168,
      },
      auto_cleanup_enabled: { type: "boolean", label: tr("Auto Cleanup Enabled","Pastrimi automatik aktiv"), searchLabel: "Auto Cleanup Enabled" },
    },
    feature: {
      forums_enabled: { type: "boolean", label: tr("Forums Enabled","Forumet aktive"), searchLabel: "Forums Enabled" },
      comments_enabled: { type: "boolean", label: tr("Comments Enabled","Komentet aktive"), searchLabel: "Comments Enabled" },
      voting_enabled: { type: "boolean", label: tr("Voting Enabled","Votimi aktiv"), searchLabel: "Voting Enabled" },
      bookmarks_enabled: { type: "boolean", label: tr("Bookmarks Enabled","Faqeshënuesit aktivë"), searchLabel: "Bookmarks Enabled" },
      following_enabled: { type: "boolean", label: tr("Following Enabled","Ndjekja aktive"), searchLabel: "Following Enabled" },
      notifications_enabled: {
        type: "boolean",
        label: tr("Notifications Enabled","Njoftimet aktive"), searchLabel: "Notifications Enabled",
      },
      reports_enabled: { type: "boolean", label: tr("Reports Enabled","Raportimet aktive"), searchLabel: "Reports Enabled" },
    },
    privacy: {
      profile_visibility: {
        type: "select",
        label: tr("Profile Visibility","Dukshmëria e profilit"), searchLabel: "Profile Visibility",
        options: ["public", "private", "friends_only"],
      },
      show_online_status: {
        type: "boolean",
        label: tr("Show Online Status","Shfaq statusin online"), searchLabel: "Show Online Status",
        disabled: true,
      },
      allow_data_export: {
        type: "boolean",
        label: tr("Allow Data Export","Lejo eksportin e të dhënave"), searchLabel: "Allow Data Export",
        disabled: true,
      },
      gdpr_compliance: {
        type: "boolean",
        label: tr("GDPR Compliance","Pajtueshmëria me GDPR"), searchLabel: "GDPR Compliance",
        disabled: true,
      },
    },
    integration: {
      google_analytics_id: { type: "text", label: tr("Google Analytics ID","ID e Google Analytics"), searchLabel: "Google Analytics ID" },
      facebook_app_id: { type: "text", label: tr("Facebook App ID","ID e aplikacionit Facebook"), searchLabel: "Facebook App ID" },
      twitter_handle: { type: "text", label: tr("Twitter Handle","Emri në Twitter"), searchLabel: "Twitter Handle" },
      discord_webhook: { type: "url", label: tr("Discord Webhook URL","Lidhja e webhook-ut Discord"), searchLabel: "Discord Webhook URL" },
    },
    advanced: {
      cache_enabled: { type: "boolean", label: tr("Cache Enabled","Memoria e përkohshme aktive"), searchLabel: "Cache Enabled" },
      cache_ttl_minutes: {
        type: "number",
        label: tr("Cache TTL (minutes)","Afati i memories së përkohshme (minuta)"), searchLabel: "Cache TTL (minutes)",
        min: 1,
        max: 1440,
      },
      cdn_enabled: { type: "boolean", label: tr("CDN Enabled","CDN aktive"), searchLabel: "CDN Enabled" },
      cdn_url: { type: "url", label: tr("CDN URL","Lidhja CDN"), searchLabel: "CDN URL" },
      ssl_required: { type: "boolean", label: tr("SSL Required","SSL i detyrueshëm"), searchLabel: "SSL Required" },
      cors_origins: { type: "textarea", label: tr("CORS Origins","Origjinat CORS"), searchLabel: "CORS Origins", rows: 2 },
    },
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/get-settings`,
        getAuthHeaders(),
      );

      // Parse the nested settings structure
      const parsedSettings = {};
      Object.keys(response.data).forEach((category) => {
        if (response.data[category]) {
          parsedSettings[category] = {};
          Object.keys(response.data[category]).forEach((key) => {
            const settingData = response.data[category][key];
            parsedSettings[category][key] = {
              value: settingData.value || "",
              updated_at: settingData.updated_at,
              updated_by: settingData.updated_by,
            };
          });
        }
      });

      setSettings(parsedSettings);
    } catch (err) {
      console.error("Error fetching settings:", err);
      showToast(tr("Failed to load settings: ","Cilësimet nuk u ngarkuan: ") + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: {
          ...prev[category]?.[key],
          value: value,
        },
      },
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      // Flatten settings for API
      const settingsToSave = {};
      Object.keys(settings).forEach((category) => {
        if (settings[category]) {
          Object.keys(settings[category]).forEach((key) => {
            if (settings[category][key]?.value !== undefined) {
              // For password fields, only save if user has entered a new password
              if (key === "smtp_password") {
                const passwordValue = settings[category][key].value;
                // Only save if it's not "ENCRYPTED" and not empty
                if (
                  passwordValue !== "ENCRYPTED" &&
                  passwordValue.trim() !== ""
                ) {
                  settingsToSave[key] = passwordValue;
                }
              } else {
                settingsToSave[key] = settings[category][key].value;
              }
            }
          });
        }
      });

      const saveResponse = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/save-settings`,
        {
          settings: settingsToSave,
        },
        getAuthHeaders(),
      );

      showToast(tr("Settings saved successfully!","Cilësimet u ruajtën me sukses!"), "success");
    } catch (err) {
      console.error("Error saving settings:", err);
      showToast(tr("Failed to save settings","Cilësimet nuk u ruajtën"), "error");
    } finally {
      setSaving(false);
    }
  };

  const initializeSettings = async () => {
    const confirmed = await confirm({
      title: tr("Initialize default settings?","Inicializo cilësimet e parazgjedhura?"),
      message:
        tr("This will initialize all settings to their default values. This action cannot be undone.","Të gjitha cilësimet do të inicializohen me vlerat e parazgjedhura. Ky veprim nuk mund të zhbëhet."),
      confirmText: tr("Initialize","Inicializo"),
      cancelText: tr("Cancel","Anulo"),
      variant: "success",
    });
    if (confirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/settings/initialize`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        showToast(tr("Default settings initialized!","Cilësimet e parazgjedhura u inicializuan!"), "success");
        fetchSettings();
      } catch (err) {
        console.error("Error initializing settings:", err);
        showToast(tr("Failed to initialize settings","Inicializimi dështoi"), "error");
      }
    }
  };

  const resetSettings = async () => {
    const confirmed = await confirm({
      title: tr("Reset settings?","Rivendos cilësimet?"),
      message:
        tr("This will reset ALL settings to defaults. This cannot be undone. Continue?","TË GJITHA cilësimet do të rivendosen. Ky veprim nuk mund të zhbëhet. Të vazhdohet?"),
      confirmText: tr("Reset settings","Rivendos cilësimet"),
      cancelText: tr("Cancel","Anulo"),
      variant: "success",
    });
    if (confirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/settings/reset`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        showToast(tr("Settings reset to defaults!","Cilësimet u rivendosën!"), "success");
        fetchSettings();
      } catch (err) {
        console.error("Error resetting settings:", err);
        showToast(tr("Failed to reset settings","Rivendosja dështoi"), "error");
      }
    }
  };

  const exportSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/test-settings`,
        getAuthHeaders(),
      );

      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `settings-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting settings:", err);
      showToast(tr("Failed to export settings","Eksporti dështoi"), "error");
    }
  };

  const testSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      // Testing settings

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/get-settings`,
        getAuthHeaders(),
      );

      // Test completed

      // Check if response has the expected structure
      if (!response.data || !response.data.results) {
        throw new Error("Invalid response structure from server");
      }

      const results = response.data.results;
      const message = `
🧪 Settings Test Results:

 Settings Loaded: ${results.settings_loaded ? "Yes" : "No"}
 Site Name: ${results.site_name || "Not Set"}
🔧 Maintenance Mode: ${results.maintenance_mode ? "ON" : "OFF"}
 Forums Enabled: ${results.forums_enabled ? "Yes" : "No"}
👥 Registration Enabled: ${results.registration_enabled ? "Yes" : "No"}

 EMAIL SETTINGS:
🌐 SMTP Server: ${results.smtp_server || "Not Set"}
🔌 SMTP Port: ${results.smtp_port || "Not Set"}
👤 SMTP Username: ${results.smtp_username || "Not Set"}
 SMTP Password: ${results.smtp_password || "Not Set"}
🔐 Use TLS: ${results.smtp_use_tls ? "Yes" : "No"}
 From Name: ${results.email_from_name || "Not Set"}
 From Address: ${results.email_from_address || "Not Set"}

📈 Total Settings: ${results.total_settings || 0}

All settings are working correctly! 🎉
              `;

      showToast(message, "success");
    } catch (err) {
      console.error("Error testing settings:", err);
      console.error("Error details:", err.response?.data);
      console.error("Full response:", err.response);

      let errorMessage = tr("Failed to test settings","Testimi i cilësimeve dështoi");
      if (err.response?.data?.detail) {
        errorMessage += `: ${err.response.data.detail}`;
      } else if (err.message) {
        errorMessage += `: ${err.message}`;
      }

      showToast(errorMessage, "error");
    }
  };

  const renderSettingField = (category, key, config) => {
    const setting = settings[category]?.[key];
    const value = setting?.value || "";

    // Rendering field

    switch (config.type) {
      case "boolean":
        // Check if this is a non-implemented feature or explicitly disabled
        const nonImplementedFeatures = [
          "auto_moderate_content",
          "require_approval_for_problems",
          "forum_creation_requires_approval",
        ];
        const isDisabled =
          nonImplementedFeatures.includes(key) || config.disabled;

        return (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? "not-allowed" : "default",
            }}
          >
            <input aria-label={config.label}
              type="checkbox"
              checked={value === "true"}
              onChange={(e) =>
                !isDisabled &&
                handleSettingChange(category, key, e.target.checked.toString())
              }
              disabled={isDisabled}
              style={{
                transform: "scale(1.2)",
                cursor: isDisabled ? "not-allowed" : "default",
              }}
            />
            <span
              style={{
                color: isDisabled ? "#999" : "inherit",
                fontStyle: isDisabled ? "italic" : "normal",
              }}
            >
              {config.label}
              {isDisabled && (
                <span
                  style={{ color: "#666", fontSize: "12px", marginLeft: "8px" }}
                >
                  (Not implemented yet)
                </span>
              )}
            </span>
          </label>
        );

      case "select":
        // Check if this is a non-implemented feature or explicitly disabled
        const nonImplementedSelectFeatures = [];
        const isSelectDisabled =
          nonImplementedSelectFeatures.includes(key) || config.disabled;

        return (
          <select aria-label={config.label}
            value={value}
            onChange={(e) =>
              !isSelectDisabled &&
              handleSettingChange(category, key, e.target.value)
            }
            disabled={isSelectDisabled}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              opacity: isSelectDisabled ? 0.5 : 1,
              cursor: isSelectDisabled ? "not-allowed" : "default",
            }}
          >
            {config.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea aria-label={config.label}
            value={value}
            onChange={(e) => handleSettingChange(category, key, e.target.value)}
            rows={config.rows || 3}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "vertical",
            }}
          />
        );

      case "number":
        return (
          <input aria-label={config.label}
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(category, key, e.target.value)}
            min={config.min}
            max={config.max}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        );

      case "password":
        return (
          <div>
            <input aria-label={config.label}
              type="password"
              value={value && value !== "ENCRYPTED" ? value : ""}
              onChange={(e) =>
                handleSettingChange(category, key, e.target.value)
              }
              placeholder={
                value && value !== "ENCRYPTED" ? "••••••••" : "Enter password"
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
            {value === "ENCRYPTED" && (
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
              >{tr("Password is encrypted. Enter a new password to change it.","Fjalëkalimi është i enkriptuar. Shkruaj një fjalëkalim të ri për ta ndryshuar.")}</div>
            )}
          </div>
        );

      default:
        // Check if this is a non-implemented feature
        const nonImplementedNumberFeatures = [];
        const isNumberDisabled = nonImplementedNumberFeatures.includes(key);

        return (
          <input aria-label={config.label}
            type={config.type}
            value={value || ""}
            onChange={(e) =>
              !isNumberDisabled &&
              handleSettingChange(category, key, e.target.value)
            }
            placeholder={config.placeholder}
            disabled={isNumberDisabled}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              opacity: isNumberDisabled ? 0.5 : 1,
              cursor: isNumberDisabled ? "not-allowed" : "default",
            }}
          />
        );
    }
  };

  const filteredCategories = Object.keys(categories).filter((category) => {
    if (!showAdvanced && category === "advanced") return false;
    if (searchTerm) {
      const categoryName = (categories[category].name + " " + categories[category].searchName).toLowerCase();
      const hasMatchingSettings = Object.keys(
        settingsConfig[category] || {},
      ).some((key) => {
        const settingName = (settingsConfig[category][key].label + " " + settingsConfig[category][key].searchLabel + " " + key).toLowerCase();
        return settingName.includes(searchTerm.toLowerCase());
      });
      return (
        categoryName.includes(searchTerm.toLowerCase()) || hasMatchingSettings
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", marginBottom: "16px" }}></div>
          <div>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="publishing-workspace admin-settings-page">
      <PublishingHeader eyebrow={tr("Website / Configuration","Faqja / Konfigurimi")} title={tr("System settings","Cilësimet e sistemit")} description={tr("Manage platform behavior. Review changes before saving; maintenance actions are separate below.","Menaxho funksionimin e platformës. Kontrollo ndryshimet para ruajtjes; veprimet e mirëmbajtjes janë më poshtë.")} />
      <div className="publishing-actions settings-primary-actions"><button className="p1-btn" onClick={saveSettings} disabled={saving}>{saving?tr("Saving…","Duke ruajtur…"):tr("Save all changes","Ruaj të gjitha ndryshimet")}</button><button className="p1-btn alt" onClick={fetchSettings}>{tr("Refresh","Rifresko")}</button><button className="p1-btn alt" onClick={exportSettings}>{tr("Export","Eksporto")}</button></div>
      <details className="publishing-maintenance"><summary>{tr("Maintenance actions","Veprimet e mirëmbajtjes")}</summary><p>{tr("These actions affect system configuration. Review the confirmation before proceeding.","Këto veprime ndikojnë konfigurimin e sistemit. Kontrollo konfirmimin para se të vazhdosh.")}</p><div className="publishing-actions"><button className="p1-btn alt" onClick={testSettings}>{tr("Test settings","Testo cilësimet")}</button><button className="p1-btn alt" onClick={initializeSettings}>{tr("Initialize","Inicializo")}</button><button className="p1-btn alt" onClick={resetSettings}>{tr("Reset","Rivendos")}</button></div></details>
      <div className="publishing-settings-columns"><aside className="publishing-section"><label>{tr("Search settings","Kërko cilësimet")}<input type="search" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={tr("Setting name…","Emri i cilësimit…")}/></label><label className="help-checkbox"><input type="checkbox" checked={showAdvanced} onChange={e=>setShowAdvanced(e.target.checked)}/>{tr("Show advanced settings","Shfaq cilësimet e avancuara")}</label><nav className="publishing-queue" aria-label={tr("Settings categories","Kategoritë e cilësimeve")}>{filteredCategories.map(category=><button key={category} aria-pressed={activeTab===category} onClick={()=>setActiveTab(category)}>{categories[category].name}<span aria-hidden="true">→</span></button>)}</nav></aside><div>
      {/* Settings Content */}
      <div className="admin-card">
        <h2
          style={{
            margin: "0 0 24px 0",
            fontSize: "20px",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {categories[activeTab].icon} {categories[activeTab].name}
        </h2>

        <div className="publishing-settings-fields">
          {settingsConfig[activeTab] && Object.keys(settingsConfig[activeTab]).filter(key=>!searchTerm||(settingsConfig[activeTab][key].label + " " + settingsConfig[activeTab][key].searchLabel).toLowerCase().includes(searchTerm.toLowerCase())||key.toLowerCase().includes(searchTerm.toLowerCase())).map(key=>{
            const config=settingsConfig[activeTab][key],setting=settings[activeTab]?.[key];
            return <fieldset className="publishing-setting" key={key}><legend>{config.label}{config.required?' *':''}{config.disabled?tr(" (Coming soon)"," (Së shpejti)"):""}</legend>{renderSettingField(activeTab,key,config)}{setting?.description&&<p>{setting.description}</p>}{setting?.updated_at&&<small>{tr("Last updated:","Përditësuar më:")} {new Date(setting.updated_at).toLocaleString(lang==="en"?"en-GB":"sq-AL")}{setting.updated_by&&tr(` by ${setting.updated_by}`, ` nga ${setting.updated_by}`)}</small>}</fieldset>;
          })}
          {/* Show message if no settings for this tab */}
          {(!settingsConfig[activeTab] ||
            Object.keys(settingsConfig[activeTab]).length === 0) && (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#6b7280",
                background: "#f9fafb",
                borderRadius: "12px",
                border: "2px dashed #d1d5db",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}></div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "500",
                  marginBottom: "8px",
                }}
              >{tr("No settings available for this category","Nuk ka cilësime për këtë kategori")}</div>
              <div style={{ fontSize: "14px" }}>{tr("Settings will appear here once they are initialized","Cilësimet do të shfaqen pas inicializimit")}</div>
            </div>
          )}
        </div>
      </div>
      </div></div>
    </div>
  );
};

export default AdminSettings;
