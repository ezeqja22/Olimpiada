import React, { useState, useEffect } from "react";
import Header from "./Header";
import { colors, spacing } from "../designSystem";

function Layout({ children, showHomeButton = false, maxWidth = "1200px" }) {
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
            backgroundColor: colors.gray[50],
            display: "flex",
            flexDirection: "column"
        }}>
            <Header showHomeButton={showHomeButton} />
            <main style={{
                flex: 1,
                padding: isMobile ? "4px" : spacing.xl,
                maxWidth: maxWidth,
                margin: "0 auto",
                width: "100%",
                boxSizing: "border-box"
            }}>
                {children}
            </main>
        </div>
    );
}

export default Layout;
