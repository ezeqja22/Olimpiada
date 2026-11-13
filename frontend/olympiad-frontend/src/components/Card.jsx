import React from "react";
import { colors, spacing, borderRadius, shadows } from "../designSystem";

function Card({
    children,
    padding = "lg",
    style = {},
    hover = false,
    className = "",
    ...props
}) {
    const getPadding = () => {
        switch (padding) {
            case "sm": return spacing.md;
            case "md": return spacing.lg;
            case "lg": return spacing.xl;
            case "xl": return spacing.xxl;
            default: return spacing.lg;
        }
    };

    const cardStyles = {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.md,
        padding: getPadding(),
        transition: "all 0.2s ease",
        ...style
    };

    return (
        <div
            className={`ol-card ${hover ? "card-hover" : ""} ${className}`}
            style={cardStyles}
            {...props}
        >
            {children}
        </div>
    );
}

export default Card;
