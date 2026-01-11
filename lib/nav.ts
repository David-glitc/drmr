export const navItems = [
  { key: "portfolio", label: "Portfolio", href: "/portfolio", icon: "chart" },
  { key: "staking", label: "Staking", href: "/staking", icon: "diamond" },
  { key: "tokens", label: "Tokens", href: "/tokens", icon: "coin" },
  { key: "transactions", label: "Activity", href: "/transactions", icon: "history" },
] as const;

// Unified Admin nav item - combines staking admin and platform admin
// Shown when user has admin access (via password or admin wallet)
export const adminNavItem = {
  key: "admin",
  label: "Admin",
  href: "/staking-admin",
  icon: "gear",
} as const;

export const settingsNav = {
  key: "settings",
  label: "Settings",
  href: "/settings",
  icon: "gear",
} as const;

