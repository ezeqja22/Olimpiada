import React, { createContext, useCallback, useContext, useState } from "react";
import "./Confirm.css";

const ConfirmContext = createContext(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used inside ConfirmProvider");
  }

  return context;
}

function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || "Are you sure?",
        message: options.message || "This action cannot be undone.",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "danger",
        resolve,
      });
    });
  }, []);

  const closeDialog = (result) => {
    if (dialog?.resolve) {
      dialog.resolve(result);
    }

    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {dialog && (
        <div className="confirm-overlay" onClick={() => closeDialog(false)}>
          <div
            className="confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`confirm-icon confirm-${dialog.variant}`}>!</div>

            <div className="confirm-content">
              <h3>{dialog.title}</h3>
              <p>{dialog.message}</p>
            </div>

            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-cancel"
                onClick={() => closeDialog(false)}
              >
                {dialog.cancelText}
              </button>

              <button
                type="button"
                className={`confirm-button confirm-button-${dialog.variant}`}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
