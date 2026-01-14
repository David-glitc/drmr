/**
 * Theme Configuration
 * Central place to manage all theme colors and design tokens
 * Edit this file to change the app's color scheme
 */

export const themeConfig = {
    // Primary background color - Cobalt Blue
    colors: {
        // Main background colors
        bgPrimary: "#0047AB", // Cobalt Blue
        bgSecondary: "#003d94", // Darker cobalt
        bgTertiary: "#00337a", // Even darker cobalt
        bgCard: "rgba(0, 61, 148, 0.95)", // Cobalt with transparency
        bgCardHover: "rgba(0, 51, 122, 0.95)",
        bgSidebar: "rgba(0, 55, 130, 0.98)",
        bgOverlay: "rgba(0, 47, 120, 0.8)",

        // Text Colors
        textPrimary: "#ffffff",
        textSecondary: "#e2e8f0",
        textTertiary: "#94a3b8",
        textMuted: "#64748b",

        // Accent Colors - Red, White, Blue (American theme)
        accentRed: "#ef4444",
        accentRedHover: "#dc2626",
        accentRedLight: "rgba(239, 68, 68, 0.1)",
        accentBlue: "#3b82f6",
        accentBlueHover: "#2563eb",
        accentBlueLight: "rgba(59, 130, 246, 0.1)",
        accentWhite: "#ffffff",

        // Button Colors
        btnPrimary: "#ef4444",
        btnPrimaryHover: "#dc2626",
        btnSecondary: "rgba(255, 255, 255, 0.1)",
        btnSecondaryHover: "rgba(255, 255, 255, 0.15)",

        // Border Colors
        borderPrimary: "rgba(255, 255, 255, 0.15)",
        borderSecondary: "rgba(255, 255, 255, 0.08)",
        borderAccentRed: "rgba(239, 68, 68, 0.3)",
        borderAccentBlue: "rgba(59, 130, 246, 0.3)",
    },

    // Social Links
    socialLinks: {
        twitter: "https://x.com/drmr1776",
        telegram: "https://t.me/american_dream_coin",
    },
} as const;

// Export individual values for convenience
export const { colors, socialLinks } = themeConfig;
