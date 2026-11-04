import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "../components/ToastProvider";

export const useFeatureSettings = () => {
  const [featureSettings, setFeatureSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchFeatureSettings();
  }, []);

  const fetchFeatureSettings = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/site-info`,
      );
      setFeatureSettings(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const checkFeatureEnabled = (feature) => {
    // If still loading, default to enabled to avoid blocking features
    if (loading) {
      return true;
    }

    const isEnabled = featureSettings[feature] !== false;
    return isEnabled;
  };

  const showFeatureDisabledAlert = (featureName) => {
    showToast(
      `${featureName} have been temporarily disabled, please try again later.`,
      "error",
    );
  };

  return {
    featureSettings,
    loading,
    error,
    checkFeatureEnabled,
    showFeatureDisabledAlert,
  };
};
