export const navItems = [
  { key: "portfolio", label: "Portfolio", href: "/portfolio", icon: "chart" },
  { key: "staking", label: "Staking", href: "/staking", icon: "diamond" },
  { key: "tokens", label: "Tokens", href: "/tokens", icon: "coin" },
] as const;

// Admin nav item (only shown when authenticated)
export const adminNavItem = {
  key: "admin",
  label: "Admin",
  href: "/admin",
  icon: "gear",
} as const;

export const settingsNav = {
  key: "settings",
  label: "Settings",
  href: "/settings",
  icon: "gear",
} as const;

