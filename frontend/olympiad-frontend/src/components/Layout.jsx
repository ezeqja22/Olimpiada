import React, { useState, useEffect } from "react";
import Header from "./Header";
import { colors, spacing } from "../designSystem";

function Layout({ children, showHomeButton = false, maxWidth = "1200px", background = colors.gray[50], isFullWidth = false }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div style={{
            minHeight: "100vh",
            background: background,
            display: "flex",
            flexDirection: "column"
        }}>
            <Header showHomeButton={showHomeButton} />
            <main style={{
                flex: 1,
                padding: isFullWidth ? "0" : (isMobile ? "4px" : spacing.xl),
                maxWidth: isFullWidth ? "none" : maxWidth,
                margin: isFullWidth ? "0" : "0 auto",
                width: "100%",
                boxSizing: "border-box",
                display: isFullWidth ? "flex" : "block",
                flexDirection: isFullWidth ? "column" : "initial"
            }}>
                {children}
            </main>
        </div>
    );
}

export default Layout;
