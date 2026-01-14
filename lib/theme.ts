// Theme configuration for DRMR Dashboard
// Easily editable color variables for the entire application

export const theme = {
    // Primary background color - Dark Cobalt Blue
    colors: {
        // Main background - Dark Cobalt Blue #002D72
        bgPrimary: "#002D72",
        bgSecondary: "#001f4d",
        bgTertiary: "#001533",
        bgCard: "rgba(0, 45, 114, 0.95)",
        bgCardHover: "rgba(0, 31, 77, 0.95)",
        bgSidebar: "rgba(0, 25, 60, 0.98)",
        bgNavbar: "rgba(0, 45, 114, 0.95)",

        // Text colors
        textPrimary: "#ffffff",
        textSecondary: "#e2e8f0",
        textTertiary: "#94a3b8",
        textMuted: "#64748b",

        // Accent colors - Red and Blue (American theme)
        accentRed: "#ef4444",
        accentRedHover: "#dc2626",
        accentRedLight: "rgba(239, 68, 68, 0.1)",
        accentBlue: "#3b82f6",
        accentBlueHover: "#2563eb",
        accentBlueLight: "rgba(59, 130, 246, 0.1)",

        // Button colors
        btnPrimary: "#ef4444",
        btnPrimaryHover: "#dc2626",
        btnSecondary: "rgba(255, 255, 255, 0.1)",
        btnSecondaryHover: "rgba(255, 255, 255, 0.15)",

        // Border colors
        borderPrimary: "rgba(255, 255, 255, 0.15)",
        borderSecondary: "rgba(255, 255, 255, 0.08)",
        borderAccentRed: "rgba(239, 68, 68, 0.3)",
        borderAccentBlue: "rgba(59, 130, 246, 0.3)",
    },

    // Social links
    social: {
        twitter: "https://x.com/drmr1776",
        telegram: "https://t.me/american_dream_coin",
    },
} as const;

// CSS variable names for use in stylesheets
export const cssVars = {
    bgPrimary: "var(--bg-primary)",
    bgSecondary: "var(--bg-secondary)",
    bgTertiary: "var(--bg-tertiary)",
    bgCard: "var(--bg-card)",
    bgCardHover: "var(--bg-card-hover)",
    bgSidebar: "var(--bg-sidebar)",
    bgNavbar: "var(--bg-navbar)",
} as const;

export type Theme = typeof theme;
